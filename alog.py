import concurrent.futures
import hashlib

import click
from pathlib import Path

import humanize
import itertools

from matplotlib import pyplot as plt
from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict

from alog.graph import display_rectangles_and_stars as display_rectangles
from utils import is_hidden
from astropy.io import fits

from erewhon_astro import PlateSolve, Solution


class FileDescription(BaseModel):
    pathname: str
    hash: str
    instrument: str = ''
    total_exposure_time: float = 0.0
    ra: float = 0.0
    dec: float = 0.0
    # gain: float = 0.0
    # target: str = ''
    stackcnt: int = 0
    exposure_time: float = 0.0
    axis1: float = 0.0
    axis2: float = 0.0
    solution: Solution | None = None


class Manifest(BaseModel):
    files: list[FileDescription] = []


class Settings(BaseSettings):
    """Settings for app"""
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    local_solve: bool = False
    astrometry_index_dir: str | None = None


def get_file_description(dir: Path, pathname: Path) -> FileDescription:
    with open(pathname, 'rb') as f:
        # Calculate the SHA256 hash of the file
        sha256_hash = hashlib.sha256(f.read()).hexdigest()
    with fits.open(pathname) as hdul:
        exposure_time = hdul[0].header.get('EXPTIME', 0)
        instrument = hdul[0].header.get('INSTRUME', '')
        stackcnt = hdul[0].header.get('STACKCNT', 0)
        ra = hdul[0].header.get('RA', 0)
        dec = hdul[0].header.get('DEC', 0)
        # gain = hdul[0].header.get('GAIN', 0)
        # target = hdul[0].header.get('OBJECT', '')
        total_exposure_time = hdul[0].header.get('TOTALEXP', 0)
        axis1 = hdul[0].header.get('NAXIS1', 0)
        axis2 = hdul[0].header.get('NAXIS2', 0)

        if total_exposure_time == 0:
            total_exposure_time = exposure_time * stackcnt

        # print(hdul[0].header)

    settings = Settings()
    solver = PlateSolve()
    solution = solver.solve(pathname, local_solve=settings.local_solve, index_dir=settings.astrometry_index_dir)

    # We only store the relative pathname (for now)
    return FileDescription(pathname=str(pathname.relative_to(dir)),
                           hash=sha256_hash,
                           total_exposure_time=total_exposure_time,
                           dec=dec,
                           ra=ra,
                           instrument=instrument,
                           stackcnt=stackcnt,
                           exposure_time=exposure_time,
                           axis1=axis1,
                           axis2=axis2,
                           solution=solution)


def read_manifest(directory: str) -> Manifest | None:
    dir = Path(directory)
    manifest_file = dir / "manifest.json"
    if not manifest_file.exists():
        click.echo("Manifest not found.")
        return None

    manifest_content = manifest_file.read_text()
    return Manifest.model_validate_json(manifest_content)


@click.group()
def cli():
    """Astronomy observation log commands."""
    pass


@cli.group()
def manifest():
    """Manifest-related commands."""
    pass


@manifest.command()
@click.option("-d", "--directory", default=".", help="The directory to operate in.")
def update(directory: str):
    """Create or update the manifest."""
    click.echo(f"Updating the manifest in directory {directory}")
    dir = Path(directory)
    count = 0
    manifest_file = dir / "manifest.json"
    # todo : exclude hidden files, add "fits" extension
    if manifest_file.exists():
        manifest_content = manifest_file.read_text()
        manifest = Manifest.model_validate_json(manifest_content)
    else:
        manifest = Manifest(files=[])

    def save_manifest():
        manifest_file.write_text(manifest.model_dump_json(indent=2))

    # with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
    #     # Start the load operations and mark each future with its URL
    #     future_to_url = {executor.submit(load_url, url, 60): url for url in URLS}
    #     for future in concurrent.futures.as_completed(future_to_url):
    #         url = future_to_url[future]
    #         try:
    #             data = future.result()
    #         except Exception as exc:
    #             print('%r generated an exception: %s' % (url, exc))
    #         else:
    #             print('%r page is %d bytes' % (url, len(data)))

    futures = {}
    # with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
    for file in dir.rglob("*.fit"):
        if is_hidden(file):
            continue

        relative_path = file.relative_to(dir)

        if any([desc for desc in manifest.files if desc.pathname == str(relative_path)]):
            # click.echo(f"Skipping '{relative_path}' - already in manifest.")
            continue

        click.echo(f"Adding '{relative_path}' to manifest.")
        # futures[relative_path] = executor.submit(get_file_description, dir, file)
        desc = get_file_description(dir, file)

        manifest.files.append(desc)
        count += 1

        # Save manifest every 10 files...
        if count % 10 == 0:
            click.echo(f"Processed {count} files.  Checkpointing manifest. {len(manifest.files)} files in total")
            save_manifest()
            # break

    # for future in concurrent.futures.as_completed(futures):
    #     relative_path = futures[future]
    #     try:
    #         click.echo(f"Processing '{relative_path}' for manifest.")
    #         desc = future.result()
    #
    #         manifest.files.append(desc)
    #         count += 1
    #         if count % 10 == 0:
    #             click.echo(f"Processed {count} files.  Checkpointing manifest")
    #             save_manifest()
    #     except Exception as exc:
    #         click.echo(f"Exception raised for {relative_path}: {exc}")

    click.echo(f"Found {count} FITS files.")

    save_manifest()


