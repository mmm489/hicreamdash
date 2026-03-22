"""
process-sales.py
Llegeix tots els .xls de la carpeta Vendes/ i genera sales.json amb dades diaries.

Format de noms de fitxer:
  - Diari:    2026-03-23.xls        -> data = 2026-03-23
  - Periode:  2026-02-01_2026-03-22.xls -> es divideix entre els dies del periode
  - Sense data: Articles_Venda.xls  -> intenta llegir dates del contingut
"""

import json
import math
import os
import re
import sys
from datetime import datetime, timedelta

import pandas as pd

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_DIR = os.path.dirname(BASE_DIR)
VENDES_DIR = os.path.join(PROJECT_DIR, "Vendes")
DATA_DIR = os.path.join(BASE_DIR, "public", "data")
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(VENDES_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# Categorisation
# ---------------------------------------------------------------------------
def categorise(name):
    n = name.upper()
    if re.search(r"POT\s+(S|M|L|XL)\b", n) and "IOGURT" not in n:
        return "Pots Gelat"
    if "CUCURUTXO" in n or "CUCURUCHO" in n:
        return "Cucurutxos"
    if "WAFFLE" in n:
        return "Waffles"
    if "CREPE" in n or "CREP " in n or n.endswith("CREP"):
        return "Crepes"
    cafe_kw = ["CAFE", "CAFÈ", "TALLAT", "CAPUCCINO", "LATTE", "CORTADO", "ESPRESSO"]
    if any(k in n for k in cafe_kw):
        return "Cafeteria"
    if "XURRO" in n or "CHURRO" in n or "XOCOLATA & XURROS" in n:
        return "Xurros & Xocolata"
    if "IOGURT" in n or "YOGURT" in n:
        return "Iogurts"
    batut_kw = ["BATUT", "SMOOTHIE", "FRAPPE", "FRAPUCCINO", "SHAKE", "GRANIT"]
    if any(k in n for k in batut_kw):
        return "Batuts & Smoothies"
    esp_kw = ["HI POP", "ESTRELLA", "OREO", "KINDER", "DOGHT", "LOTUS",
              "COOKIES", "MIXTO", "MEDITERRANEO", "PISTACHO", "CHAI", "MACHA"]
    if any(k in n for k in esp_kw):
        return "Especialitats"
    beg_kw = ["AIGUA", "COCA", "FANTA", "7UP", "NESTEA", "AQUARIUS",
              "CERVESA", "TONICA", "CLARA", "SPRITE", "ZUMO", "LIMONADA", "REFRESC"]
    if any(k in n for k in beg_kw):
        return "Begudes"
    comp_kw = ["NUTELLA", "TOPPING", "NATA", "SIROPE", "EXTRA", "SUPPLEMENT"]
    if any(k in n for k in comp_kw):
        return "Complements"
    if ("SANDWICH" in n and "WAFFLE" not in n) or "BOCADILLO" in n or "PANINI" in n or "TOSTA" in n:
        return "Menjar"
    past_kw = ["CROISSANT", "PASTIS", "DONUT", "MAGDALENA"]
    if any(k in n for k in past_kw):
        return "Pastisseria"
    if "XOCOLATA" in n:
        return "Xurros & Xocolata"
    return "Altres"

# ---------------------------------------------------------------------------
# Parse XLS file -> list of product rows
# ---------------------------------------------------------------------------
def parse_xls(filepath):
    df = pd.read_excel(filepath, header=None)
    rows = []

    # Try to extract dates from file content
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
            })

    return rows, date_start, date_end

# ---------------------------------------------------------------------------
# Determine date(s) from filename
# ---------------------------------------------------------------------------
def get_dates_from_filename(filename):
    """Returns (date_start, date_end, is_single_day)"""
    base = os.path.splitext(filename)[0]

    # Daily format: 2026-03-23.xls
    m = re.match(r'^(\d{4}-\d{2}-\d{2})$', base)
    if m:
        return m.group(1), m.group(1), True

    # Period format: 2026-02-01_2026-03-22.xls
    m = re.match(r'^(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})$', base)
    if m:
        return m.group(1), m.group(2), False

    # DD-MM-YYYY format: 23-03-2026.xls
    m = re.match(r'^(\d{2})-(\d{2})-(\d{4})$', base)
    if m:
        d = f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
        return d, d, True

    return None, None, False

