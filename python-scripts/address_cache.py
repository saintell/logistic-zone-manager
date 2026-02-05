"""
Address Cache Module
Stores processed address records to avoid redundant geocoding operations.
"""
import os
import json
import hashlib
import logging
import sys
from datetime import datetime
from typing import Optional, Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger(__name__)

# Default cache file path (in config folder, one level up from python-scripts)
CACHE_FILE_PATH = os.path.join(os.path.dirname(__file__), '..', 'config', 'address_cache.json')


def get_address_hash(address: str) -> str:
    """
    Generate a normalized hash for an address.
    
    Args:
        address: The address string to hash
    
    Returns:
        A SHA-256 hash of the normalized address
    """
    # Normalize: lowercase, strip whitespace, remove extra spaces
    normalized = ' '.join(address.lower().strip().split())
    return hashlib.sha256(normalized.encode('utf-8')).hexdigest()


def load_cache(cache_path: str = CACHE_FILE_PATH) -> Dict[str, Any]:
    """
    Load the address cache from the JSON file.
    
    Args:
        cache_path: Path to the cache file
    
    Returns:
        Dictionary with cache data or empty structure if file doesn't exist
    """
    if not os.path.exists(cache_path):
        logger.info(f"Cache file not found at {cache_path}. Starting with empty cache.")
        return {
            "records": {},
            "metadata": {
                "total_records": 0,
                "last_updated": None
            }
        }
    
    try:
        with open(cache_path, 'r', encoding='utf-8') as f:
            cache = json.load(f)
            logger.info(f"Loaded cache with {cache.get('metadata', {}).get('total_records', 0)} records")
            return cache
    except json.JSONDecodeError as e:
        logger.error(f"Error reading cache file: {e}. Starting with empty cache.")
        return {
            "records": {},
            "metadata": {
                "total_records": 0,
                "last_updated": None
            }
        }
    except Exception as e:
        logger.error(f"Unexpected error loading cache: {e}")
        return {
            "records": {},
            "metadata": {
                "total_records": 0,
                "last_updated": None
            }
        }


def save_cache(cache: Dict[str, Any], cache_path: str = CACHE_FILE_PATH) -> bool:
    """
    Save the address cache to the JSON file.
    
    Args:
        cache: The cache dictionary to save
        cache_path: Path to the cache file
    
    Returns:
        True if save was successful, False otherwise
    """
    try:
        # Update metadata
        cache["metadata"]["total_records"] = len(cache.get("records", {}))
        cache["metadata"]["last_updated"] = datetime.now().isoformat()
        
        with open(cache_path, 'w', encoding='utf-8') as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Cache saved with {cache['metadata']['total_records']} records")
        return True
    except Exception as e:
        logger.error(f"Error saving cache: {e}")
        return False


def get_cached_record(
    address: str,
    cache: Optional[Dict[str, Any]] = None,
    cache_path: str = CACHE_FILE_PATH
) -> Optional[Dict[str, Any]]:
    """
    Look up an address in the cache.
    
    Args:
        address: The address to look up
        cache: Optional pre-loaded cache dict. If None, loads from file.
        cache_path: Path to the cache file (used if cache is None)
    
    Returns:
        Dictionary with cached record or None if not found
    """
    if cache is None:
        cache = load_cache(cache_path)
    
    address_hash = get_address_hash(address)
    record = cache.get("records", {}).get(address_hash)
    
    if record:
        logger.debug(f"Cache hit for address: {address[:50]}...")
    
    return record


def cache_record(
    original_address: str,
    normalized_address: str,
    lat: Optional[float],
    lng: Optional[float],
    zone: str,
    cache: Optional[Dict[str, Any]] = None,
    cache_path: str = CACHE_FILE_PATH,
    auto_save: bool = False
) -> Dict[str, Any]:
    """
    Add or update a record in the cache.
    
    Args:
        original_address: The original address before normalization (used as key)
        normalized_address: The normalized address
        lat: Latitude coordinate
        lng: Longitude coordinate
        zone: Assigned zone name
        cache: Optional pre-loaded cache dict. If None, loads from file.
        cache_path: Path to the cache file
        auto_save: If True, automatically saves the cache after adding
    
    Returns:
        The updated cache dictionary
    """
    if cache is None:
        cache = load_cache(cache_path)
    
    # Use ORIGINAL address as the key for consistent lookups
    address_hash = get_address_hash(original_address)
    now = datetime.now().isoformat()
    
    # Only cache if coordinates are present
    if lat is None or lng is None or lat == '' or lng == '':
        logger.info(f"Skipping cache for address: {original_address[:50]}... due to missing coordinates")
        return cache if cache is not None else load_cache(cache_path)

    existing = cache.get("records", {}).get(address_hash)
    
    record = {
        "original_address": original_address,
        "normalized_address": normalized_address,
        "lat": lat,
        "lng": lng,
        "zone": zone,
        "created_at": existing["created_at"] if existing else now,
        "updated_at": now
    }
    
    if "records" not in cache:
        cache["records"] = {}
    
    cache["records"][address_hash] = record
    
    if auto_save:
        save_cache(cache, cache_path)
    
    return cache


def lookup_addresses_in_cache(
    addresses: list[str],
    cache_path: str = CACHE_FILE_PATH
) -> tuple[list[Optional[Dict[str, Any]]], list[int]]:
    """
    Look up multiple addresses in the cache.
    
    Args:
        addresses: List of addresses to look up
        cache_path: Path to the cache file
    
    Returns:
        Tuple of:
        - List of cached records (None for misses)
        - List of indices that were NOT found in cache (need processing)
    """
    cache = load_cache(cache_path)
    
    results = []
    uncached_indices = []
    
    for i, address in enumerate(addresses):
        record = get_cached_record(address, cache, cache_path)
        results.append(record)
        if record is None:
            uncached_indices.append(i)
    
    hits = len(addresses) - len(uncached_indices)
    logger.info(f"Cache lookup: {hits}/{len(addresses)} hits, {len(uncached_indices)} misses")
    
    return results, uncached_indices


def cache_multiple_records(
    records: list[Dict[str, Any]],
    cache_path: str = CACHE_FILE_PATH
) -> bool:
    """
    Add multiple records to the cache at once.
    
    Args:
        records: List of dicts with keys:
            - original_address
            - normalized_address
            - lat
            - lng
            - zone
        cache_path: Path to the cache file
    
    Returns:
        True if successful, False otherwise
    """
    cache = load_cache(cache_path)
    
    for record in records:
        cache = cache_record(
            original_address=record.get("original_address", ""),
            normalized_address=record.get("normalized_address", ""),
            lat=record.get("lat"),
            lng=record.get("lng"),
            zone=record.get("zone", ""),
            cache=cache,
            auto_save=False
        )
    
    return save_cache(cache, cache_path)
