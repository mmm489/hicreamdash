"""
upload-to-db.py
Llegeix un fitxer .xls de vendes, extreu la data del contingut,
i puja les dades a la base de dades Neon Postgres via l'API del dashboard.

Us: python scripts/upload-to-db.py <fitxer.xls> [url_base]
  - fitxer.xls: ruta al fitxer de vendes
  - url_base: URL del dashboard (default: https://hicreamdash.vercel.app)
"""

import json
import os
import re
import sys
from datetime import datetime

import pandas as pd
import urllib.request

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
DEFAULT_URL = "https://hicreamdash.vercel.app"

if len(sys.argv) < 2:
    print("Us: python scripts/upload-to-db.py <fitxer.xls> [url_base]")
    print("  fitxer.xls: ruta al fitxer de vendes")
    print(f"  url_base: URL del dashboard (default: {DEFAULT_URL})")
    sys.exit(1)

xls_path = sys.argv[1]
base_url = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_URL

if not os.path.exists(xls_path):
    print(f"ERROR: Fitxer no trobat: {xls_path}")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Categorisation - uses official categories from product_categories.json
# (generated from the TPV "Articles x Departaments Venda" export)
# ---------------------------------------------------------------------------
import json as _json

_CATEGORIES_FILE = os.path.join(os.path.dirname(__file__), "..", "product_categories.json")
try:
    with open(_CATEGORIES_FILE, encoding="utf-8") as _f:
        _cat_data = _json.load(_f)
    # Build two lookups: by codi (preferred) and by exact name
    _CAT_BY_CODI = {info["codi"]: info["categoria"] for info in _cat_data.values()}
    _CAT_BY_NAME = {name: info["categoria"] for name, info in _cat_data.items()}
except Exception as _e:
    print(f"AVIS: no s'ha pogut carregar product_categories.json ({_e})")
    _CAT_BY_CODI, _CAT_BY_NAME = {}, {}


def categorise(name, codi=None):
    """Return official category for a product. Prefers codi match, then name."""
    if codi is not None and codi in _CAT_BY_CODI:
        return _CAT_BY_CODI[codi]
    if name in _CAT_BY_NAME:
        return _CAT_BY_NAME[name]
    # Fallback heuristic for products not in the official list
    n = name.upper()
    if "BATUT" in n: return "BATUTS"
    if any(k in n for k in ["AIGUA","COCA","FANTA","7UP","NESTEA","AQUARIUS","CERVESA","TONICA","CLARA","SPRITE","ZUMO","LIMONADA","REFRESC","KAS","DAMM","COKE","SWEPPES","NESTEA","ESTRELLA","GRANINI"]): return "BEGUDES"
    if any(k in n for k in ["CAFE","CAF\u00c8","CAF\u00c9","TALLAT","CAPUCCINO","LATTE","CORTADO","ESPRESSO","COLA CAO"]): return "CAFES"
    if "CREPE" in n: return "CREPES"
    if "DOGHT" in n or "DOUGHT" in n: return "DOUGHT"
    if any(k in n for k in ["FRAPPE","FRAPUCCINO"]): return "FRAPPES"
    if "SMOOTHIE" in n: return "SMOOTHIE"
    if re.search(r"POT\s+(S|M|L|XL)\b", n) and "IOGURT" not in n: return "GELATS"
    if "CUCURUTXO" in n: return "GELATS"
    if "IOGURT" in n or "YOGURT" in n or "A\u00c7AI" in n: return "FROZZEN IOGURT"
    if "HI POP" in n or "WAFFLE" in n or "SANDWICH" in n: return "HI POP"
    if "ICED" in n: return "ICE DRINKS"
    if any(k in n for k in ["MATCHA","CHAI","MACHA"]): return "ESPECIALITATS"
    if "MAX " in n or "DONUT" in n: return "BERLINES"
    if "XURRO" in n or "XOCOLATA & XURROS" in n: return "XURROS"
    if "INFUSI" in n or "CAMAMILLA" in n: return "INFUSIONS"
    if "ORXATA" in n: return "ORXATA"
    if "SABOR" in n: return "SABORS"
    if "RECETA" in n or "OREO ICE" in n or "COOKIES CREAM" in n: return "RECEPTES"
    if "XIP" in n: return "XIPS"
    if any(k in n for k in ["NUTELLA","TOPPING","NATA","SIROPE","CRISPY","LACASITOS","NUBE","KINDER POLS","LOTUS POLS","OREO POLS","MADUIXA"]): return "TOPPINGS"
    if any(k in n for k in ["SALSA","CREMA","MELMELADA","XOCOLATA","CARAMEL","DOL\u00c7 DE LLET","PISTAXO SALSA"]): return "SALSAS I CREMES"
    return "VARIOS"

# ---------------------------------------------------------------------------
# Parse XLS
# ---------------------------------------------------------------------------
print(f"Llegint: {xls_path}")
df = pd.read_excel(xls_path, header=None)