# ---------------------------------------------------------------------------
# Process all files in Vendes/
# ---------------------------------------------------------------------------
all_daily = {}  # date -> { products: {name: {unitats, import}}, facturacio, unitats }
all_products_global = {}  # name -> {codi, unitats, import, categoria}

xls_files = sorted([f for f in os.listdir(VENDES_DIR) if f.lower().endswith(('.xls', '.xlsx'))])

if not xls_files:
    print("No s'han trobat fitxers .xls a la carpeta Vendes/")
    print(f"Carpeta: {VENDES_DIR}")
    sys.exit(1)

print(f"Trobats {len(xls_files)} fitxers a Vendes/")

for xls_file in xls_files:
    filepath = os.path.join(VENDES_DIR, xls_file)
    print(f"\nProcessant: {xls_file}")

    rows, content_start, content_end = parse_xls(filepath)
    print(f"  -> {len(rows)} productes extrets")

    # Determine dates
    file_start, file_end, is_single = get_dates_from_filename(xls_file)

    # Use filename dates if available, otherwise content dates
    date_start = file_start or content_start
    date_end = file_end or content_end

    if not date_start:
        print(f"  AVIS: No s'ha pogut determinar la data. Usant nom del fitxer com a referencia.")
        date_start = "2026-01-01"
        date_end = "2026-01-01"
        is_single = True

    if is_single or date_start == date_end:
        # Single day - all data goes to this date
        date = date_start
        if date not in all_daily:
            all_daily[date] = {"products": {}, "facturacio": 0, "unitats": 0}

        for r in rows:
            name = r["producte"]
            if name not in all_daily[date]["products"]:
                all_daily[date]["products"][name] = {"codi": r["codi"], "unitats": 0, "import": 0}
            all_daily[date]["products"][name]["unitats"] += r["unitats"]
            all_daily[date]["products"][name]["import"] += r["import"]
            all_daily[date]["facturacio"] += r["import"]
            all_daily[date]["unitats"] += r["unitats"]

        print(f"  -> Data: {date} | {all_daily[date]['facturacio']:.2f} EUR")
    else:
        # Period - distribute evenly across days
        d_start = datetime.strptime(date_start, '%Y-%m-%d')
        d_end = datetime.strptime(date_end, '%Y-%m-%d')
        num_days = (d_end - d_start).days + 1

        print(f"  -> Periode: {date_start} a {date_end} ({num_days} dies)")

        for day_offset in range(num_days):
            date = (d_start + timedelta(days=day_offset)).strftime('%Y-%m-%d')
            if date not in all_daily:
                all_daily[date] = {"products": {}, "facturacio": 0, "unitats": 0}

            for r in rows:
                name = r["producte"]
                daily_unitats = max(1, round(r["unitats"] / num_days))
                daily_import = round(r["import"] / num_days, 2)

                # Last day gets the remainder
                if day_offset == num_days - 1:
                    already_assigned_u = max(1, round(r["unitats"] / num_days)) * (num_days - 1)
                    already_assigned_i = round(r["import"] / num_days, 2) * (num_days - 1)
                    daily_unitats = r["unitats"] - already_assigned_u
                    daily_import = round(r["import"] - already_assigned_i, 2)

                if name not in all_daily[date]["products"]:
                    all_daily[date]["products"][name] = {"codi": r["codi"], "unitats": 0, "import": 0}
                all_daily[date]["products"][name]["unitats"] += daily_unitats
                all_daily[date]["products"][name]["import"] += daily_import
                all_daily[date]["facturacio"] += daily_import
                all_daily[date]["unitats"] += daily_unitats

# ---------------------------------------------------------------------------
# Build output structures
# ---------------------------------------------------------------------------
sorted_dates = sorted(all_daily.keys())
date_start_global = sorted_dates[0]
date_end_global = sorted_dates[-1]
num_days_global = len(sorted_dates)

# Daily summary
daily_summary = []
for date in sorted_dates:
    daily_summary.append({
        "date": date,
        "facturacio": round(all_daily[date]["facturacio"], 2),
        "unitats": all_daily[date]["unitats"],
    })

# Products with daily breakdown
products_by_date = []  # [{date, producte, codi, unitats, import, categoria}]
products_global = {}   # aggregate

