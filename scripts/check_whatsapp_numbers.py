#!/usr/bin/env python3
"""check_whatsapp_numbers.py — Test harness for normalizeFrenchPhoneNumber.
Runs 16 test cases against the frontend implementation (ported to Python).
Exit code 0 if all pass, 1 if any fail.
"""

import re
import sys

def normalize_french_phone(phone):
    """Ported from frontend/src/utils/whatsapp.js line 11-33."""
    if not phone:
        return None
    cleaned = str(phone)
    cleaned = re.sub(r"[\s.\-\(\)\/]", "", cleaned)
    if cleaned.startswith("00"):
        cleaned = "+" + cleaned[2:]
    if cleaned.startswith("+330"):
        cleaned = "+33" + cleaned[4:]
    if cleaned.startswith("330"):
        cleaned = "+33" + cleaned[3:]
    if re.match(r"^0[67]\d{8}$", cleaned):
        cleaned = "+33" + cleaned[1:]
    if re.match(r"^0[1-5]\d{8}$", cleaned):
        cleaned = "+33" + cleaned[1:]
    if re.match(r"^\+33[1-7]\d{8}$", cleaned):
        return cleaned
    return None

TESTS = [
    ("06 12 34 56 78", "+33612345678"),
    ("07.12.34.56.78", "+33712345678"),
    ("+33 6 12 34 56 78", "+33612345678"),
    ("0033612345678", "+33612345678"),
    ("+33(0)612345678", "+33612345678"),  # parentheses
    ("06-12-34-56-78", "+33612345678"),   # dashes
    ("+33612345678", "+33612345678"),      # already international
    ("06 12345678", "+33612345678"),       # single space
    ("0612345678", "+33612345678"),        # raw
    ("+33 7 12 34 56 78", "+33712345678"), # +33 07
    ("0033 6 12 34 56 78", "+33612345678"), # 0033 with space
    ("", None),
    ("abc", None),
    ("+1 415 555 1234", None),
    ("061234567", None),                    # 9 digits
    ("+33(0)6.12.34.56.78", "+33612345678"), # parens + dots
]

failed = 0
for i, (inp, expected) in enumerate(TESTS, 1):
    result = normalize_french_phone(inp)
    status = "PASS" if result == expected else "FAIL"
    if status == "FAIL":
        failed += 1
    print(f"[{status}] #{i:02d} {repr(inp)[:30]:32s} => {result!r:20s} | expected {expected!r}")

print()
if failed == 0:
    print(f"All {len(TESTS)} tests passed.")
    sys.exit(0)
else:
    print(f"{failed}/{len(TESTS)} tests FAILED.")
    sys.exit(1)
