# NASA Data Inventory

**English version.** Version française : [`nasa_data_inventory.fr-FR.md`](nasa_data_inventory.fr-FR.md).

| | |
|---|---|
| Retrieval date | September 1, 2026 |
| Scope | NASA open data. No internal research findings. |
| Sources | PIMS / SAMS (Glenn Research Center), PCoE |

## 1. Locations

| Item | Path | Versioned |
|---|---|---|
| Inventory, French version | `OpenData/Nasa/nasa_data_inventory.fr-FR.md` | yes |
| Inventory, English version | `OpenData/Nasa/nasa_data_inventory.en-US.md` | yes |
| Download script | `OpenData/Nasa/fetch_nasa_data.sh` | yes |
| Data | `data/nasa/` | no, excluded by `.gitignore` line 48 |

The script checks its destination with `git check-ignore` on every run and stops if the
destination sits inside a repository without being ignored there.

Naming constraint: the `.gitignore` rule `data/` excludes any directory named `data` at any
depth.

## 2. Status

| Category | On disk | Available online |
|---|---|---|
| Acceleration signal | 1 sensor-day | about 19 streams per day, 2000 to 2026 |
| PIMS handbook case studies | 4 | 270 |
| Address catalog | complete (270) | 270 |
| PCoE terrestrial fault datasets | 0 | 2 |

---

## 3. Contents of `data/nasa/`

### 3.1 `pad/es20/2024-01-13/`

Full day from sensor `es20` on January 13, 2024, the day of the 4BCO2 CO2 scrubber unbalance
warning documented by NASA. Only measurement dataset present on disk.

| Property | Value |
|---|---|
| Sensor | `es20`, SAMS-ES, LAB1P4, ER11B, Seat Track, adjacent to 4BCO2 |
| Period | January 13, 2024, full GMT day |
| Files | 144 data records, 144 XML headers |
| Sample rate | 500 Hz |
| Anti-alias cutoff | 204.2 Hz |
| Gain | 8.5 |
| Format | little-endian float32, 4 columns: relative time, acceleration x, y, z |
| Unit | g |
| Frame | Station Analysis, data already rotated, not the sensor frame |
| Record length | 10 minutes, 4,799,984 bytes |
| Total volume | 660 MB, measured |

Frequencies documented by NASA for that day: narrowband pump and blower lines at 64.7 Hz and
66.2 Hz, one-third-octave band 56.230 to 71.838 Hz.

Retrieval command: `./OpenData/Nasa/fetch_nasa_data.sh pad es20 2024-01-13`.

### 3.2 `pims_case_studies_pdf/`

PIMS handbook case studies in their original format. Only files containing the figures:
daily spectrograms, per-axis RMS curves, rotational speed plots.

| File | Size | sha256 (16) | Pages |
|---|---|---|---|
| `4BCO2_Unbalance_Warning_2024-01-13.pdf` | 39,271,222 B | `bd79ecb736fc7e32` | 5 |
| `AAA_Fan_Signature_2021-09-10.pdf` | 8,555,571 B | `0b7e6c91c60bf230` | 8 |
| `UPA_Belt_Slippage.pdf` | 2,291,835 B | `ae63a7a6771d5595` | 9 |
| `PADprimer.pdf` | 73,378 B | `07b7d8df1cffccd8` | 2 |

### 3.3 `pims_case_studies_text/`

Extracted with `pdftotext -layout`. Full text, figures absent, captions preserved.

| File | Size | Lines | sha256 (16) | Subject |
|---|---|---|---|---|
| `4BCO2_Unbalance_Warning_2024-01-13.txt` | 24,291 B | 260 | `7d403d2ba81f1279` | Unbalance warning, CO2 scrubber, January 13, 2024 |
| `UPA_Belt_Slippage.txt` | 28,309 B | 345 | `66c3ca142008ebcb` | Belt slippage, urine processor, January 16, 2019 |
| `AAA_Fan_Signature_2021-09-10.txt` | 22,866 B | 284 | `1c04cc0e5eab99b1` | Rack fan signature, September 10, 2021 |
| `PADprimer.txt` | 2,406 B | 40 | `3b22705123e08987` | PAD timestamping and record-stitching rules |