for date in sorted_dates:
    for name, data in all_daily[date]["products"].items():
        cat = categorise(name)
        products_by_date.append({
            "date": date,
            "codi": data["codi"],
            "producte": name,
            "unitats": data["unitats"],
            "import": round(data["import"], 2),
            "categoria": cat,
        })

        if name not in products_global:
            products_global[name] = {"codi": data["codi"], "producte": name, "unitats": 0, "import": 0, "categoria": cat}
        products_global[name]["unitats"] += data["unitats"]
        products_global[name]["import"] += data["import"]

# Add preuMig to global products
products_list = []
for p in products_global.values():
    p["import"] = round(p["import"], 2)
    p["preuMig"] = round(p["import"] / p["unitats"], 2) if p["unitats"] > 0 else 0
    products_list.append(p)

products_list.sort(key=lambda x: x["import"], reverse=True)

# Categories
cat_order = [
    "Pots Gelat", "Cucurutxos", "Waffles", "Crepes", "Cafeteria",
    "Xurros & Xocolata", "Iogurts", "Batuts & Smoothies", "Especialitats",
    "Begudes", "Complements", "Menjar", "Pastisseria", "Altres",
]

total_import = sum(p["import"] for p in products_list)
total_unitats = sum(p["unitats"] for p in products_list)

cat_map = {}
for p in products_list:
    c = p["categoria"]
    if c not in cat_map:
        cat_map[c] = {"name": c, "unitats": 0, "import": 0.0}
    cat_map[c]["unitats"] += p["unitats"]
    cat_map[c]["import"] += p["import"]

categories = []
for c in cat_order:
    if c in cat_map:
        entry = cat_map[c]
        entry["import"] = round(entry["import"], 2)
        entry["pctImport"] = round(entry["import"] / total_import * 100, 1) if total_import else 0
        categories.append(entry)

ticket_mig = round(total_import / total_unitats, 2) if total_unitats else 0

# ---------------------------------------------------------------------------
# Build & save sales.json
# ---------------------------------------------------------------------------
sales = {
    "period": {
        "start": date_start_global,
        "end": date_end_global,
        "days": num_days_global,
    },
    "products": products_list,
    "productsByDate": products_by_date,
    "categories": categories,
    "totals": {
        "facturacio": round(total_import, 2),
        "unitats": total_unitats,
        "productes": len(products_list),
        "ticketMig": ticket_mig,
    },
    "daily": daily_summary,
    "dates": sorted_dates,
}

sales_path = os.path.join(DATA_DIR, "sales.json")
with open(sales_path, "w", encoding="utf-8") as f:
    json.dump(sales, f, ensure_ascii=False, indent=2)
print(f"\nSaved {sales_path}")

# Don't overwrite costs.json if it exists
costs_path = os.path.join(DATA_DIR, "costs.json")
if not os.path.exists(costs_path):
    with open(costs_path, "w", encoding="utf-8") as f:
        json.dump([], f, indent=2)
    print(f"Saved {costs_path}")

# Don't overwrite employees.json if it exists
emp_path = os.path.join(DATA_DIR, "employees.json")
if not os.path.exists(emp_path):
    with open(emp_path, "w", encoding="utf-8") as f:
        json.dump({"employees": [], "note": "Afegeix empleats amb nom, salari mensual i hores/setmana"}, f, ensure_ascii=False, indent=2)
    print(f"Saved {emp_path}")

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
print("\n" + "=" * 60)
print(f"RESUM DE VENDES  |  {date_start_global} - {date_end_global}  ({num_days_global} dies)")
print("=" * 60)
print(f"  Facturacio total:  {total_import:>10,.2f} EUR")
print(f"  Unitats venudes:   {total_unitats:>10,}")
print(f"  Productes unics:   {len(products_list):>10,}")
print(f"  Ticket mig:        {ticket_mig:>10,.2f} EUR")
print(f"  Facturacio/dia:    {total_import/max(1,num_days_global):>10,.2f} EUR")
print(f"\n  Dies amb dades:    {num_days_global}")
print(f"  Fitxers processats: {len(xls_files)}")
print()
print(f"  {'Categoria':<22} {'Unitats':>8} {'Import':>10} {'%':>6}")
print(f"  {'-'*22} {'-'*8} {'-'*10} {'-'*6}")
for c in categories:
    print(f"  {c['name']:<22} {c['unitats']:>8,} {c['import']:>10,.2f} {c['pctImport']:>5.1f}%")
print(f"  {'-'*22} {'-'*8} {'-'*10} {'-'*6}")
print(f"  {'TOTAL':<22} {total_unitats:>8,} {total_import:>10,.2f} {'100.0':>5}%")
print()
