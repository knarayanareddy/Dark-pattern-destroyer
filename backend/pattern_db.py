# pattern_db.py — Local SQLite Registry & Vision Cache
import sqlite3
import os
import json
import hashlib
from datetime import datetime
from typing import Optional

DB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
DB_PATH = os.path.join(DB_DIR, "patterns.db")

def init_db():
    """Initializes the database schema if it doesn't already exist."""
    # Ensure data directory exists
    os.makedirs(DB_DIR, exist_ok=True)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 1. Table to store user-reported patterns
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reported_patterns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT NOT NULL,
            pattern_type TEXT NOT NULL,
            severity TEXT NOT NULL,
            description TEXT,
            confidence REAL,
            html_context TEXT,
            timestamp TEXT NOT NULL
        )
    """)
    
    # 2. Table to cache multimodal visual AI (Ollama) scan results
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS vision_cache (
            dom_hash TEXT PRIMARY KEY,
            result_json TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )
    """)
    
    conn.commit()
    conn.close()
    print(f"[DPD DB] SQLite database initialized at: {DB_PATH}")

def add_reported_pattern(url: str, pattern_type: str, severity: str, description: str, confidence: float, html_context: str):
    """Saves a reported pattern into the database."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    timestamp = datetime.now().isoformat()
    
    cursor.execute("""
        INSERT INTO reported_patterns (url, pattern_type, severity, description, confidence, html_context, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (url, pattern_type, severity, description, confidence, html_context, timestamp))
    
    conn.commit()
    conn.close()
    print(f"[DPD DB] Recorded reported pattern: {pattern_type} on {url}")

def get_reported_patterns() -> list:
    """Retrieves all reported patterns from the database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM reported_patterns ORDER BY timestamp DESC")
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

def get_cached_vision_result(dom_hash: str) -> Optional[dict]:

    """Checks the local cache for a pre-analyzed visual scan of a DOM node snippet."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT result_json FROM vision_cache WHERE dom_hash = ?", (dom_hash,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        try:
            print(f"[DPD DB] Cache HIT for DOM hash: {dom_hash}")
            return json.loads(row[0])
        except Exception as e:
            print(f"[DPD DB] Failed parsing cached JSON: {e}")
            return None
    return None

def cache_vision_result(dom_hash: str, result: dict):
    """Caches a visual scan result for a DOM node snippet."""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    timestamp = datetime.now().isoformat()
    
    try:
        result_str = json.dumps(result)
        cursor.execute("""
            INSERT OR REPLACE INTO vision_cache (dom_hash, result_json, timestamp)
            VALUES (?, ?, ?)
        """, (dom_hash, result_str, timestamp))
        conn.commit()
        print(f"[DPD DB] Cached vision result for DOM hash: {dom_hash}")
    except Exception as e:
        print(f"[DPD DB] Failed caching vision result: {e}")
    finally:
        conn.close()

def compute_dom_hash(html_context: str) -> str:
    """Utility function to generate a stable MD5 hash from HTML context text."""
    if not html_context:
        return "empty_context"
    # Normalize context slightly by stripping leading/trailing whitespace
    normalized = html_context.strip()
    return hashlib.md5(normalized.encode('utf-8')).hexdigest()