`PADprimer` specifies three reading rules:

1. The in-file relative time column is to be ignored.
2. The GMT start time in the filename is the timestamp of the first sample. Subsequent
   samples follow from `t0 + k/fs`, with `fs` taken from the header.
3. The GMT stop time in the filename is to be ignored.

The separator between the two filename timestamps is a continuity flag: `+` marks a record
contiguous with the previous one, `-` marks a gap before it.

### 3.4 `pad_header_samples/`

Headers kept as a format reference.

| File | Size | Sensor | Rate | Cutoff | Gain | Location |
|---|---|---|---|---|---|---|
| `2022_05_01_...121f03.header` | 903 B | 121f03 | 500 Hz | 200 Hz | 10.0 | LAB1O1, ER2, Lower Z Panel |
| `2024_01_13_...es20.header` | 803 B | es20 | 500 Hz | 204.2 Hz | 8.5 | LAB1P4, ER11B, Seat Track, 4BCO2 |

XML header fields: `SensorID`, `TimeZero`, `Gain`, `SampleRate`, `CutoffFreq`,
`GData/@format`, `BiasCoeff`, `SensorCoordinateSystem` (position and orientation),
`DataCoordinateSystem` (delivery frame), `DataQualityMeasure`, `ISSConfiguration`,
`ScaleFactor`.

### 3.5 `catalog/`

| File | Size | Lines | sha256 (16) |
|---|---|---|---|
| `pims_handbook_catalog_urls.txt` | 31,458 B | 270 | `3c77fe5a731d7b8d` |

270 PDF addresses, unique, public.

| Category | Count | Subject |
|---|---|---|
| `hb_vib_vehicle` | 122 | Maneuvers, dockings, reboosts |
| `hb_vib_equipment` | 65 | Named machines: fans, pumps, blowers, gyroscopes |
| `hb_vib_crew` | 41 | Crew activity, treadmills, extravehicular activity |
| `hb_qs_vehicle` | 42 | Quasi-steady acceleration, attitude |

Reading status of the 65 `equipment` entries: 3 read, 62 unread.

---

## 4. Available online, not downloaded

Addresses verified September 1, 2026.

### 4.1 PAD archive

Root: `https://gipoc.grc.nasa.gov/pims/pub/pad/`

Tree: `year<YYYY>/month<MM>/day<DD>/<stream>/<start>[+|-]<stop>.<sensor>[.header]`

| Property | Value |
|---|---|
| Coverage | 2000 to 2026, continuously fed |
| Streams per day | about 19, from 7 sensor heads |
| Volume per sensor-day | about 660 MB at 500 Hz, measured on `es20` for January 13, 2024 |
| Authentication | none |

Decimated streams derived from each sensor head:

| Suffix | Rate | Cutoff |
|---|---|---|
| none | 500 Hz | 200 Hz (204.2 Hz for SAMS-ES) |
| `006` | 142 Hz | 6 Hz |
| `005` | 34 Hz | 5 Hz |

The suffixed streams are filtered below rotating-machinery lines.

Sensor heads observed on January 13, 2024: `121f02`, `121f03`, `121f04`, `121f05`, `121f08`
(SAMS-II), `es18`, `es20` (SAMS-ES).

| Campaign | Volume | Subject |
|---|---|---|
| `es20`, January 12 and 14, 2024 | about 1.3 GB | Bracketing days, reference conditions |
| `121f02`, September 10, 2021 | about 660 MB | AAA fan, correlated with speed telemetry |
| `121f03/04/05/08`, January 16, 2019 | about 2.6 GB | UPA, 4 sensors, cross-module propagation |

