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

        # Get original addresses before any processing
        original_addresses = df_filtered['Dirección cliente'].astype(str).tolist()
        
        # Check cache FIRST before any processing (normalization, geocoding, zones)
        try:
            from address_cache import lookup_addresses_in_cache, cache_multiple_records
            
            print(json.dumps({"status": "checking_cache", "count": len(original_addresses)}))
            
            # Check cache using ORIGINAL addresses (before normalization)
            cached_results, uncached_indices = lookup_addresses_in_cache(original_addresses)
            
            # Initialize result lists
            normalized_addresses = [''] * len(original_addresses)
            latitudes = [None] * len(original_addresses)
            longitudes = [None] * len(original_addresses)
            zones = [''] * len(original_addresses)
            
            # Fill in cached data
            cache_hits = 0
            for i, cached in enumerate(cached_results):
                if cached is not None:
                    normalized_addresses[i] = cached.get('normalized_address', original_addresses[i])
                    latitudes[i] = cached.get('lat', '')
                    longitudes[i] = cached.get('lng', '')
                    zones[i] = cached.get('zone', '')
                    cache_hits += 1
            
            print(json.dumps({"status": "cache_lookup_complete", "hits": cache_hits, "misses": len(uncached_indices)}))
            
        except ImportError as ie:
            print(json.dumps({"warning": f"Cache module not found: {ie}. Processing all addresses."}))
            uncached_indices = list(range(len(original_addresses)))
            normalized_addresses = [''] * len(original_addresses)
            latitudes = [None] * len(original_addresses)
            longitudes = [None] * len(original_addresses)
            zones = [''] * len(original_addresses)
        except Exception as e:
            print(json.dumps({"warning": f"Cache lookup failed: {e}. Processing all addresses."}))
            uncached_indices = list(range(len(original_addresses)))
            normalized_addresses = [''] * len(original_addresses)
            latitudes = [None] * len(original_addresses)
            longitudes = [None] * len(original_addresses)
            zones = [''] * len(original_addresses)

        # Normalize ONLY uncached addresses
        if uncached_indices:
            try:
                from address_normalizer import normalize_addresses as normalize_fn
                
                uncached_original = [original_addresses[i] for i in uncached_indices]
                print(json.dumps({"status": "normalizing", "count": len(uncached_original)}))
                
                normalized_result = normalize_fn(uncached_original)
                
                # Fill in normalized addresses for uncached records
                for idx, norm_addr in zip(uncached_indices, normalized_result):
                    normalized_addresses[idx] = norm_addr
                    
            except ImportError:
                print(json.dumps({"warning": "Address normalizer module not found. Using original addresses."}))
                for idx in uncached_indices:
                    normalized_addresses[idx] = original_addresses[idx]
            except Exception as e:
                print(json.dumps({"warning": f"Address normalization failed: {e}. Using original addresses."}))
                for idx in uncached_indices:
                    normalized_addresses[idx] = original_addresses[idx]
        
        # Update DataFrame with normalized addresses
        df_filtered['Dirección cliente'] = normalized_addresses

        # Geocode ONLY uncached addresses
        if uncached_indices:
            try:
                from address_geocoder import geocode_addresses
                
                # Use normalized addresses for geocoding
                uncached_normalized = [normalized_addresses[i] for i in uncached_indices]
                print(json.dumps({"status": "geocoding", "count": len(uncached_normalized)}))
                
                geocoded_coords = geocode_addresses(uncached_normalized)
                
                # Fill in geocoded coordinates
                for idx, coord in zip(uncached_indices, geocoded_coords):
                    latitudes[idx] = coord.get('lat', '')
                    longitudes[idx] = coord.get('lng', '')
                    
            except ImportError:
                print(json.dumps({"warning": "Address geocoder module not found. Skipping geocoding."}))
            except Exception as e:
                print(json.dumps({"warning": f"Geocoding failed: {e}. Skipping coordinates."}))
        
        df_filtered['Latitud'] = latitudes
        df_filtered['Longitud'] = longitudes

        # Assign zones ONLY for uncached records
        if uncached_indices:
            try:
                from zone_assigner import assign_zones_to_records
                
                uncached_lats = [latitudes[i] for i in uncached_indices]
                uncached_lngs = [longitudes[i] for i in uncached_indices]
                print(json.dumps({"status": "assigning_zones", "count": len(uncached_indices)}))
                
                assigned_zones = assign_zones_to_records(uncached_lats, uncached_lngs)
                
                # Fill in assigned zones
                for idx, zone in zip(uncached_indices, assigned_zones):
                    zones[idx] = zone
                    
            except ImportError:
                print(json.dumps({"warning": "Zone assigner module not found. Skipping zone assignment."}))
            except Exception as e:
                print(json.dumps({"warning": f"Zone assignment failed: {e}. Skipping zones."}))
        
        df_filtered['Zona'] = zones
        
        # Cache the newly processed records (using ORIGINAL address as key)
        if uncached_indices:
            try:
                from address_cache import cache_multiple_records
                
                new_records = []
                for idx in uncached_indices:
                    lat_val = latitudes[idx]
                    lng_val = longitudes[idx]
                    
                    new_records.append({
                        "original_address": original_addresses[idx],
                        "normalized_address": normalized_addresses[idx],
                        "lat": lat_val if lat_val != '' else None,
                        "lng": lng_val if lng_val != '' else None,
                        "zone": zones[idx]
                    })
                
                cache_multiple_records(new_records)
                print(json.dumps({"status": "cache_updated", "new_records": len(new_records)}))
            except Exception as e:
                print(json.dumps({"warning": f"Failed to cache records: {e}"}))

        # Determine output directory
        output_dir = input_data.get('outputDir')
        
        if output_dir and os.path.isdir(output_dir):
            target_dir = output_dir
        else:
            # Fallback to temp if no valid output dir provided (though frontend should enforce it)
            import tempfile
            target_dir = tempfile.gettempdir()

        filename = os.path.basename(file_path)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        new_filename = f"processed_{timestamp}_{filename}"
        output_path = os.path.join(target_dir, new_filename)

        # Save to Excel file
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
