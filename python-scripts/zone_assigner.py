"""
Zone Assigner Module
Assigns records to zones based on their coordinates using point-in-polygon algorithm.
"""
import json
import os

# Path to zones configuration file
ZONES_FILE = os.path.join(os.path.dirname(__file__), '..', 'config', 'zones.json')


def load_zones():
    """Load zones from the configuration file."""
    try:
        if os.path.exists(ZONES_FILE):
            with open(ZONES_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        return []
    except Exception:
        return []


def parse_coordinate(value):
    """Parse coordinate string to float, handling comma as decimal separator."""
    if not value:
        return None
    try:
        # Handle comma as decimal separator (European format)
        str_value = str(value).replace(',', '.')
        return float(str_value)
    except (ValueError, TypeError):
        return None


def point_in_polygon(x, y, polygon):
    """
    Check if a point (x, y) is inside a polygon using ray casting algorithm.
    polygon is a list of (x, y) tuples representing the vertices.
    """
    n = len(polygon)
    if n < 3:
        return False
    
    inside = False
    j = n - 1
    
    for i in range(n):
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
            inside = not inside
        
        j = i
    
    return inside


def get_zone_polygon(zone):
    """Convert zone points to polygon coordinates list."""
    polygon = []
    for point in zone.get('points', []):
        lat = parse_coordinate(point.get('lat'))
        lng = parse_coordinate(point.get('lng'))
        if lat is not None and lng is not None:
            polygon.append((lat, lng))
    return polygon


def assign_zone(lat, lng, zones):
    """
    Assign a zone to a coordinate.
    Returns the zone name if the point is inside a zone, otherwise empty string.
    """
    if lat is None or lng is None:
        return ''
    
    for zone in zones:
        polygon = get_zone_polygon(zone)
        if len(polygon) >= 3:  # Need at least 3 points for a polygon
            if point_in_polygon(lat, lng, polygon):
                return zone.get('name', '')
    
    return ''  # No zone found


def assign_zones_to_records(latitudes, longitudes):
    """
    Assign zones to a list of records based on their coordinates.
    
    Args:
        latitudes: List of latitude values (strings or floats)
        longitudes: List of longitude values (strings or floats)
    
    Returns:
        List of zone names (empty string if no zone matches or no coordinates)
    """
    zones = load_zones()
    
    if not zones:
        return [''] * len(latitudes)
    
    results = []
    for lat_str, lng_str in zip(latitudes, longitudes):
        lat = parse_coordinate(lat_str)
        lng = parse_coordinate(lng_str)
        
        if lat is not None and lng is not None:
            zone_name = assign_zone(lat, lng, zones)
            results.append(zone_name)
        else:
            results.append('')  # No coordinates, no zone
    
    return results