A TypeScript reader for this format is implemented and tested in the private research module
(`pad.reader.ts`, `pad.archive.ts`, 16 tests).

### 4.2 PCoE terrestrial fault datasets

Repository: `https://www.nasa.gov/intelligent-systems-division/discovery-and-systems-health/pcoe/pcoe-data-set-repository/`

| Dataset | Source | Size | Address |
|---|---|---|---|
| Bearings | IMS, University of Cincinnati | 1,075,597,174 B | `https://phm-datasets.s3.amazonaws.com/NASA/4.+Bearings.zip` |
| FEMTO Bearing | FEMTO-ST, Besancon | not measured | `https://phm-datasets.s3.amazonaws.com/NASA/10.+FEMTO+Bearing.zip` |

Run-to-failure bearing tests under 1g. Terms of use: acknowledge the repository and the
donors, use at your own risk.

### 4.3 Unread case studies

62 `equipment` entries. Title-based selection, likely to document faults:

`Vozdukh_SKV_Degraded_2018-09-03`, `Columbus_181.5_Hz_Sudden_Change`,
`LAB_PPA_Speed_Test_2019`, `ANITA-2_Pump_2024-06`, `CIR_Recirculation_Pump_Ops_2024`,
`Control_Moment_Gyroscope_(CMG)_Spindown_and_Spinup`, `Noisy_GLACIER_2019-04-25`,
`4BCO2_2022`, `4BCO2_2023`.

---

## 5. Structural absences

Independent of download status.

| Quantity | Status |
|---|---|
| Motor current | Not published. SAMS comprises accelerometers only. No MCSA analysis has a measured counterpart on the NASA side. |
| Rotational speed | Not published. The AAA fan PDF cites independent measurements (43,000 then 25,000 RPM) without providing the series. |
| Fault labels | None. Three documented events; in all three NASA concludes it cannot distinguish the fault. |
| Brushless hardware instrumented for current, in orbit | None. ISS hardware is brushless, observed mechanically only. |

---

## 6. Download script

```bash
./OpenData/Nasa/fetch_nasa_data.sh -h
```

| Command | Effect | Volume |
|---|---|---|
| `list <YYYY-MM-DD>` | Sensor streams available that day | none |
| `header <sensor> <YYYY-MM-DD>` | Headers only | about 115 KB |
| `pad <sensor> <YYYY-MM-DD>` | Full day of measurements | about 660 MB |
| `catalog` | List of the 270 handbook PDFs | about 31 KB |
| `case <name.pdf>` | One handbook case study | varies |
| `pcoe <bearings\|femto>` | Terrestrial bearing dataset | 1.08 GB for `bearings` |

| Option | Effect |
|---|---|
| `-d <path>` | Destination root. Default: `data/nasa/`, relative to the repository. |
| `-y` | Suppresses confirmations. Required for non-interactive use. |
| `NASA_DATA_DIR` | Environment variable equivalent to `-d`. |

Behavior: files already complete are skipped, interrupted downloads resume, `.header` files
are fetched alongside the data.

PIMS server characteristic handled by the script: no HEAD request is issued, the server
answering 500 or 403 on paths it serves 200 to a GET.

---

## 7. Provenance and terms

| Server | Role |
|---|---|
| `gipoc.grc.nasa.gov` | Glenn Research Center, PIMS project. PAD archive and handbook. |
| `phm-datasets.s3.amazonaws.com` | PCoE repository mirror. |

Accessed without authentication on September 1, 2026.

NASA works are in the US public domain (17 U.S.C. § 105). The PCoE `bearings` dataset
requires citing the donors: Lee, Qiu, Yu, Lin, and Rexnord Technical Services, 2007.

The former server `pims.grc.nasa.gov` no longer resolves (NXDOMAIN as of September 1, 2026).
It remains cited in the literature and on live NASA pages. Any retrieval based on that
address fails.
