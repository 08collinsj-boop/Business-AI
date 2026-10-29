#!/usr/bin/env python3
"""Focused acceptance against a privately held fictional export; never contacts services."""
import csv, json, sys, tempfile
from pathlib import Path
from qa_export_serializer_20261029 import validate, serialize, csv_cell, SPEC
payload=json.loads(Path(sys.argv[1]).read_text())
validate(payload)
foreign="00000000-0000-4000-8000-000000000099"
checks=[]
def rejected(label, mutate):
    candidate=json.loads(json.dumps(payload))
    mutate(candidate)
    if json.dumps(candidate,sort_keys=True) == json.dumps(payload,sort_keys=True): raise AssertionError("test did not mutate: "+label)
    try: validate(candidate)
    except (ValueError,TypeError,KeyError): checks.append(label)
    else: raise AssertionError("accepted: "+label)
rejected("foreign_envelope", lambda p:p.update(business_id=foreign))
rejected("foreign_customer", lambda p:p["categories"]["colzo_clients"]["rows"][0].update(business_id=foreign))
rejected("foreign_user_acceptance",lambda p:p["categories"]["user_legal_acceptances"]["rows"][0].update(user_id=foreign))
rejected("missing_category", lambda p:p["categories"].pop("bookings"))
rejected("unknown_category", lambda p:p["categories"].update(auth_users={"mode":"data","row_count":0,"rows":[]}))
rejected("count_mismatch", lambda p:p["categories"]["colzo_clients"].update(row_count=2))
rejected("unexpected_password_column",lambda p:p["categories"]["colzo_clients"]["rows"][0].update(password="SYNTHETIC-SENTINEL"))
rejected("restricted_table_payload",lambda p:p["categories"]["marketing_meta_connections"].update(rows=[{"token_ciphertext":"SYNTHETIC-SENTINEL"}],row_count=1))
rejected("nested_secret",lambda p:p["categories"]["business_configurations"]["rows"][0].update(faqs=[{"access_token":"SYNTHETIC-SENTINEL"}]))
rejected("negative_count", lambda p:p["categories"]["actions"].update(row_count=-1))
rejected("boolean_count", lambda p:p["categories"]["actions"].update(row_count=False))
rejected("foreign_business_record",lambda p:p["categories"]["businesses"]["rows"][0].update(id=foreign))
formulas=["=1+1","+SUM(A1)","-1+2","@SUM(A1)"," \t=1","\tformula","\nformula"]
assert all(csv_cell(x).startswith("'") for x in formulas)
with tempfile.TemporaryDirectory() as tmp:
    manifest=serialize(payload,tmp)
    assert json.loads(Path(tmp,"tenant.json").read_text())==payload
    csv_count=0
    for table,section in payload["categories"].items():
        if section["mode"]!="data":continue
        cols=SPEC[table]["columns"]
        with Path(tmp,table+".csv").open(encoding="utf-8-sig",newline="") as f:parsed=list(csv.reader(f))
        assert parsed==[cols]+[[csv_cell(r[c]) for c in cols] for r in section["rows"]]
        csv_count+=1
print(json.dumps({"negative_cases":checks,"formula_cases":len(formulas),"json_roundtrip":True,"csv_tables":csv_count,"data_rows":sum(len(x["rows"]) for x in payload["categories"].values())}))
