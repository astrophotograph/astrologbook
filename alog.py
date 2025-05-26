import hashlib
import itertools
import random
import time
from pathlib import Path

import click
import humanize
from astropy.io import fits
from erewhon_astro import PlateSolve
from pydantic_settings import BaseSettings, SettingsConfigDict

from alog.graph import display_rectangles_and_stars
from alog.models import ImageRectangle, FileDescription, Manifest
from alog.graphplot import plot_graph
from utils import is_hidden



class Settings(BaseSettings):
    """Settings for app"""
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    local_solve: bool = False
    astrometry_index_dir: str | None = None


def get_file_description(dir: Path, pathname: Path) -> FileDescription:
    msg = ''
    start = time.perf_counter()
    with open(pathname, 'rb') as f:
        # Calculate the SHA256 hash of the file
        sha256_hash = hashlib.sha256(f.read()).hexdigest()
    elapsed = time.perf_counter() - start
    msg += f' Hash elapsed: {elapsed:.2f}s. '
    start = time.perf_counter()
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
    elapsed = time.perf_counter() - start
    msg += f'FITS header read: {elapsed:.2f}s. '

    start = time.perf_counter()
    settings = Settings()
    solver = PlateSolve()
    solution = solver.solve(pathname, local_solve=settings.local_solve, index_dir=settings.astrometry_index_dir)
    elapsed = time.perf_counter() - start
    msg += f'Plate solver: {elapsed:.2f}s. '
    print(msg)

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

    files = list(dir.rglob("*.fit"))
    random.shuffle(files)
    for file in files:
        if is_hidden(file):
            continue

        if "/lights/" in str(file):
            # Skip lights frames for now!
            continue

        relative_path = file.relative_to(dir)

        if any([desc for desc in manifest.files if desc.pathname == str(relative_path)]):
            # click.echo(f"Skipping '{relative_path}' - already in manifest.")
            continue

        click.echo(f"Adding '{relative_path}' to manifest.")
        try:
            start = time.perf_counter()
            desc = get_file_description(dir, file)
            elapsed = time.perf_counter() - start
            click.echo(f' Elapsed time: {elapsed:.2f}s plate solving {relative_path}')
        except Exception as e:
            click.echo(f' Exception while processing {relative_path}: {e}')
            continue

        manifest.files.append(desc)
        count += 1

        # Save manifest every 20 files...
        if count % 10 == 0:
            start = time.perf_counter()
            save_manifest()
            elapsed = time.perf_counter() - start
            click.echo(
                f"Processed {count} files.  Checkpointing manifest. {len(manifest.files)} files in total. ({elapsed:.2f}s)")

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
    rectangles = [
        ImageRectangle(x=file.solution.calibration.ra, y=file.solution.calibration.dec,
                       width=file.solution.calibration.width_arcsec / 3600.0,
                       height=file.solution.calibration.height_arcsec / 3600.0,
                       rotation=file.solution.calibration.orientation, total_exposure_time=file.total_exposure_time) for
        file in manifest.files]

    display_rectangles_and_stars(rectangles)

    # plt.show()

    # rectangles = [{
    #     "x": file.solution.calibration.ra,
    #     "y": file.solution.calibration.dec,
    #     "width": file.solution.calibration.width_arcsec / 3600.0,
    #     "height": file.solution.calibration.height_arcsec / 3600.0,
    #     "rotation": file.solution.calibration.orientation,
    #     "total_exposure_time": file.total_exposure_time,
    # } for file in manifest.files]
    #
    # display_rectangles(rectangles)
    # plt.show()

    # location = 'Houston, Texas'
    # when = '2025-04-04 21:00'
    # fig, ax = build_star_chart(location, when)



@manifest.command()
@click.option("-d", "--directory", default=".", help="The directory to operate in.")
def graph2(directory: str):
    """Show a graph of the manifest."""
    manifest = read_manifest(directory)
    if not manifest:
        return

    click.echo(f"Showing a graph of the manifest.  {len(manifest.files)} files in total.")
    rectangles = [
        ImageRectangle(x=file.solution.calibration.ra,
                       y=file.solution.calibration.dec,
                       # centerx=file.solution.calibration.centerx,
                       width=file.solution.calibration.width_arcsec / 3600.0,
                       height=file.solution.calibration.height_arcsec / 3600.0,
                       rotation=file.solution.calibration.orientation, total_exposure_time=file.total_exposure_time) for
        file in manifest.files]

    plot_graph(rectangles)


if __name__ == '__main__':
    cli()
