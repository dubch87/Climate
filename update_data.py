# update_data.py

import pandas as pd
import pathlib
import datetime

# --- SETTINGS ---
# Using relative paths for GitHub Actions
base_path = pathlib.Path(__file__).parent
daily_dir = base_path / "data" / "daily"
base_url = "https://www.ncei.noaa.gov/data/global-historical-climatology-network-daily/access/"
keep_cols = ["DATE", "TMAX", "TMIN", "PRCP", "SNWD", "SNOW"]

# 1. Find all state directories (NC, VA, SC, etc.)
if not daily_dir.exists():
    print("Data directory not found. Please run your initial download script first.")
    exit()

state_dirs = [d for d in daily_dir.iterdir() if d.is_dir()]

for state_folder in state_dirs:
    print(f"\n--- Processing State: {state_folder.name} ---")
    
    # 2. Find all station CSVs in this state folder
    station_files = list(state_folder.glob("*.csv"))
    
    for i, file_path in enumerate(station_files, 1):
        station_id = file_path.stem
        
        try:
            # Overwrite logic (cleaner for GitHub Actions)
            url = f"{base_url}{station_id}.csv"
            new_df = pd.read_csv(url, low_memory=False)
            
            # Keep only the columns you want
            new_df = new_df.reindex(columns=keep_cols)
            
            # Save (Overwrite)
            new_df.to_csv(file_path, index=False)
            print(f"[{i}/{len(station_files)}] Updated {station_id}")
            
        except Exception as e:
            print(f"[{i}/{len(station_files)}] Error updating {station_id}: {e}")

print("\nAll states and stations processed.")