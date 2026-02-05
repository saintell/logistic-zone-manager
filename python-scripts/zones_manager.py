"""
Zones Manager Script
Handles loading and saving delivery zones to a JSON file.
"""
import sys
import json
import os

# Path to the zones data file (relative to the project root)
ZONES_FILE = os.path.join(os.path.dirname(__file__), '..', 'config', 'zones.json')

def load_zones():
    """Load zones from the JSON file."""
    try:
        if os.path.exists(ZONES_FILE):
            with open(ZONES_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        return []
    except Exception as e:
        raise Exception(f"Error loading zones: {str(e)}")


def save_zones(zones):
    """Save zones to the JSON file."""
    try:
        # Ensure the config directory exists
        os.makedirs(os.path.dirname(ZONES_FILE), exist_ok=True)
        
        with open(ZONES_FILE, 'w', encoding='utf-8') as f:
            json.dump(zones, f, ensure_ascii=False, indent=2)
        
        return True
    except Exception as e:
        raise Exception(f"Error saving zones: {str(e)}")


def main():
    if len(sys.argv) < 2:
        result = {
            "success": False,
            "error": "No action provided"
        }
        print(json.dumps(result))
        sys.exit(1)
    
    try:
        # Parse the JSON argument
        input_data = json.loads(sys.argv[1])
        action = input_data.get('action')
        
        if action == 'get_zones':
            # Get all zones
            zones = load_zones()
            result = {
                "success": True,
                "zones": zones
            }
            
        elif action == 'save_zone':
            # Save a single zone (add or update)
            zone_data = input_data.get('zone')
            if not zone_data:
                raise ValueError("No zone data provided")
            
            zones = load_zones()
            
            # Check if zone exists (update) or is new (add)
            existing_index = next(
                (i for i, z in enumerate(zones) if z['id'] == zone_data['id']),
                None
            )
            
            if existing_index is not None:
                # Update existing zone
                zones[existing_index] = zone_data
            else:
                # Add new zone
                zones.append(zone_data)
            
            save_zones(zones)
            
            result = {
                "success": True,
                "message": "Zone saved successfully",
                "zone": zone_data,
                "totalZones": len(zones)
            }
            
        elif action == 'delete_zone':
            # Delete a zone by ID
            zone_id = input_data.get('zoneId')
            if not zone_id:
                raise ValueError("No zone ID provided")
            
            zones = load_zones()
            original_count = len(zones)
            zones = [z for z in zones if z['id'] != zone_id]
            
            if len(zones) == original_count:
                raise ValueError(f"Zone with ID '{zone_id}' not found")
            
            save_zones(zones)
            
            result = {
                "success": True,
                "message": "Zone deleted successfully",
                "deletedId": zone_id,
                "totalZones": len(zones)
            }
            
        elif action == 'save_all_zones':
            # Replace all zones with provided list
            zones = input_data.get('zones', [])
            save_zones(zones)
            
            result = {
                "success": True,
                "message": "All zones saved successfully",
                "totalZones": len(zones)
            }
            
        else:
            raise ValueError(f"Unknown action: {action}")
    
    except json.JSONDecodeError:
        result = {
            "success": False,
            "error": "Invalid JSON input"
        }
    except Exception as e:
        result = {
            "success": False,
            "error": str(e)
        }
    
    print(json.dumps(result))
    sys.exit(0)


if __name__ == "__main__":
    main()
