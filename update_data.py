# update_data.py

import pandas as pd
import pathlib
import time

# --- SETTINGS ---
# Using relative paths so it works on your computer AND in GitHub Actions
base_path = pathlib.Path(__file__).parent
daily_dir = base_path / "data" / "daily"
base_url = "https://www.ncei.noaa.gov/data/global-historical-climatology-network-daily/access/"
keep_cols = ["DATE", "TMAX", "TMIN", "PRCP", "SNWD", "SNOW"]

# 1. Check if the directory exists
if not daily_dir.exists():
    print(f"Error: {daily_dir} not found. Ensure your folder structure is correct.")
    exit()

# 2. Get all state folders (NC, SC, VA, etc.)
state_folders = [d for d in daily_dir.iterdir() if d.is_dir()]

print(f"Found {len(state_folders)} state directories to process.")

for state_folder in state_folders:
    print(f"\n>>> Updating State: {state_folder.name}")
    
    # 3. Find all station CSVs in this state folder
    station_files = list(state_folder.glob("*.csv"))
    
    for i, file_path in enumerate(station_files, 1):
        station_id = file_path.stem
        
        try:
            # Download the full fresh file (Overwrite method)
            url = f"{base_url}{station_id}.csv"
            new_df = pd.read_csv(url, low_memory=False)
            
            # Clean and filter to your specific columns
            new_df = new_df.reindex(columns=keep_cols)
            
            # Save it back to the same spot
            new_df.to_csv(file_path, index=False)
            print(f"[{i}/{len(station_files)}] Updated {station_id}")
            
            # --- THE RATE LIMITER ---
            # Pause for 1 second between stations to be a good "web citizen"
            time.sleep(1) 
            
        except Exception as e:
            print(f"[{i}/{len(station_files)}] Error updating {station_id}: {e}")

print("\nUpdate complete for all states.")