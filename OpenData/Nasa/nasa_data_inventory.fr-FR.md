# Inventaire des données NASA

**Version française.** English version: [`nasa_data_inventory.en-US.md`](nasa_data_inventory.en-US.md).

| | |
|---|---|
| Date de récupération | 1er septembre 2026 |
| Portée | Données ouvertes NASA. Aucun résultat de recherche interne. |
| Sources | PIMS / SAMS (Glenn Research Center), PCoE |

## 1. Emplacements

| Élément | Chemin | Versionné |
|---|---|---|
| Inventaire, version française | `OpenData/Nasa/nasa_data_inventory.fr-FR.md` | oui |
| Inventaire, version anglaise | `OpenData/Nasa/nasa_data_inventory.en-US.md` | oui |
| Script de téléchargement | `OpenData/Nasa/fetch_nasa_data.sh` | oui |
| Données | `data/nasa/` | non, exclu par `.gitignore` ligne 48 |

Le script vérifie sa destination avec `git check-ignore` à chaque exécution et s'arrête si
elle se trouve dans un dépôt sans y être ignorée.

Contrainte de nommage : la règle `data/` du `.gitignore` exclut tout répertoire nommé `data`
à n'importe quelle profondeur.

## 2. État

| Catégorie | Sur disque | Disponible en ligne |
|---|---|---|
| Signal d'accélération | 1 capteur-jour | environ 19 flux par jour, 2000 à 2026 |
| Études de cas du manuel PIMS | 4 | 270 |
| Catalogue d'adresses | complet (270) | 270 |
| Jeux de défauts terrestres PCoE | 0 | 2 |

---

## 3. Contenu de `data/nasa/`

### 3.1 `pad/es20/2024-01-13/`

Journée complète du capteur `es20` le 13 janvier 2024, jour de l'alerte de balourd sur
l'épurateur de CO2 4BCO2 documentée par NASA. Seul jeu de mesures présent sur le disque.

| Propriété | Valeur |
|---|---|
| Capteur | `es20`, SAMS-ES, LAB1P4, ER11B, Seat Track, adjacent au 4BCO2 |
| Période | 13 janvier 2024, journée GMT complète |
| Fichiers | 144 enregistrements de données, 144 en-têtes XML |
| Fréquence d'échantillonnage | 500 Hz |
| Coupure anti-repliement | 204,2 Hz |
| Gain | 8,5 |
| Format | float32 petit-boutiste, 4 colonnes : temps relatif, accélération x, y, z |
| Unité | g |
| Repère | Station Analysis, données déjà pivotées, pas le repère capteur |
| Durée par enregistrement | 10 minutes, 4 799 984 octets |
| Volume total | 660 Mo, mesuré |

Fréquences documentées par NASA pour cette journée : raies étroites de la pompe et de la
soufflante à 64,7 Hz et 66,2 Hz, bande de tiers d'octave 56,230 à 71,838 Hz.

Commande de récupération : `./OpenData/Nasa/fetch_nasa_data.sh pad es20 2024-01-13`.

### 3.2 `pims_case_studies_pdf/`

Études de cas du manuel PIMS au format d'origine. Seuls fichiers contenant les figures :
spectrogrammes journaliers, courbes RMS par axe, tracés de vitesse de rotation.

| Fichier | Taille | sha256 (16) | Pages |
|---|---|---|---|
| `4BCO2_Unbalance_Warning_2024-01-13.pdf` | 39 271 222 o | `bd79ecb736fc7e32` | 5 |
| `AAA_Fan_Signature_2021-09-10.pdf` | 8 555 571 o | `0b7e6c91c60bf230` | 8 |
| `UPA_Belt_Slippage.pdf` | 2 291 835 o | `ae63a7a6771d5595` | 9 |
| `PADprimer.pdf` | 73 378 o | `07b7d8df1cffccd8` | 2 |

### 3.3 `pims_case_studies_text/`

Extraction par `pdftotext -layout`. Texte intégral, figures absentes, légendes conservées.

| Fichier | Taille | Lignes | sha256 (16) | Objet |
|---|---|---|---|---|
| `4BCO2_Unbalance_Warning_2024-01-13.txt` | 24 291 o | 260 | `7d403d2ba81f1279` | Alerte de balourd, épurateur de CO2, 13 janvier 2024 |
| `UPA_Belt_Slippage.txt` | 28 309 o | 345 | `66c3ca142008ebcb` | Glissement de courroie, traitement d'urine, 16 janvier 2019 |
| `AAA_Fan_Signature_2021-09-10.txt` | 22 866 o | 284 | `1c04cc0e5eab99b1` | Signature de ventilateur de rack, 10 septembre 2021 |
| `PADprimer.txt` | 2 406 o | 40 | `3b22705123e08987` | Règles de datation et de raccordement des fichiers PAD |

