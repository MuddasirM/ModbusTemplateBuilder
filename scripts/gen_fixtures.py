#!/usr/bin/env python3
"""Generate parity fixtures from the REAL Python implementation.

Run from the repo root (so `argos_modbus_builder` imports). Writes JSON the
TypeScript vitest suite asserts against, locking the port to the oracle.
"""
import json
import os
import sys

import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
import argos_modbus_builder as a  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..",
                   "src", "core", "__tests__", "fixtures")
os.makedirs(OUT, exist_ok=True)

FIELD_DEFAULTS = {f[0]: f[5] for f in a.ARGOS_FIELDS}
VISIBLE = [f[0] for f in a.ARGOS_FIELDS]


def grid_from_df(df):
    return [[None if pd.isna(v) else str(v) for v in row] for row in df.to_numpy()]


def file_cols_of(df):
    hdr = a.detect_header_row(df)
    src = df.iloc[hdr] if hdr >= 0 else df.iloc[0]
    return [str(c).strip() for c in src if not pd.isna(c)]


def prepare_case(grid, file_cols):
    mapping = a.auto_map(file_cols, a.ARGOS_FIELDS)
    defaults = dict(FIELD_DEFAULTS)
    # prepare_rows expects a DataFrame (header=None style)
    df = pd.DataFrame(grid)
    rows = a.prepare_rows(df, mapping, defaults=defaults)
    xml = a.build_xml(rows, "ANPL-AME Template", "1.0")
    return {
        "grid": grid,
        "mapping": mapping,
        "defaults": defaults,
        "rows": rows,
        "xml": xml,
    }


fixtures = {}

# 1) coeff_to_scaling cases
coeff_inputs = ["0.1", "0.01", "0.001", "0.5", "2", "1", "100", "0.3333333",
                "0.142857", "0.25", "0", "", "abc", "3", "0.002", "1000",
                "0.0001", "12345.678"]
fixtures["coeff"] = [
    {"in": c, "scaling": s, "decimals": d}
    for c in coeff_inputs
    for (s, d) in [a.coeff_to_scaling(c)]
]

# 2) parse_hex_addr cases
hex_inputs = ["03E8", "0x3EA", "3F0~3F2", "1000", "FF", "  1a  ", "-10",
              "0xZZ", "", "~", "xyz", "10~20~30"]
fixtures["hex"] = [{"in": h, "out": a.parse_hex_addr(h)} for h in hex_inputs]

# 3) normalize_dtype cases
dt_inputs = ["i16", "U16", "float", "Float", "uint32", "INT16", "weird", "", "s32"]
fixtures["dtype"] = [{"in": d, "out": a.normalize_dtype(d)} for d in dt_inputs]

# 4) auto_map on the sample CSV header
sample_csv = os.path.join(REPO, "sample_register_map.csv")
df_csv = pd.read_csv(sample_csv, header=None, dtype=str)
csv_cols = file_cols_of(df_csv)
fixtures["automap_sample"] = {
    "cols": csv_cols,
    "mapping": a.auto_map(csv_cols, a.ARGOS_FIELDS),
}

# 5) prepare_rows + build_xml for the generic sample CSV
fixtures["prepare_sample_csv"] = prepare_case(grid_from_df(df_csv), csv_cols)

# 6) prepare_rows + build_xml for a synthetic ANPL-format grid
anpl_grid = [
    ["No.", "Name", "Address(0x)", "Attribute", "Coefficient", "Unit"],
    ["1", "Voltage", "03E8", "R", "0.1", "V"],
    ["2", "Current", "0x3EA", "RW", "0.001", "A"],
    ["3", "Reserved", "3EC", "R", "1", "/"],
    ["4", "Power", "3F0~3F2", "R", "2", "kW"],
    [None, None, None, None, None, None],
    ["6", "Ratio", "3F4", "R", "0.3333333", "%"],
]
anpl_cols = file_cols_of(pd.DataFrame(anpl_grid))
fixtures["prepare_anpl"] = prepare_case(anpl_grid, anpl_cols)

# 6b) reader parity: read the real ANPL CSV file the way the app does
anpl_csv = os.path.join(REPO, "web", "public", "sample_anpl_register_map.csv")
df_anpl_file = pd.read_csv(anpl_csv, header=None, dtype=str)
anpl_file_cols = file_cols_of(df_anpl_file)
fixtures["reader_anpl_csv"] = prepare_case(grid_from_df(df_anpl_file), anpl_file_cols)

# 7) round-trip: parse an existing Argos XML, then rebuild
sample_xml_path = os.path.join(REPO, "sample_argos_template.xml")
rows_x, name_x, ver_x = a.parse_argos_xml(sample_xml_path)
with open(sample_xml_path, encoding="utf-8") as fh:
    sample_xml_text = fh.read()
fixtures["roundtrip_xml"] = {
    "input": sample_xml_text,
    "rows": rows_x,
    "name": name_x,
    "version": ver_x,
    "xml_out": a.build_xml(rows_x, name_x, ver_x),
}

# 8) validate_row cases
validate_rows = [
    {"point_name": "", "register_index": "1000"},
    {"point_name": "X", "register_index": ""},
    {"point_name": "X", "register_index": "-1"},
    {"point_name": "X", "register_index": "abc"},
    {"point_name": "X", "register_index": "10", "data_format": "u16"},
    {"point_name": "X", "register_index": "10", "data_format": "U16"},
    {"point_name": "X", "register_index": "10", "register_type": "holding"},
    {"point_name": "X", "register_index": "10", "scaling": "abc"},
    {"point_name": "X", "register_index": "10", "decimals": "10"},
    {"point_name": "X", "register_index": "10", "decimals": "a"},
    {"point_name": "X", "register_index": "10", "min_val": "x", "max_val": "5"},
    {"point_name": "X", "register_index": "10", "scaling": "1.5", "decimals": "3"},
]
fixtures["validate"] = []
for rd in validate_rows:
    full = {f[0]: rd.get(f[0], "") for f in a.ARGOS_FIELDS}
    fixtures["validate"].append({
        "row": full,
        "errors": a.validate_row(full, VISIBLE),
    })

with open(os.path.join(OUT, "parity.json"), "w", encoding="utf-8") as fh:
    json.dump(fixtures, fh, indent=2, ensure_ascii=False)

print("wrote", os.path.join(OUT, "parity.json"))
print("sections:", ", ".join(fixtures.keys()))
