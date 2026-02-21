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
            
            # Extract optional geocoding parameters
            country = input_data.get('country', 'Colombia')
            city = input_data.get('city')
            
            if not file_path:
                raise ValueError("No filePath found in input JSON")

            import pandas as pd
            import os
            from datetime import datetime

            # Read the Excel file
            # header=0 implies the first row (index 0) contains column names
            # Force 'Tracking number' to be read as string to prevent scientific notation or float conversions
            df = pd.read_excel(file_path, header=0, dtype={'Tracking number': str})

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

            # Strictly enforce 'Tracking number' as string, replacing 'nan' or empty values with empty strings
            df_filtered['Tracking number'] = df_filtered['Tracking number'].fillna('').astype(str).replace('nan', '')


            # Get original addresses before any processing
            original_addresses = df_filtered['Dirección cliente'].astype(str).tolist()
            
            # Check cache FIRST before any processing (normalization, geocoding, zones)
            try:
                from address_cache import lookup_addresses_in_cache, cache_multiple_records
                
                print(json.dumps({"status": "checking_cache", "count": len(original_addresses)}), flush=True)
                
                # Check cache using ORIGINAL addresses (before normalization)
                cached_results, initial_uncached_indices = lookup_addresses_in_cache(original_addresses)
                
                # Initialize result lists
                normalized_addresses = [''] * len(original_addresses)
                latitudes = [None] * len(original_addresses)
                longitudes = [None] * len(original_addresses)
                zones = [''] * len(original_addresses)
                
                # Identify which indices need processing
                indices_to_normalize = []
                indices_to_geocode = []
                cache_hits = 0
                
                for i, cached in enumerate(cached_results):
                    if cached is not None:
                        # Always use cached normalized address if available
                        norm_addr = cached.get('normalized_address')
                        if norm_addr:
                             normalized_addresses[i] = norm_addr

                        lat = cached.get('lat')
                        lng = cached.get('lng')
                        
                        # Check for valid coordinates
                        if lat is not None and lng is not None and lat != '' and lng != '':
                            # Full valid record found - coordinates from cache
                            latitudes[i] = lat
                            longitudes[i] = lng
                            # Don't use cached zone - will recalculate below to catch new zones
                            cache_hits += 1
                        else:
                            # Missing coordinates
                            if norm_addr:
                                 # Has normalized address, just allow geocoding
                                 indices_to_geocode.append(i)
                            else:
                                 # No normalized address either, full process needed
                                 indices_to_normalize.append(i)
                    else:
                        # Not in cache at all
                        indices_to_normalize.append(i)
                
                print(json.dumps({"status": "cache_lookup_complete", 
                                  "hits": cache_hits, 
                                  "need_normalization": len(indices_to_normalize),
                                  "need_geocoding_only": len(indices_to_geocode)}), flush=True)
                
            except ImportError as ie:
                print(json.dumps({"warning": f"Cache module not found: {ie}. Processing all addresses."}))
                indices_to_normalize = list(range(len(original_addresses)))
                indices_to_geocode = []
                normalized_addresses = [''] * len(original_addresses)
                latitudes = [None] * len(original_addresses)
                longitudes = [None] * len(original_addresses)
                zones = [''] * len(original_addresses)
            except Exception as e:
                print(json.dumps({"warning": f"Cache lookup failed: {e}. Processing all addresses."}))
                indices_to_normalize = list(range(len(original_addresses)))
                indices_to_geocode = []
                normalized_addresses = [''] * len(original_addresses)
                latitudes = [None] * len(original_addresses)
                longitudes = [None] * len(original_addresses)
                zones = [''] * len(original_addresses)

            # Normalize ONLY what needs normalization
            if indices_to_normalize:
                try:
                    from address_normalizer import normalize_addresses as normalize_fn
                    
                    to_normalize_original = [original_addresses[i] for i in indices_to_normalize]
                    print(json.dumps({"status": "normalizing", "count": len(to_normalize_original)}), flush=True)
                    
                    normalized_result = normalize_fn(to_normalize_original)
                    
                    # Update normalized addresses and mark for geocoding
                    for idx, norm_addr in zip(indices_to_normalize, normalized_result):
                        normalized_addresses[idx] = norm_addr
                        indices_to_geocode.append(idx)
                        
                except ImportError:
                    print(json.dumps({"warning": "Address normalizer module not found. Using original addresses."}))
                    for idx in indices_to_normalize:
                        normalized_addresses[idx] = original_addresses[idx]
                        indices_to_geocode.append(idx)
                except Exception as e:
                    print(json.dumps({"warning": f"Address normalization failed: {e}. Using original addresses."}))
                    for idx in indices_to_normalize:
                        normalized_addresses[idx] = original_addresses[idx]
                        indices_to_geocode.append(idx)
            
            # Update DataFrame with normalized addresses (some from cache, some newly normalized)
            df_filtered['Dirección cliente'] = normalized_addresses

            # Sort indices to geocode to restore order (optional but good for consistency)
            indices_to_geocode.sort()

            # Geocode everything in indices_to_geocode (partials + newly normalized)
            if indices_to_geocode:
                # Check for API Key
                from dotenv import load_dotenv
                load_dotenv()
                
                api_key = os.getenv("GOOGLE_MAPS_API_KEY")
                if not api_key:
                    raise ValueError("GOOGLE_MAPS_API_KEY not found in environment variables. Please check your .env file.")

                try:
                    from address_geocoder import geocode_addresses
                    
                    # Use normalized addresses for geocoding
                    to_geocode_normalized = [normalized_addresses[i] for i in indices_to_geocode]
                    print(json.dumps({"status": "geocoding", "count": len(to_geocode_normalized)}), flush=True)
                    
                    # Pass the extracted country and city to the geocoder
                    geocoded_coords = geocode_addresses(
                        to_geocode_normalized, 
                        country=country, 
                        city=city
                    )
                    
                    # Fill in geocoded coordinates
                    for idx, coord in zip(indices_to_geocode, geocoded_coords):
                        latitudes[idx] = coord.get('lat', '')
                        longitudes[idx] = coord.get('lng', '')
                        
                except ImportError:
                    print(json.dumps({"warning": "Address geocoder module not found. Skipping geocoding."}))
                except Exception as e:
                    print(json.dumps({"warning": f"Geocoding failed: {e}. Skipping coordinates."}))
        
            df_filtered['Latitud'] = latitudes
            df_filtered['Longitud'] = longitudes
    
            # Assign zones to ALL records with valid coordinates (including cached ones)
            # This ensures that if zones.json is updated, cached records get new zones
            indices_with_coords = [
                i for i in range(len(latitudes))
                if latitudes[i] is not None and latitudes[i] != '' and 
                   longitudes[i] is not None and longitudes[i] != ''
            ]
            
            indices_processed = indices_to_geocode  # Track which were newly geocoded
        
            if indices_with_coords:
                try:
                    from zone_assigner import assign_zones_to_records
                    
                    coords_lats = [latitudes[i] for i in indices_with_coords]
                    coords_lngs = [longitudes[i] for i in indices_with_coords]
                    print(json.dumps({"status": "assigning_zones", "count": len(indices_with_coords)}), flush=True)
                    
                    assigned_zones = assign_zones_to_records(coords_lats, coords_lngs)
                    
                    # Fill in assigned zones for ALL records with coordinates
                    for idx, zone in zip(indices_with_coords, assigned_zones):
                        zones[idx] = zone
                        
                except ImportError:
                    print(json.dumps({"warning": "Zone assigner module not found. Skipping zone assignment."}))
                except Exception as e:
                    print(json.dumps({"warning": f"Zone assignment failed: {e}. Skipping zones."}))
            
            df_filtered['Zona'] = zones
            
            # Cache ALL valid records (not just newly processed ones)
        # This ensures that records from cache also get updated with tracking_number and cliente
            try:
                from address_cache import cache_multiple_records
                
                # Get tracking numbers and clientes from DataFrame
                tracking_numbers = df_filtered['Tracking number'].astype(str).tolist()
                clientes = df_filtered['Cliente'].astype(str).tolist()
                
                # Find all records with valid data (coordinates and zone)
                records_to_cache = []
                for idx in range(len(original_addresses)):
                    lat_val = latitudes[idx]
                    lng_val = longitudes[idx]
                    
                    # Only cache if we have valid coordinates
                    if lat_val is not None and lng_val is not None and lat_val != '' and lng_val != '':
                        records_to_cache.append({
                            "original_address": original_addresses[idx],
                            "normalized_address": normalized_addresses[idx],
                            "lat": lat_val,
                            "lng": lng_val,
                            "zone": zones[idx],
                            "tracking_number": tracking_numbers[idx],
                            "cliente": clientes[idx]
                        })
                
                if records_to_cache:
                    cache_multiple_records(records_to_cache)
                    print(json.dumps({
                        "status": "cache_updated", 
                        "new_records": len([i for i in indices_processed]) if indices_processed else 0,
                        "total_cached": len(records_to_cache)
                    }), flush=True)
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
    
            # Save to Excel file (Master file)
            df_filtered.to_excel(output_path, index=False)
    
            # Helper function to format Excel column as 'Texto'
            def format_excel_column_text(file_path):
                try:
                    import openpyxl
                    wb = openpyxl.load_workbook(file_path)
                    ws = wb.active
                    tracking_col_idx = None
                    # Let's find exactly the 'Tracking number' column looking at header (row 1)
                    for col_idx, cell in enumerate(ws[1], 1):
                        if cell.value == 'Tracking number':
                            tracking_col_idx = col_idx
                            break
                            
                    if tracking_col_idx:
                        # Set format Code '@' (Excel Text Format) for all rows in this column
                        for row in range(2, ws.max_row + 1):
                            cell = ws.cell(row=row, column=tracking_col_idx)
                            cell.number_format = '@'
                        
                    wb.save(file_path)
                except Exception as e:
                    # Silently skip if formatting fails so it doesn't break the main flow
                    pass
    
            # Apply formatting to master file
            format_excel_column_text(output_path)

            # Process and save individual files for each zone
            # Get unique zones
            unique_zones = df_filtered['Zona'].unique()
    
            # Check if there are any valid zones (non-empty, non-NaN)
            # If all records have no zone, we skip creating the 'Sin Zona' folder
            valid_zones_exist = any(not pd.isna(z) and str(z).strip() != "" for z in unique_zones)
    
            if valid_zones_exist:
                for zone in unique_zones:
                    # Handle empty/NaN zones
                    if pd.isna(zone) or zone == "":
                        zone_name = "Sin Zona"
                        # Filter either NaN or empty string
                        zone_df = df_filtered[df_filtered['Zona'].isna() | (df_filtered['Zona'] == "")]
                    else:
                        zone_name = str(zone).strip()
                        # Remove invalid characters for directory names
                        safe_zone_name = "".join([c for c in zone_name if c.isalnum() or c in (' ', '-', '_')]).strip()
                        if not safe_zone_name:
                            safe_zone_name = "Unnamed_Zone"
                        zone_name = safe_zone_name
                        zone_df = df_filtered[df_filtered['Zona'] == zone]
                    
                    # Create zone directory
                    zone_dir = os.path.join(target_dir, zone_name)
                    if not os.path.exists(zone_dir):
                        os.makedirs(zone_dir)
                    
                    # Define output path for this zone
                    # Use the zone name + timestamp as filename
                    zone_timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    zone_filename = f"{zone_name}_{zone_timestamp}.xlsx"
                    zone_output_path = os.path.join(zone_dir, zone_filename)
                    
                    # Save the zone-specific DataFrame
                    zone_df.to_excel(zone_output_path, index=False)
                    # Apply formatting to zone file
                    format_excel_column_text(zone_output_path)
                
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
        
    print(json.dumps(result), flush=True)
    sys.exit(0)

if __name__ == "__main__":
    main()
