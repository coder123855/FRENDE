import sqlite3
import json
from datetime import datetime

def view_database():
    """View the database contents"""
    conn = sqlite3.connect('frende.db')
    cursor = conn.cursor()
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    
    print("=== FRENDE DATABASE CONTENTS ===\n")
    
    for table in tables:
        table_name = table[0]
        print(f"📋 TABLE: {table_name}")
        print("-" * 50)
        
        try:
            # Get table schema
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = cursor.fetchall()
            column_names = [col[1] for col in columns]
            
            # Get all data from table
            cursor.execute(f"SELECT * FROM {table_name}")
            rows = cursor.fetchall()
            
            if rows:
                print(f"Columns: {', '.join(column_names)}")
                print(f"Total rows: {len(rows)}")
                print("\nData:")
                
                for i, row in enumerate(rows[:10], 1):  # Show first 10 rows
                    print(f"  {i}. {dict(zip(column_names, row))}")
                
                if len(rows) > 10:
                    print(f"  ... and {len(rows) - 10} more rows")
            else:
                print("  (No data)")
                
        except Exception as e:
            print(f"  Error reading table: {e}")
        
        print("\n")
    
    conn.close()

if __name__ == "__main__":
    view_database()
