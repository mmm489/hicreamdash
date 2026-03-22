"""
process-sales.py
Reads Articles_Venda.xls and produces sales.json, costs.json, employees.json
for the gelateria dashboard.
"""

import json
import math
import os
import re
import sys

import pandas as pd

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # dashboard/
PROJECT_DIR = os.path.dirname(BASE_DIR)  # cLAUDE/
XLS_PATH = os.path.join(PROJECT_DIR, "Articles_Venda.xls")
DATA_DIR = os.path.join(BASE_DIR, "public", "data")
os.makedirs(DATA_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# Period info
# ---------------------------------------------------------------------------
PERIOD_START = "2026-02-01"
PERIOD_END = "2026-03-22"
PERIOD_DAYS = 50

# ---------------------------------------------------------------------------
# Read XLS
# ---------------------------------------------------------------------------
df = pd.read_excel(XLS_PATH, header=None)

# Extract data rows: start at row 11, skip blanks and TOTAL
rows = []
for i in range(11, len(df)):
    codi = df.iloc[i, 0]
    # Skip NaN / empty rows
    if pd.isna(codi):
        continue
    # Skip TOTAL row and disclaimer
    codi_str = str(codi).strip()
    if codi_str == "TOTAL" or codi_str.startswith("HI POT"):
        continue
    # Parse fields
    try:
        codi_int = int(float(codi))
    except (ValueError, TypeError):
        continue

    nom = str(df.iloc[i, 2]).strip() if pd.notna(df.iloc[i, 2]) else ""
    # Handle case where description spills into col 3
    if pd.notna(df.iloc[i, 3]):
        extra = str(df.iloc[i, 3]).strip()
        if extra and extra != "nan":
            nom = nom + " " + extra if nom else extra

    unitats_raw = df.iloc[i, 4]
    import_raw = df.iloc[i, 6]

    try:
        unitats = int(float(unitats_raw)) if pd.notna(unitats_raw) else 0
    except (ValueError, TypeError):
        unitats = 0
    try:
        imp = float(import_raw) if pd.notna(import_raw) else 0.0
    except (ValueError, TypeError):
        imp = 0.0

    if nom:
        rows.append({
            "codi": codi_int,
            "producte": nom,
            "unitats": unitats,
            "import": round(imp, 2),
        })

print(f"Extracted {len(rows)} product rows from XLS")

# ---------------------------------------------------------------------------
# Categorisation
# ---------------------------------------------------------------------------
def categorise(name: str) -> str:
    n = name.upper()

    # Pots Gelat (exclude POT IOGURT)
    if re.search(r"POT\s+(S|M|L|XL)\b", n) and "IOGURT" not in n:
        return "Pots Gelat"

    # Cucurutxos
    if "CUCURUTXO" in n or "CUCURUCHO" in n:
        return "Cucurutxos"

    # Waffles
    if "WAFFLE" in n:
        return "Waffles"

    # Crepes
    if "CREPE" in n or "CREP " in n or n.endswith("CREP"):
        return "Crepes"

    # Cafeteria
    cafe_kw = ["CAFE", "CAFÈ", "TALLAT", "CAPUCCINO", "LATTE", "CORTADO", "ESPRESSO"]
    if any(k in n for k in cafe_kw):
        return "Cafeteria"

    # Xurros & Xocolata
    if "XURRO" in n or "CHURRO" in n or "XOCOLATA & XURROS" in n:
        return "Xurros & Xocolata"

    # Iogurts
    if "IOGURT" in n or "YOGURT" in n:
        return "Iogurts"

    # Batuts & Smoothies
    batut_kw = ["BATUT", "SMOOTHIE", "FRAPPE", "FRAPUCCINO", "SHAKE", "GRANIT"]
    if any(k in n for k in batut_kw):
        return "Batuts & Smoothies"

    # Especialitats
    esp_kw = ["HI POP", "ESTRELLA", "OREO", "KINDER", "DOGHT", "LOTUS",
              "COOKIES", "MIXTO", "MEDITERRANEO", "PISTACHO", "CHAI", "MACHA"]
    if any(k in n for k in esp_kw):
        return "Especialitats"

    # Begudes
    beg_kw = ["AIGUA", "COCA", "FANTA", "7UP", "NESTEA", "AQUARIUS",
              "CERVESA", "TONICA", "CLARA", "SPRITE", "ZUMO", "LIMONADA", "REFRESC"]
    if any(k in n for k in beg_kw):
        return "Begudes"

    # Complements
    comp_kw = ["NUTELLA", "TOPPING", "NATA", "SIROPE", "EXTRA", "SUPPLEMENT"]
    if any(k in n for k in comp_kw):
        return "Complements"

    # Menjar (exclude SANDWICH WAFFLE)
    if ("SANDWICH" in n and "WAFFLE" not in n) or "BOCADILLO" in n or "PANINI" in n or "TOSTA" in n:
        return "Menjar"

    # Pastisseria
    past_kw = ["CROISSANT", "PASTIS", "DONUT", "MAGDALENA"]
    if any(k in n for k in past_kw):
        return "Pastisseria"

    # Xocolata standalone (if not caught by xurros)
    if "XOCOLATA" in n:
        return "Xurros & Xocolata"

    return "Altres"


for r in rows:
    r["categoria"] = categorise(r["producte"])
    r["preuMig"] = round(r["import"] / r["unitats"], 2) if r["unitats"] > 0 else 0.0

# ---------------------------------------------------------------------------
# Category aggregation
# ---------------------------------------------------------------------------
cat_order = [
    "Pots Gelat", "Cucurutxos", "Waffles", "Crepes", "Cafeteria",
    "Xurros & Xocolata", "Iogurts", "Batuts & Smoothies", "Especialitats",
    "Begudes", "Complements", "Menjar", "Pastisseria", "Altres",
]

total_import = sum(r["import"] for r in rows)
total_unitats = sum(r["unitats"] for r in rows)

cat_map = {}
for r in rows:
    c = r["categoria"]
    if c not in cat_map:
        cat_map[c] = {"name": c, "unitats": 0, "import": 0.0}
    cat_map[c]["unitats"] += r["unitats"]
    cat_map[c]["import"] += r["import"]

categories = []
for c in cat_order:
    if c in cat_map:
        entry = cat_map[c]
        entry["import"] = round(entry["import"], 2)
        entry["pctImport"] = round(entry["import"] / total_import * 100, 1) if total_import else 0
        categories.append(entry)

# ---------------------------------------------------------------------------
# Totals
# ---------------------------------------------------------------------------
ticket_mig = round(total_import / total_unitats, 2) if total_unitats else 0
totals = {
    "facturacio": round(total_import, 2),
    "unitats": total_unitats,
    "productes": len(rows),
    "ticketMig": ticket_mig,
}

# ---------------------------------------------------------------------------
# Daily placeholder (single period for now)
# ---------------------------------------------------------------------------
daily = [
    {
        "date": PERIOD_START,
        "facturacio": round(total_import, 2),
        "unitats": total_unitats,
    }
]

# ---------------------------------------------------------------------------
# Build & save sales.json
# ---------------------------------------------------------------------------
sales = {
    "period": {"start": PERIOD_START, "end": PERIOD_END, "days": PERIOD_DAYS},
    "products": rows,
    "categories": categories,
    "totals": totals,
    "daily": daily,
}

sales_path = os.path.join(DATA_DIR, "sales.json")
with open(sales_path, "w", encoding="utf-8") as f:
    json.dump(sales, f, ensure_ascii=False, indent=2)
print(f"Saved {sales_path}")

# ---------------------------------------------------------------------------
# costs.json (empty)
# ---------------------------------------------------------------------------
costs_path = os.path.join(DATA_DIR, "costs.json")
with open(costs_path, "w", encoding="utf-8") as f:
    json.dump([], f, indent=2)
print(f"Saved {costs_path}")

# ---------------------------------------------------------------------------
# employees.json (placeholder)
# ---------------------------------------------------------------------------
emp_path = os.path.join(DATA_DIR, "employees.json")
with open(emp_path, "w", encoding="utf-8") as f:
    json.dump({
        "employees": [],
        "note": "Afegeix empleats amb nom, salari mensual i hores/setmana"
    }, f, ensure_ascii=False, indent=2)
print(f"Saved {emp_path}")

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
print("\n" + "=" * 60)
print("RESUM DE VENDES  |  01/02/2026 - 22/03/2026  (50 dies)")
print("=" * 60)
print(f"  Facturacio total:  {totals['facturacio']:>10,.2f} EUR")
print(f"  Unitats venudes:   {totals['unitats']:>10,}")
print(f"  Productes unics:   {totals['productes']:>10,}")
print(f"  Ticket mig:        {totals['ticketMig']:>10,.2f} EUR")
print(f"  Facturacio/dia:    {totals['facturacio']/PERIOD_DAYS:>10,.2f} EUR")
print()
print(f"  {'Categoria':<22} {'Unitats':>8} {'Import':>10} {'%':>6}")
print(f"  {'-'*22} {'-'*8} {'-'*10} {'-'*6}")
for c in categories:
    print(f"  {c['name']:<22} {c['unitats']:>8,} {c['import']:>10,.2f} {c['pctImport']:>5.1f}%")
print(f"  {'-'*22} {'-'*8} {'-'*10} {'-'*6}")
print(f"  {'TOTAL':<22} {total_unitats:>8,} {total_import:>10,.2f} {'100.0':>5}%")
print()
