import hashlib
import itertools
import random
import time
from pathlib import Path

import click
import humanize
import json
import sqlite3
import re
from datetime import datetime

from astropy.io import fits
from erewhon_astro import PlateSolve
from pydantic_settings import BaseSettings, SettingsConfigDict

from alog.graph import display_rectangles_and_stars
from alog.models import ImageRectangle, FileDescription, Manifest
from alog.graphplot import plot_graph
from utils import is_hidden

from astroquery.simbad import Simbad


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


@cli.command()
@click.argument("object_name")
@click.option("--json", "output_json", is_flag=True, help="Output as JSON instead of formatted text")
@click.option("--cache", is_flag=True, help="Cache lookup results in a local SQLite database")
def lookup(object_name: str, output_json: bool = False, cache: bool = False):
    """Look up an astronomical object in Simbad database."""
    click.echo(f"Looking up {object_name} in Simbad database...")
    
    # Initialize cache if requested
    if cache:
        conn = None
        try:
            conn = sqlite3.connect('alog_cache.db')
            cursor = conn.cursor()
            # Create cache table if it doesn't exist
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS object_cache (
                    object_name TEXT PRIMARY KEY,
                    data TEXT,
                    timestamp TEXT
                )
            ''')
            
            # Check if object is in cache
            cursor.execute("SELECT data FROM object_cache WHERE object_name = ?", (object_name,))
            cached_data = cursor.fetchone()
            
            if cached_data:
                click.echo("Using cached data...")
                if output_json:
                    click.echo(cached_data[0])
                    return
                else:
                    cached_obj = json.loads(cached_data[0])
                    _display_object_info(cached_obj)
                    return
                    
        except sqlite3.Error as e:
            click.echo(f"SQLite error: {e}")
            # Continue with regular lookup if cache fails
            pass
    
    # Customize Simbad query to include more fields
    simbad = Simbad()
    simbad.add_votable_fields('oid', 'ra', 'dec', 'plx_value', 'pmra', 'pmdec',
                              'sp_type', 'V', 'otype',
                              'dimensions', 'galdim_majaxis', 'galdim_minaxis', 'galdim_angle')
    
    try:
        result_table = simbad.query_object(object_name)
        
        if result_table is None or len(result_table) == 0:
            click.echo(f"No results found for '{object_name}'")
            return
            
        # Get the main object information
        obj = result_table[0]
        
        # Create a structured object with all the data
        object_data = {
            "name": obj['main_id'].decode() if isinstance(obj['main_id'], bytes) else obj['main_id'],
            "type": obj['otype'].decode() if isinstance(obj['otype'], bytes) else obj['otype'],
            "coordinates": {
                "ra": float(obj['ra']),
                "dec": float(obj['dec']),
                "ra_str": str(obj['ra']),
                "dec_str": str(obj['dec'])
            }
        }
        
        # Size information
        object_data["size"] = {}
        has_size = False
        
        # Check for dimensions string first
        if 'dimensions' in obj.colnames and obj['dimensions'] is not None:
            dim_str = obj['dimensions'].decode() if isinstance(obj['dimensions'], bytes) else obj['dimensions']
            if dim_str and dim_str.strip():
                object_data["size"]["dimensions"] = dim_str
                has_size = True
        
        # If no dimensions string, check for major/minor axis values
        if not has_size and 'galdim_majaxis' in obj.colnames and obj['galdim_majaxis'] is not None:
            major_axis = obj['galdim_majaxis']
            if major_axis > 0:
                minor_axis = obj['galdim_minaxis'] if 'galdim_minaxis' in obj.colnames and obj['galdim_minaxis'] is not None else major_axis
                pa = obj['galdim_angle'] if 'galdim_angle' in obj.colnames and obj['galdim_angle'] is not None else 0
                
                object_data["size"]["major_axis"] = float(major_axis)
                object_data["size"]["minor_axis"] = float(minor_axis)
                object_data["size"]["position_angle"] = float(pa)
                
                # Also add formatted display values
                if major_axis >= 60:
                    major_arcmin = major_axis / 60
                    minor_arcmin = minor_axis / 60
                    object_data["size"]["formatted"] = f"{major_arcmin:.1f}′ × {minor_arcmin:.1f}′ (PA: {pa}°)"
                else:
                    object_data["size"]["formatted"] = f"{major_axis:.1f}″ × {minor_axis:.1f}″ (PA: {pa}°)"
                has_size = True
        
        # If no size information was found
        if not has_size:
            # For stars and point sources, we typically don't have size
            if 'otype' in obj.colnames and obj['otype'] is not None:
                otype = obj['otype'].decode() if isinstance(obj['otype'], bytes) else obj['otype']
                if 'Star' in otype or '*' in otype:
                    object_data["size"]["type"] = "point_source"
                else:
                    object_data["size"]["type"] = "unknown"
            else:
                object_data["size"]["type"] = "unknown"
        
        # Optional information
        if obj['plx_value'] is not None and obj['plx_value'] != 0:
            dist_pc = 1000.0 / obj['plx_value']
            dist_ly = dist_pc * 3.26156
            object_data["distance"] = {
                "parsecs": float(dist_pc),
                "light_years": float(dist_ly)
            }
        
        if obj['sp_type'] is not None:
            object_data["spectral_type"] = obj['sp_type'].decode() if isinstance(obj['sp_type'], bytes) else obj['sp_type']
        
        if obj['V'] is not None:
            object_data["visual_magnitude"] = float(obj['V'])
            
        # Proper motion if available
        if obj['pmra'] is not None and obj['pmdec'] is not None and obj['pmra'] != '--' and obj['pmdec'] != '--':
            object_data["proper_motion"] = {
                "ra": float(obj['pmra']),
                "dec": float(obj['pmdec'])
            }
            
        if 'RV_VALUE' in obj.colnames and obj['RV_VALUE'] is not None:
            object_data["radial_velocity"] = float(obj['RV_VALUE'])
            
        # Get alternative identifiers
        other_names = simbad.query_objectids(object_name)
        alt_names = []
        if other_names is not None and len(other_names) > 0:
            alt_names = [
                name['id'].decode() if isinstance(name['id'], bytes) else name['id']
                for name in other_names
            ]
            object_data["alternative_names"] = alt_names
        
        # Extract catalog information from main ID and alternative names
        catalogs = _extract_catalog_references([object_data["name"]] + alt_names)
        if catalogs:
            object_data["catalogs"] = catalogs
        
        # Cache the data if requested
        if cache and conn:
            try:
                json_data = json.dumps(object_data)
                timestamp = datetime.now().isoformat()
                cursor.execute(
                    "INSERT OR REPLACE INTO object_cache (object_name, data, timestamp) VALUES (?, ?, ?)",
                    (object_name, json_data, timestamp)
                )
                conn.commit()
            except sqlite3.Error as e:
                click.echo(f"Error caching data: {e}")
        
        # Output results based on format choice
        if output_json:
            click.echo(json.dumps(object_data, indent=2))
        else:
            _display_object_info(object_data)
                
    except Exception as e:
        click.echo(f"Error querying Simbad: {e}")
    finally:
        if cache and conn:
            conn.close()


def _extract_catalog_references(name_list):
    """Extract catalog references from a list of object names."""
    # Dictionary to store catalog information
    catalogs = {}
    
    # Regular expressions for common catalogs
    catalog_patterns = {
        'Messier': r'^M\s*(\d+)',  # Matches: M1, M 1, M31, etc.
        'NGC': r'^NGC\s*(\d+)',    # Matches: NGC1976, NGC 1976, etc.
        'IC': r'^IC\s*(\d+)',      # Matches: IC434, IC 434, etc.
        'HD': r'^HD\s*(\d+)',      # Matches: HD1234, HD 1234, etc.
        'HIP': r'^HIP\s*(\d+)',    # Matches: HIP1234, HIP 1234, etc.
        'Sh2': r'^Sh\s*2-(\d+)',   # Matches: Sh2-155, Sh 2-155, etc.
        'Barnard': r'^B\s*(\d+)',  # Matches: B33, B 33, etc.
        # 'Caldwell': r'^C\s*(\d+)', # Matches: C14, C 14, etc.
        'HCG': r'^HCG\s*(\d+)',    # Matches: HCG92, HCG 92, etc.
        'UGC': r'^UGC\s*(\d+)',    # Matches: UGC12158, UGC 12158, etc.
        'Abell': r'^Abell\s*(\d+)',# Matches: Abell2151, Abell 2151, etc.
        'PGC': r'^PGC\s*(\d+)',    # Matches: PGC3589, PGC 3589, etc.
        'ESO': r'^ESO\s*(\d+)-(\d+)', # Matches: ESO123-16, ESO 123-16, etc.
        'LBN': r'^LBN\s*(\d+)',    # Matches: LBN123, LBN 123, etc.
        'SAO': r'^SAO\s*(\d+)',    # Matches: SAO123456, SAO 123456, etc.
        'HR': r'^HR\s*(\d+)',      # Matches: HR1234, HR 1234, etc.
        '2MASS': r'^2MASS\s*J(\d+)' # Matches: 2MASS J12345678+1234567
    }
    
    # Process each name
    for name in name_list:
        # Skip if None
        if name is None:
            continue
            
        name = name.strip()
        
        # Check against each catalog pattern
        for catalog, pattern in catalog_patterns.items():
            matches = re.search(pattern, name, re.IGNORECASE)
            if matches:
                if catalog not in catalogs:
                    catalogs[catalog] = []
                
                # Determine the catalog ID based on the regex match
                if catalog == 'ESO':  # Special case for ESO which has two capture groups
                    catalog_id = f"{matches.group(1)}-{matches.group(2)}"
                else:
                    catalog_id = matches.group(1)
                
                if catalog_id not in catalogs[catalog]:
                    catalogs[catalog].append(catalog_id)
    
    # Convert to expected JSON structure
    result = []
    for catalog, ids in catalogs.items():
        for id_value in ids:
            result.append({
                "catalog": catalog,
                "id": id_value,
                "designation": f"{catalog} {id_value}"
            })
    
    return result


def _display_object_info(obj):
    """Helper function to display object information in a formatted way."""
    # For debugging
    # pprint(obj)
    
    click.echo(f"\nObject: {obj['name']}")
    click.echo(f"Type: {obj['type']}")
    
    # Coordinates
    ra_deg = obj['coordinates']['ra']
    dec_deg = obj['coordinates']['dec']
    click.echo(f"RA: {ra_deg:.6f}° ({obj['coordinates']['ra_str']})")
    click.echo(f"DEC: {dec_deg:.6f}° ({obj['coordinates']['dec_str']})")

    # Size information
    if "size" in obj:
        size = obj["size"]
        if "dimensions" in size:
            click.echo(f"Size: {size['dimensions']}")
        elif "formatted" in size:
            click.echo(f"Size: {size['formatted']}")
        elif "type" in size:
            if size["type"] == "point_source":
                click.echo("Size: Point source")
            else:
                click.echo("Size: No size information available")
    
    # Catalog information
    if "catalogs" in obj and obj["catalogs"]:
        click.echo("\nCatalog Designations:")
        catalogs_by_name = {}
        
        # Group by catalog name
        for cat_entry in obj["catalogs"]:
            catalog = cat_entry["catalog"]
            if catalog not in catalogs_by_name:
                catalogs_by_name[catalog] = []
            catalogs_by_name[catalog].append(cat_entry["id"])
        
        # Display in a nice format
        for catalog, ids in sorted(catalogs_by_name.items()):
            id_str = ", ".join(ids)
            click.echo(f"  • {catalog}: {id_str}")
    
    # Distance
    if "distance" in obj:
        click.echo(f"Distance: {obj['distance']['parsecs']:.2f} parsecs ({obj['distance']['light_years']:.2f} light years)")
    
    # Spectral type
    if "spectral_type" in obj:
        click.echo(f"Spectral Type: {obj['spectral_type']}")
    
    # Visual magnitude
    if "visual_magnitude" in obj:
        click.echo(f"Visual Magnitude: {obj['visual_magnitude']:.2f}")
    
    # Proper motion
    if "proper_motion" in obj:
        click.echo(f"Proper Motion: RA {obj['proper_motion']['ra']:.2f} mas/yr, DEC {obj['proper_motion']['dec']:.2f} mas/yr")
    
    # Radial velocity
    if "radial_velocity" in obj:
        click.echo(f"Radial Velocity: {obj['radial_velocity']:.2f} km/s")
    
    # Alternative names
    if "alternative_names" in obj and len(obj["alternative_names"]) > 1:
        click.echo("\nAlternative designations:")
        # Show up to 5 alternative names
        for i, name in enumerate(obj["alternative_names"][:5]):
            click.echo(f"  • {name}")
        if len(obj["alternative_names"]) > 5:
            click.echo(f"  ... and {len(obj['alternative_names']) - 5} more identifiers")


if __name__ == '__main__':
    cli()