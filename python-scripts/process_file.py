"""
Process File Script
Receives a file path as argument and prints it.
"""
import sys
import json

def main():
    if len(sys.argv) < 2:
        result = {
            "success": False,
            "error": "No file path provided"
        }
        print(json.dumps(result))
        sys.exit(1)
    
    try:
        # Parse the JSON argument
        input_data = json.loads(sys.argv[1])
        file_path = input_data.get('filePath')
        
        if not file_path:
            raise ValueError("No filePath found in input JSON")

        import pandas as pd
        import os
        from datetime import datetime

        # Read the Excel file
        # header=0 implies the first row (index 0) contains column names
        df = pd.read_excel(file_path, header=0)

        # Define required columns
        required_columns = ['Tracking number', 'Cliente', 'Telefono cliente', 'Dirección cliente']

        # Check if columns exist
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
             # Try to find columns with similar names (case insensitive or stripped) if needed
             # For now, we'll error out or maybe just select what exists? 
             # Let's strictly require them as per request, or return a helpful error.
             raise ValueError(f"Missing columns in the excel file: {', '.join(missing_columns)}")

        # Create new DataFrame with only required columns
        df_filtered = df[required_columns].copy()

        # Normalize addresses using Gemini API
        try:
            from address_normalizer import normalize_addresses
            
            addresses = df_filtered['Dirección cliente'].astype(str).tolist()
            print(json.dumps({"status": "normalizing", "count": len(addresses)})) # Optional progress log
            
            normalized_addresses = normalize_addresses(addresses)
            
            df_filtered['Dirección cliente'] = normalized_addresses
            
        except ImportError:
             print(json.dumps({"warning": "Address normalizer module not found. Skipping normalization."}))
        except Exception as e:
             print(json.dumps({"warning": f"Address normalization failed: {e}. Using original addresses."}))

        # Geocode addresses to get coordinates
        try:
            from address_geocoder import geocode_addresses
            
            addresses_to_geocode = df_filtered['Dirección cliente'].astype(str).tolist()
            print(json.dumps({"status": "geocoding", "count": len(addresses_to_geocode)}))
            
            coordinates = geocode_addresses(addresses_to_geocode)
            
            df_filtered['Latitud'] = [c.get('lat', '') for c in coordinates]
            df_filtered['Longitud'] = [c.get('lng', '') for c in coordinates]
            
        except ImportError:
             print(json.dumps({"warning": "Address geocoder module not found. Skipping geocoding."}))
             df_filtered['Latitud'] = ''
             df_filtered['Longitud'] = ''
        except Exception as e:
             print(json.dumps({"warning": f"Geocoding failed: {e}. Skipping coordinates."}))
             df_filtered['Latitud'] = ''
             df_filtered['Longitud'] = ''

        # Assign zones based on coordinates
        try:
            from zone_assigner import assign_zones_to_records
            
            latitudes = df_filtered['Latitud'].tolist()
            longitudes = df_filtered['Longitud'].tolist()
            print(json.dumps({"status": "assigning_zones", "count": len(latitudes)}))
            
            zones = assign_zones_to_records(latitudes, longitudes)
            df_filtered['Zona'] = zones
            
        except ImportError:
             print(json.dumps({"warning": "Zone assigner module not found. Skipping zone assignment."}))
             df_filtered['Zona'] = ''
        except Exception as e:
             print(json.dumps({"warning": f"Zone assignment failed: {e}. Skipping zones."}))
             df_filtered['Zona'] = ''

        # Generate output file path
        directory = os.path.dirname(file_path)
        filename = os.path.basename(file_path)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        new_filename = f"processed_{timestamp}_{filename}"
        output_path = os.path.join(directory, new_filename)

        # Save to new Excel file
        df_filtered.to_excel(output_path, index=False)
            
        # Return the processed file path
        result = {
            "success": True,
            "message": "File processed successfully",
            "originalFile": file_path,
            "processedFile": output_path,
            "rows": len(df_filtered)
        }

    except json.JSONDecodeError:
        result = {
            "success": False,
            "error": "Invalid JSON input"
        }
    except ImportError as e:
         result = {
            "success": False,
            "error": f"Missing dependency: {str(e)}"
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