`PADprimer` spécifie trois règles de lecture :

1. La colonne de temps relatif interne au fichier est à ignorer.
2. L'heure GMT de début du nom de fichier est l'horodatage du premier échantillon. Les
   suivants se déduisent par `t0 + k/fs`, `fs` provenant de l'en-tête.
3. L'heure GMT de fin du nom de fichier est à ignorer.

Le séparateur entre les deux horodatages du nom de fichier est un indicateur de continuité :
`+` indique un enregistrement contigu au précédent, `-` indique une lacune avant celui-ci.

### 3.4 `pad_header_samples/`

En-têtes conservés comme référence de format.

| Fichier | Taille | Capteur | Fréq. éch. | Coupure | Gain | Emplacement |
|---|---|---|---|---|---|---|
| `2022_05_01_...121f03.header` | 903 o | 121f03 | 500 Hz | 200 Hz | 10,0 | LAB1O1, ER2, Lower Z Panel |
| `2024_01_13_...es20.header` | 803 o | es20 | 500 Hz | 204,2 Hz | 8,5 | LAB1P4, ER11B, Seat Track, 4BCO2 |

Champs de l'en-tête XML : `SensorID`, `TimeZero`, `Gain`, `SampleRate`, `CutoffFreq`,
`GData/@format`, `BiasCoeff`, `SensorCoordinateSystem` (position et orientation),
`DataCoordinateSystem` (repère de livraison), `DataQualityMeasure`, `ISSConfiguration`,
`ScaleFactor`.

### 3.5 `catalog/`

| Fichier | Taille | Lignes | sha256 (16) |
|---|---|---|---|
| `pims_handbook_catalog_urls.txt` | 31 458 o | 270 | `3c77fe5a731d7b8d` |

270 adresses de PDF, uniques, publiques.

| Catégorie | Nombre | Objet |
|---|---|---|
| `hb_vib_vehicle` | 122 | Manœuvres, amarrages, rehaussements d'orbite |
| `hb_vib_equipment` | 65 | Machines nommées : ventilateurs, pompes, soufflantes, gyroscopes |
| `hb_vib_crew` | 41 | Activité de l'équipage, tapis de course, sorties extravéhiculaires |
| `hb_qs_vehicle` | 42 | Accélération quasi statique, attitude |

État de lecture des 65 entrées `equipment` : 3 lues, 62 non lues.

---

## 4. Disponible en ligne, non téléchargé

Adresses vérifiées le 1er septembre 2026.

### 4.1 Archive PAD

Racine : `https://gipoc.grc.nasa.gov/pims/pub/pad/`

Arborescence : `year<AAAA>/month<MM>/day<JJ>/<flux>/<début>[+|-]<fin>.<capteur>[.header]`

| Propriété | Valeur |
|---|---|
| Couverture | 2000 à 2026, alimentation continue |
| Flux par jour | environ 19, issus de 7 têtes de capteur |
| Volume par capteur-jour | environ 660 Mo à 500 Hz, mesuré sur `es20` le 13 janvier 2024 |
| Authentification | aucune |

Flux décimés dérivés de chaque tête de capteur :

| Suffixe | Fréquence | Coupure |
|---|---|---|
| aucun | 500 Hz | 200 Hz (204,2 Hz pour SAMS-ES) |
| `006` | 142 Hz | 6 Hz |
| `005` | 34 Hz | 5 Hz |

Les flux suffixés sont filtrés en dessous des raies de machines tournantes.

Têtes de capteur relevées au 13 janvier 2024 : `121f02`, `121f03`, `121f04`, `121f05`,
`121f08` (SAMS-II), `es18`, `es20` (SAMS-ES).

| Campagne | Volume | Objet |
|---|---|---|
| `es20`, 12 et 14 janvier 2024 | environ 1,3 Go | Jours encadrants, conditions de référence |
| `121f02`, 10 septembre 2021 | environ 660 Mo | Ventilateur AAA, corrélé à une télémétrie de vitesse |
| `121f03/04/05/08`, 16 janvier 2019 | environ 2,6 Go | UPA, 4 capteurs, propagation entre modules |

