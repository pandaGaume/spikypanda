# 🔧 Electric Motor Vibration Datasets (Downloadable + Licenses)

Curated list of public datasets for electric motor vibration analysis, including direct download links, formats, structure, and license terms.

---

## 1. CWRU – Case Western Reserve University Bearing Dataset

- 🔗 Download:
  - https://engineering.case.edu/bearingdatacenter  
  - Mirror (Kaggle): https://www.kaggle.com/datasets/brjapon/cwru-bearing-datasets
- 📦 Format:
  - `.mat` (MATLAB), sometimes `.csv`
- 📊 Content:
  - Vibration signals (accelerometers)
  - Faults: inner race, outer race, ball
  - Sampling: 12 kHz / 48 kHz
- 🧠 Structure:
  - `.mat` files with time series + metadata
- 📜 License:
  - ⚠️ No explicit open license
  - Academic/research use widely accepted
- ✅ Use cases:
  - Benchmark classification

---

## 2. Paderborn University Bearing Dataset

- 🔗 Download:
  - https://mb.uni-paderborn.de/en/kat/research/bearing-datacenter/data-sets-and-download
- 📦 Format:
  - `.mat`
- 📊 Content:
  - Vibration + motor current
  - Real and artificial bearing faults
- 🧠 Structure:
  - Multichannel signals + labels
- 📜 License:
  - ⚠️ Custom academic license
  - Free for research, registration required
- ✅ Use cases:
  - Industrial ML, multimodal analysis

---

## 3. IMS Bearing Dataset (NASA)

- 🔗 Download:
  - https://ti.arc.nasa.gov/tech/dash/groups/pcoe/prognostic-data-repository/
  - Mirror: https://github.com/RicardoPSLopes/IMS-DATASET
- 📦 Format:
  - `.txt` / ASCII
- 📊 Content:
  - Run-to-failure vibration data
- 🧠 Structure:
  - Time series snapshots (multiple channels)
- 📜 License:
  - US Government work (NASA)
  - Public domain (generally free use)
- ✅ Use cases:
  - Predictive maintenance, RUL

---

## 4. Electric Motor Vibrations Dataset (Kaggle / Zenodo)

- 🔗 Download:
  - https://www.kaggle.com/datasets/amirberenji/electric-motor-vibrations-dataset  
  - https://zenodo.org/records/6473455
- 📦 Format:
  - `.csv`, `.zip`
- 📊 Content:
  - Triaxial vibration
  - Normal + faulty conditions
- 🧠 Structure:
  - Labeled via filenames
- 📜 License:
  - Zenodo: typically **Creative Commons (CC-BY 4.0)** (check record)
  - Kaggle: dataset-specific terms
- ✅ Use cases:
  - ML prototyping

---

## 5. MFPT Bearing Dataset

- 🔗 Download:
  - https://mfpt.org/fault-data-sets/
- 📦 Format:
  - `.mat`
- 📊 Content:
  - Bearing vibration signals
- 🧠 Structure:
  - Simple labeled signals
- 📜 License:
  - ⚠️ No explicit license
  - Intended for research/educational use
- ✅ Use cases:
  - Baseline models

---

## 6. XJTU-SY Bearing Dataset

- 🔗 Download:
  - https://biaowang.tech/xjtu-sy-bearing-datasets/
- 📦 Format:
  - `.mat`, `.csv`
- 📊 Content:
  - High-frequency vibration (~50 kHz)
  - Run-to-failure degradation
- 🧠 Structure:
  - Time series + labels + conditions
- 📜 License:
  - ⚠️ Academic/research use
  - No standardized open license specified
- ✅ Use cases:
  - Deep learning, prognostics

---

## 7. Additional Collection (Multiple datasets)

- 🔗 Download hub:
  - https://github.com/VictorBauler/awesome-bearing-dataset
- 📦 Format:
  - Mixed
- 📊 Content:
  - Aggregated dataset links
- 📜 License:
  - Depends on each dataset
  - GitHub repo itself under MIT License
- ✅ Use cases:
  - Dataset discovery

---

# 📊 Summary

| Dataset | Format | Signals | License | Best Use |
|--------|--------|--------|---------|----------|
| CWRU | .mat | vibration | no clear license | classification |
| Paderborn | .mat | vib + current | academic | industrial ML |
| IMS | .txt | vibration | public domain | predictive maintenance |
| Kaggle Motor | .csv | vibration | CC-BY / Kaggle terms | quick ML |
| MFPT | .mat | vibration | unclear | baseline |
| XJTU-SY | .mat/.csv | vibration | academic | deep learning |

---

# 📌 Notes

- Always verify license before commercial use  
- Many datasets are **research-only by default**
- Prefer:
  - CC-BY / public domain → safest reuse
  - academic datasets → OK for research, limited for industry