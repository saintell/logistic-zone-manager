"""
Address Geocoder Module
Geocodes addresses using Google Maps Geocoding API.
"""
import os
import sys
import logging
import json

from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()


def geocode_addresses(
    addresses: list[str],
    country: str = "Colombia"
) -> list[dict]:
    """
    Geocodes a list of addresses using Google Maps Geocoding API.
    
    Args:
        addresses: List of addresses to geocode
        country: Country context for geocoding (default: Colombia)
    
    Returns:
        List of dicts with {"lat": float, "lng": float} for each address.
        Returns empty dict {} if geocoding fails for an address.
    """
    if not addresses:
        logger.warning("Empty address list provided")
        return []
    
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not api_key:
        logger.warning("GOOGLE_MAPS_API_KEY not found. Returning empty coordinates.")
        return [{} for _ in addresses]

    try:
        import googlemaps
    except ImportError:
        logger.error("googlemaps library not installed. Run: pip install googlemaps")
        return [{} for _ in addresses]

    try:
        logger.info(f"Starting geocoding of {len(addresses)} addresses")
        
        # Initialize Google Maps client
        gmaps = googlemaps.Client(key=api_key)
        
        coordinates = []
        
        for i, address in enumerate(addresses):
            if i > 0 and i % 50 == 0:
                logger.info(f"Geocoded {i}/{len(addresses)} addresses...")
            
            try:
                # Add country context for better accuracy
                full_address = f"{address}, {country}"
                
                result = gmaps.geocode(
                    full_address,
                    region="co",  # Colombia region bias
                    language="es"
                )
                
                if result and len(result) > 0:
                    location = result[0]['geometry']['location']
                    coordinates.append({
                        'lat': location['lat'],
                        'lng': location['lng']
                    })
                else:
                    logger.warning(f"No results for address: {address}")
                    coordinates.append({})
                    
            except Exception as e:
                logger.warning(f"Error geocoding '{address}': {e}")
                coordinates.append({})
        
        successful = sum(1 for c in coordinates if c)
        logger.info(f"Geocoding complete. {successful}/{len(addresses)} addresses geocoded successfully")
        
        return coordinates

    except Exception as e:
        logger.critical(f"Critical error in geocoding: {e}")
        return [{} for _ in addresses]