Un lecteur TypeScript de ce format est implémenté et testé dans le module de recherche privé
(`pad.reader.ts`, `pad.archive.ts`, 16 tests).

### 4.2 Jeux de défauts terrestres PCoE

Dépôt : `https://www.nasa.gov/intelligent-systems-division/discovery-and-systems-health/pcoe/pcoe-data-set-repository/`

| Jeu | Origine | Taille | Adresse |
|---|---|---|---|
| Bearings | IMS, Université de Cincinnati | 1 075 597 174 o | `https://phm-datasets.s3.amazonaws.com/NASA/4.+Bearings.zip` |
| FEMTO Bearing | FEMTO-ST, Besançon | non mesurée | `https://phm-datasets.s3.amazonaws.com/NASA/10.+FEMTO+Bearing.zip` |

Essais de roulements jusqu'à la panne, sous 1 g. Conditions d'usage : citer le dépôt et les
donateurs, usage aux risques de l'utilisateur.

### 4.3 Études de cas non lues

62 entrées `equipment`. Sélection d'après les titres, susceptibles de documenter des pannes :

`Vozdukh_SKV_Degraded_2018-09-03`, `Columbus_181.5_Hz_Sudden_Change`,
`LAB_PPA_Speed_Test_2019`, `ANITA-2_Pump_2024-06`, `CIR_Recirculation_Pump_Ops_2024`,
`Control_Moment_Gyroscope_(CMG)_Spindown_and_Spinup`, `Noisy_GLACIER_2019-04-25`,
`4BCO2_2022`, `4BCO2_2023`.

---

## 5. Absences structurelles

Indépendantes de l'état des téléchargements.

| Grandeur | État |
|---|---|
| Courant moteur | Non publié. SAMS ne comporte que des accéléromètres. Aucune analyse MCSA n'a de contrepartie mesurée côté NASA. |
| Vitesse de rotation | Non publiée. Le PDF du ventilateur AAA cite des mesures indépendantes (43 000 puis 25 000 tr/min) sans fournir les séries. |
| Étiquettes de défaut | Aucune. Trois événements documentés, dans les trois NASA conclut ne pas distinguer la panne. |
| Matériel sans balais instrumenté en courant, en orbite | Aucun. Le matériel ISS est sans balais, observé mécaniquement seulement. |

---

## 6. Script de téléchargement

```bash
./OpenData/Nasa/fetch_nasa_data.sh -h
```

| Commande | Effet | Volume |
|---|---|---|
| `list <AAAA-MM-JJ>` | Flux capteurs disponibles ce jour-là | nul |
| `header <capteur> <AAAA-MM-JJ>` | En-têtes seuls | environ 115 Ko |
| `pad <capteur> <AAAA-MM-JJ>` | Journée complète de mesures | environ 660 Mo |
| `catalog` | Liste des 270 PDF du manuel | environ 31 Ko |
| `case <nom.pdf>` | Une étude de cas du manuel | variable |
| `pcoe <bearings\|femto>` | Jeu de roulements terrestre | 1,08 Go pour `bearings` |

| Option | Effet |
|---|---|
| `-d <chemin>` | Racine de destination. Défaut : `data/nasa/`, relatif au dépôt. |
| `-y` | Supprime les confirmations. Requis en usage non interactif. |
| `NASA_DATA_DIR` | Variable d'environnement équivalente à `-d`. |

Comportement : les fichiers déjà complets sont ignorés, les téléchargements interrompus
reprennent, les fichiers `.header` sont récupérés avec les données.

Particularités du serveur PIMS gérées par le script : aucune requête HEAD n'est émise, le
serveur répondant 500 ou 403 sur des chemins qu'il sert en 200 à un GET.

---

## 7. Provenance et conditions

| Serveur | Rôle |
|---|---|
| `gipoc.grc.nasa.gov` | Glenn Research Center, projet PIMS. Archive PAD et manuel. |
| `phm-datasets.s3.amazonaws.com` | Miroir du dépôt PCoE. |

Accès sans authentification, consultés le 1er septembre 2026.

Les œuvres NASA relèvent du domaine public américain (17 U.S.C. § 105). Le jeu PCoE
`bearings` requiert la citation des donateurs : Lee, Qiu, Yu, Lin, et Rexnord Technical
Services, 2007.

L'ancien serveur `pims.grc.nasa.gov` ne résout plus (NXDOMAIN au 1er septembre 2026). Il
reste cité dans la littérature et sur des pages NASA en ligne. Toute récupération fondée sur
cette adresse échoue.
