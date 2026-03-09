import os
import re
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME")

if not MONGO_URL or not DB_NAME:
    print("Missing MONGO_URL or DB_NAME")
    exit(1)

client = MongoClient(MONGO_URL)
db = client[DB_NAME]

rows = db.budget_rows.find({})
updated_count = 0

# Regex to match dd-mm-yyyy or d-m-yyyy (and also / if user used it)
date_pattern = re.compile(r'^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$')

for row in rows:
    date_str = row.get("date", "")
    match = date_pattern.match(date_str)
    if match:
        day, month, year = match.groups()
        # Ensure two digits
        day = day.zfill(2)
        month = month.zfill(2)
        new_date = f"{year}-{month}-{day}"
        
        db.budget_rows.update_one(
            {"_id": row["_id"]},
            {"$set": {"date": new_date}}
        )
        updated_count += 1
        print(f"Updated {date_str} to {new_date}")

print(f"Migration complete. Updated {updated_count} rows.")