@manifest.command()
@click.option("-d", "--directory", default=".", help="The directory to operate in.")
def show(directory: str):
    """Show the manifest."""
    click.echo("Showing the manifest.")
    manifest = read_manifest(directory)
    if not manifest:
        return

    total_exposure_time = sum([desc.total_exposure_time for desc in manifest.files])

    click.echo(f"  Contains {humanize.intcomma(len(manifest.files))} files.")
    click.echo(
        f"  Total exposure time: {humanize.precisedelta(total_exposure_time, minimum_unit='seconds')} ({total_exposure_time:.2f} seconds)")

    keyfunc = lambda desc: desc.instrument
    files = sorted(manifest.files, key=keyfunc)
    for instrument, group in itertools.groupby(files, keyfunc):
        group = list(group)
        total_exposure_time = sum([desc.total_exposure_time for desc in group])
        total_pixel_time = sum([desc.total_exposure_time * desc.axis1 * desc.axis2 for desc in group])
        mpel_hours = total_pixel_time / 3600 / 1_000_000
        click.echo(f"  Instrument: {instrument}")
        click.echo(f"    Contains {humanize.intcomma(len(group))} files.")
        click.echo(
            f"    Total exposure time: {humanize.precisedelta(total_exposure_time, minimum_unit='seconds')} ({total_exposure_time:.2f} seconds)")
        click.echo(f"    Megapixel hours: {mpel_hours:.2f}")


@manifest.command()
def summary():
    """Show a summary of the manifest."""
    click.echo("Showing a summary of the manifest.")


@manifest.command()
def validate():
    """Validate the manifest."""
    click.echo("Validating the manifest.")


@manifest.command()
@click.option("-d", "--directory", default=".", help="The directory to operate in.")
def graph(directory: str):
    """Show a graph of the manifest."""
    manifest = read_manifest(directory)
    if not manifest:
       return

    click.echo(f"Showing a graph of the manifest.  {len(manifest.files)} files in total.")
    rectangles = [{
       "x": file.solution.calibration.ra,
       "y": file.solution.calibration.dec,
       "width": file.solution.calibration.width_arcsec / 3600.0,
       "height": file.solution.calibration.height_arcsec / 3600.0,
       "rotation": file.solution.calibration.orientation
    } for file in manifest.files]

    display_rectangles(rectangles)
    plt.show()

    #location = 'Houston, Texas'
    #when = '2025-04-04 21:00'
    #fig, ax = build_star_chart(location, when)

    #rectangles = [
    #    {'x': 0, 'y': 0, 'width': 4, 'height': 2, 'rotation': 0},
    #    {'x': 5, 'y': 5, 'width': 3, 'height': 3, 'rotation': 45},
    #    {'x': -3, 'y': 4, 'width': 2, 'height': 5, 'rotation': 30},
    #    {'x': -5, 'y': -2, 'width': 4, 'height': 1, 'rotation': 15}
    #]
    #plot_rectangles(fig, ax, rectangles, facecolor='red')



if __name__ == '__main__':
    cli()
