import re
from datetime import datetime

# Load TLE text from file
with open("Galelio.txt", "r") as f:  # change filename as needed
    lines = [line.strip() for line in f.readlines() if line.strip()]

# Group every 3 lines (name, line1, line2)
tle_blocks = [lines[i:i+3] for i in range(0, len(lines), 3)]

js_entries = []

for block in tle_blocks:
    name = block[0]
    l1 = block[1]
    l2 = block[2]

    norad_id = int(l1[2:7])
    intl_designator = l1[9:17].strip()
    epoch_year = int(l1[18:20])
    epoch_day = float(l1[20:32])
    epoch_year += 2000 if epoch_year < 57 else 1900
    epoch = datetime.strptime(f"{epoch_year} {epoch_day:.6f}", "%Y %j.%f").isoformat()

    mm_dot = float(l1[33:43].strip())
    try:
        mm_ddot = float(f"0.{l1[44:50].strip()}") if "-" not in l1[44:52] else 0.0
    except:
        mm_ddot = 0.0
    try:
        bstar = float(f"{l1[53:59].strip()}e{l1[59:61].strip()}") if "0" not in l1[53:59].strip() else 0.0
    except:
        bstar = 0.0

    inc = float(l2[8:16])
    raan = float(l2[17:25])
    ecc = float("0." + l2[26:33].strip())
    arg_per = float(l2[34:42])
    mean_anom = float(l2[43:51])
    mean_motion = float(l2[52:63])

    js_entries.append(f"""{{
    OBJECT_NAME: "{name}",
    OBJECT_ID: "{intl_designator}",
    EPOCH: "{epoch}",
    MEAN_MOTION: {mean_motion},
    ECCENTRICITY: {round(ecc, 7)},
    INCLINATION: {round(inc, 4)},
    RA_OF_ASC_NODE: {round(raan, 4)},
    ARG_OF_PERICENTER: {round(arg_per, 4)},
    MEAN_ANOMALY: {round(mean_anom, 4)},
    BSTAR: {bstar},
    MEAN_MOTION_DOT: {mm_dot},
    MEAN_MOTION_DDOT: {mm_ddot},
    NORAD_CAT_ID: {norad_id}
}}""")

# Write or print output
with open("galileo_sats.js", "w") as out:
    out.write("export const gpsOMMs = [\n")
    out.write(",\n".join(js_entries))
    out.write("\n];\n")

print("✅ JS file 'galileo_sats.js' written.")