# Extract dates from file content
date_start = None
date_end = None
for i in range(min(10, len(df))):
    for c in range(8):
        val = str(df.iloc[i, c]) if pd.notna(df.iloc[i, c]) else ""
        m = re.search(r'Data Inicial\s*:\s*(\d{2}/\d{2}/\d{4})', val)
        if m:
            date_start = datetime.strptime(m.group(1), '%d/%m/%Y').strftime('%Y-%m-%d')
        m = re.search(r'Data Final\s*:\s*(\d{2}/\d{2}/\d{4})', val)
        if m:
            date_end = datetime.strptime(m.group(1), '%d/%m/%Y').strftime('%Y-%m-%d')

# Try to get date from filename
basename = os.path.splitext(os.path.basename(xls_path))[0]
m = re.match(r'^(\d{4}-\d{2}-\d{2})$', basename)
if m:
    date_start = m.group(1)
    date_end = m.group(1)

m = re.match(r'^(\d{2})-(\d{2})-(\d{4})$', basename)
if m:
    d = f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
    date_start = d
    date_end = d

if not date_start:
    print("AVIS: No s'ha pogut determinar la data. Usant data d'avui.")
    date_start = datetime.now().strftime('%Y-%m-%d')
    date_end = date_start

print(f"Data detectada: {date_start}" + (f" a {date_end}" if date_end != date_start else ""))

# Extract product rows
rows = []
for i in range(11, len(df)):
    codi = df.iloc[i, 0]
    if pd.isna(codi):
        continue
    codi_str = str(codi).strip()
    if codi_str == "TOTAL" or codi_str.startswith("HI POT"):
        continue
    try:
        codi_int = int(float(codi))
    except (ValueError, TypeError):
        continue

    nom = str(df.iloc[i, 2]).strip() if pd.notna(df.iloc[i, 2]) else ""
    if pd.notna(df.iloc[i, 3]):
        extra = str(df.iloc[i, 3]).strip()
        if extra and extra != "nan":
            nom = nom + " " + extra if nom else extra

    try:
        unitats = int(float(df.iloc[i, 4])) if pd.notna(df.iloc[i, 4]) else 0
    except (ValueError, TypeError):
        unitats = 0
    try:
        imp = float(df.iloc[i, 6]) if pd.notna(df.iloc[i, 6]) else 0.0
    except (ValueError, TypeError):
        imp = 0.0

    if nom:
        rows.append({
            "codi": codi_int,
            "producte": nom,
            "unitats": unitats,
            "import": round(imp, 2),
            "categoria": categorise(nom, codi_int),
        })

print(f"Productes extrets: {len(rows)}")
total_import = sum(r["import"] for r in rows)
total_unitats = sum(r["unitats"] for r in rows)
print(f"Total: {total_import:,.2f} EUR | {total_unitats:,} unitats")

# ---------------------------------------------------------------------------
# Init DB tables (if first time)
# ---------------------------------------------------------------------------
print(f"\nInicialitzant taules a {base_url}...")
try:
    req = urllib.request.Request(f"{base_url}/api/init")
    with urllib.request.urlopen(req, timeout=15) as resp:
        result = json.loads(resp.read())
        print(f"  -> {result.get('message', 'OK')}")
except Exception as e:
    print(f"  -> Avis: {e} (pot ser que les taules ja existeixin)")

# ---------------------------------------------------------------------------
# Upload data
# ---------------------------------------------------------------------------
if date_start == date_end:
    # Single day upload
    dates_to_upload = [date_start]
else:
    # Period - upload for each day (divide evenly)
    from datetime import timedelta
    d_start = datetime.strptime(date_start, '%Y-%m-%d')
    d_end = datetime.strptime(date_end, '%Y-%m-%d')
    num_days = (d_end - d_start).days + 1
    dates_to_upload = [(d_start + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(num_days)]

num_days = len(dates_to_upload)
print(f"\nPujant dades per {num_days} dia(es)...")

for idx, date in enumerate(dates_to_upload):
    # Distribute data across days
    if num_days == 1:
        day_products = rows
    else:
        day_products = []
        for r in rows:
            daily_unitats = max(1, round(r["unitats"] / num_days))
            daily_import = round(r["import"] / num_days, 2)
            # Last day gets remainder
            if idx == num_days - 1:
                already_u = max(1, round(r["unitats"] / num_days)) * (num_days - 1)
                already_i = round(r["import"] / num_days, 2) * (num_days - 1)
                daily_unitats = r["unitats"] - already_u
                daily_import = round(r["import"] - already_i, 2)
            day_products.append({
                "codi": r["codi"],
                "producte": r["producte"],
                "unitats": daily_unitats,
                "import": daily_import,
                "categoria": r["categoria"],
            })

    payload = json.dumps({"date": date, "products": day_products}).encode('utf-8')
    req = urllib.request.Request(
        f"{base_url}/api/upload",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read())
            if idx % 10 == 0 or idx == num_days - 1:
                print(f"  [{idx+1}/{num_days}] {date}: {result.get('products', 0)} productes pujats")
    except Exception as e:
        print(f"  ERROR {date}: {e}")

print(f"\nFet! Dades pujades correctament.")
print(f"Dashboard: {base_url}")
