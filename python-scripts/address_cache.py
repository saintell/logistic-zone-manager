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
    stream=sys.stderr
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


def main():
    """Handle CLI arguments for cache management."""
    if len(sys.argv) < 2:
        return
    
    try:
        input_data = json.loads(sys.argv[1])
        action = input_data.get('action')
        
        if action == 'get_stats':
            cache = load_cache()
            records = cache.get('records', {})
            stats = {
                "success": True,
                "totalRecords": len(records),
                "lastUpdated": cache.get('metadata', {}).get('last_updated'),
                "fileSize": os.path.getsize(CACHE_FILE_PATH) if os.path.exists(CACHE_FILE_PATH) else 0,
                "filePath": CACHE_FILE_PATH
            }
            print(json.dumps(stats))
            
        elif action == 'get_records':
            page = input_data.get('page', 1)
            page_size = input_data.get('pageSize', 50)
            search = input_data.get('search', '').lower()
            
            cache = load_cache()
            records_dict = cache.get('records', {})
            
            # Convert dict to list for pagination
            all_records = list(records_dict.values())
            
            # Filter if search term exists
            if search:
                all_records = [
                    r for r in all_records 
                    if search in r.get('original_address', '').lower() 
                    or search in r.get('normalized_address', '').lower()
                    or search in r.get('zone', '').lower()
                ]
            
            # Sort by updated_at desc
            all_records.sort(key=lambda x: x.get('updated_at', ''), reverse=True)
            
            # Paginate
            total_filtered = len(all_records)
            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size
            paginated_records = all_records[start_idx:end_idx]
            
            print(json.dumps({
                "success": True,
                "records": paginated_records,
                "total": total_filtered,
                "page": page,
                "pageSize": page_size
            }))

        elif action == 'add_record':
            record_data = input_data.get('record', {})
            original_addr = record_data.get('original_address')
            
            if not original_addr:
                print(json.dumps({"success": False, "error": "Original address is required"}))
                return

            cache = load_cache()
            updated_cache = cache_record(
                original_address=original_addr,
                normalized_address=record_data.get('normalized_address', ''),
                lat=record_data.get('lat'),
                lng=record_data.get('lng'),
                zone=record_data.get('zone', ''),
                cache=cache,
                auto_save=True
            )
            print(json.dumps({"success": True, "message": "Record added successfully"}))

        elif action == 'update_record':
            key = input_data.get('key') # key is the original address of the record to update
            updates = input_data.get('updates', {})
            
            if not key:
                print(json.dumps({"success": False, "error": "Key (original address) is required"}))
                return
                
            cache = load_cache()
            # We reuse cache_record which handles update logic if hash matches
            # Ideally we should check if it exists first if we want strict update
            address_hash = get_address_hash(key)
            if address_hash not in cache.get('records', {}):
                 print(json.dumps({"success": False, "error": "Record not found"}))
                 return

            # Merge existing data with updates to ensure we don't lose fields not passed
            existing = cache['records'][address_hash]
            
            updated_cache = cache_record(
                original_address=key, # Key cannot change for now
                normalized_address=updates.get('normalized_address', existing.get('normalized_address')),
                lat=updates.get('lat', existing.get('lat')),
                lng=updates.get('lng', existing.get('lng')),
                zone=updates.get('zone', existing.get('zone')),
                cache=cache,
                auto_save=True
            )
            print(json.dumps({"success": True, "message": "Record updated successfully"}))

        elif action == 'delete_record':
            key = input_data.get('key')
            if not key:
                 print(json.dumps({"success": False, "error": "Key is required"}))
                 return
            
            cache = load_cache()
            address_hash = get_address_hash(key)
            
            if address_hash in cache.get('records', {}):
                del cache['records'][address_hash]
                if save_cache(cache):
                    print(json.dumps({"success": True, "message": "Record deleted successfully"}))
                else:
                    print(json.dumps({"success": False, "error": "Failed to save cache"}))
            else:
                print(json.dumps({"success": False, "error": "Record not found"}))

        elif action == 'clear_cache':
            # Create empty cache structure
            empty_cache = {
                "records": {},
                "metadata": {
                    "total_records": 0,
                    "last_updated": datetime.now().isoformat()
                }
            }
            if save_cache(empty_cache):
                print(json.dumps({
                    "success": True, 
                    "message": "Cache cleared successfully",
                    "totalRecords": 0
                }))
            else:
                print(json.dumps({
                    "success": False, 
                    "error": "Failed to save empty cache"
                }))
                
        else:
            print(json.dumps({
                "success": False, 
                "error": f"Unknown action: {action}"
            }))
            
    except Exception as e:
        print(json.dumps({
            "success": False, 
            "error": str(e)
        }))

if __name__ == "__main__":
    main()
