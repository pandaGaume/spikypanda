# Inventaire des données NASA récupérées

**Date de récupération** : 1er septembre 2026
**Portée** : données ouvertes NASA uniquement. Aucun résultat de recherche interne ici.

## Règle de rangement

Ce document est versionné. **Les données ne le sont pas et ne doivent pas l'être.**

| Quoi | Où |
|---|---|
| Ce document | `OpenData/Nasa/inventaire_donnees_nasa.md` (dans le dépôt) |
| Le script de téléchargement | `OpenData/Nasa/fetch_nasa_data.sh` (dans le dépôt) |
| Toutes les données | `~/Documents/spikypanda-data/microg-nasa/` (hors du dépôt) |

Le script refuse de démarrer si sa destination se trouve dans un dépôt git. La séparation
est donc vérifiée à l'exécution, pas seulement par convention.

Le répertoire de données est un **frère** du dépôt, pas un sous-répertoire. Aucune règle
`.gitignore` ne peut donc l'y faire entrer par accident.

Attention si tu réorganises : la règle `data/` du `.gitignore` (ligne 48) exclut tout
répertoire nommé `data` à n'importe quelle profondeur. Ne pas nommer `data` un
sous-répertoire de `OpenData/`.

## Résumé en une phrase

Nous avons de la **documentation et des métadonnées**, pas des mesures. Zéro octet de
signal d'accélération est actuellement stocké. Tout ce qui suit est soit du texte
descriptif, soit des en-têtes, soit une liste d'adresses.

---

## A. Ce qui est sur le disque

Racine : `~/Documents/spikypanda-data/microg-nasa/`. Total 50,3 Mo.

### A.1 `pims_case_studies_pdf/` : les études de cas d'origine

| Fichier | Taille | sha256 (16) | Pages |
|---|---|---|---|
| `4BCO2_Unbalance_Warning_2024-01-13.pdf` | 39 271 222 o | `bd79ecb736fc7e32` | 5 |
| `AAA_Fan_Signature_2021-09-10.pdf` | 8 555 571 o | `0b7e6c91c60bf230` | 8 |
| `UPA_Belt_Slippage.pdf` | 2 291 835 o | `ae63a7a6771d5595` | 9 |
| `PADprimer.pdf` | 73 378 o | `07b7d8df1cffccd8` | 2 |

Ce sont les seuls fichiers qui contiennent les **figures** : spectrogrammes journaliers,
courbes RMS par axe, tracés de vitesse de rotation. Indispensables pour citer ou reproduire
une figure NASA.

### A.2 `pims_case_studies_text/` : extraits texte

Extraits avec `pdftotext -layout`. Texte intégral, figures perdues, légendes conservées.

| Fichier | Taille | Lignes | sha256 (16) | Contenu |
|---|---|---|---|---|
| `4BCO2_Unbalance_Warning_2024-01-13.txt` | 24 291 o | 260 | `7d403d2ba81f1279` | Alerte de balourd sur l'épurateur de CO2, 13 janvier 2024 |
| `UPA_Belt_Slippage.txt` | 28 309 o | 345 | `66c3ca142008ebcb` | Glissement de courroie du traitement d'urine, 16 janvier 2019 |
| `AAA_Fan_Signature_2021-09-10.txt` | 22 866 o | 284 | `1c04cc0e5eab99b1` | Signature du ventilateur de rack, 10 septembre 2021 |
| `PADprimer.txt` | 2 406 o | 40 | `3b22705123e08987` | Règles NASA de datation et de raccordement des fichiers PAD |

Le `PADprimer` est le document le plus important du lot par rapport à sa taille. Il donne
les trois règles qui rendent une lecture naïve fausse : ignorer la colonne de temps interne,
prendre l'heure GMT du nom de fichier comme référence, ignorer l'heure de fin du nom de
fichier.

### A.3 `pad_header_samples/` : en-têtes réels

Vrais fichiers téléchargés depuis l'archive, pas des reconstitutions. Format XML.

| Fichier | Taille | Capteur | Fréq. éch. | Coupure | Gain | Emplacement |
|---|---|---|---|---|---|---|
| `2022_05_01_...121f03.header` | 903 o | 121f03 | 500 Hz | 200 Hz | 10,0 | LAB1O1, ER2, Lower Z Panel |
| `2024_01_13_...es20.header` | 803 o | es20 | 500 Hz | 204,2 Hz | 8,5 | LAB1P4, ER11B, Seat Track, 4BCO2 |

Le second est l'en-tête du capteur utilisé par NASA le jour de l'alerte 4BCO2.

### A.4 `catalog/` : catalogue complet du manuel PIMS

| Fichier | Taille | Lignes | sha256 (16) |
|---|---|---|---|
| `pims_handbook_catalog_urls.txt` | 31 458 o | 270 | `3c77fe5a731d7b8d` |

270 adresses de PDF, toutes uniques, toutes publiques. Répartition :

| Catégorie | Nombre | Description |
|---|---|---|
| `hb_vib_vehicle` | 122 | Manœuvres, amarrages, rehaussements d'orbite |
| `hb_vib_equipment` | **65** | **Machines nommées : ventilateurs, pompes, soufflantes, gyroscopes** |
| `hb_vib_crew` | 41 | Activité de l'équipage, tapis de course, sorties extravéhiculaires |
| `hb_qs_vehicle` | 42 | Accélération quasi statique, attitude |

Les 65 entrées `equipment` sont la partie utile. Trois ont été lues, 62 ne l'ont pas été.

### A.5 `pad/` : en-têtes de la journée de l'événement 4BCO2

`pad/es20/2024-01-13/` contient les **144 en-têtes XML** de la journée complète, soit tous
les fichiers `.header` du capteur `es20` le jour de l'alerte de balourd. Environ 115 Ko.

Les 144 fichiers de **données** correspondants ne sont pas là (environ 691 Mo). Les en-têtes
suffisent pour vérifier la couverture, les fréquences et la géométrie du capteur avant de
décider de tirer le signal.

Récupérés avec `./fetch_nasa_data.sh header es20 2024-01-13`.

---

## B. Identifié, accessible, mais NON téléchargé

Rien de ce qui suit n'est sur le disque. Les adresses sont vérifiées et fonctionnelles.

### B.1 Données d'accélération PAD (le signal réel)

Racine : `https://gipoc.grc.nasa.gov/pims/pub/pad/`

C'est la seule vraie donnée de mesure de tout le dossier, et nous n'en avons rien.

| Grandeur | Valeur |
|---|---|
| Couverture temporelle | 2000 à 2026, alimentée en continu |
| Format | float32 petit-boutiste, 4 colonnes : temps relatif, accélération x, y, z |
| Unité | g |
| Fréquence | 500 Hz sur les flux non suffixés |
| Taille d'un fichier | 4 799 984 o pour 10 minutes |
| **Volume par capteur et par jour** | **environ 691 Mo** (144 fichiers) |
| Authentification | aucune |

Volumes des campagnes envisagées :

| Campagne | Volume |
|---|---|
| `es20`, 12 au 14 janvier 2024 (événement 4BCO2) | environ 2,1 Go |
| `121f02`, 10 septembre 2021 (ventilateur AAA) | environ 691 Mo |
| `121f03/04/05/08`, 16 janvier 2019 (UPA, 4 capteurs) | environ 2,8 Go |

Vérifié : la couverture est complète sur ces dates (146 enregistrements pour `121f03` le
13 janvier 2024). Un lecteur TypeScript de ce format est écrit et testé dans le module de
recherche privé (`pad.reader.ts`, `pad.archive.ts`, 16 tests).

### B.2 Données de défaut terrestres, NASA PCoE

| Jeu | Origine | Taille | Adresse |
|---|---|---|---|
| Bearings (roulements) | IMS, Université de Cincinnati | 1 075 597 174 o (1,08 Go) | `https://phm-datasets.s3.amazonaws.com/NASA/4.+Bearings.zip` |
| FEMTO Bearing | FEMTO-ST, Besançon | non mesuré | `https://phm-datasets.s3.amazonaws.com/NASA/10.+FEMTO+Bearing.zip` |

Essais de roulements jusqu'à la panne, à 1 g. Conditions d'usage : citer le dépôt et les
donateurs, usage aux risques de l'utilisateur.

### B.3 Les 62 études de cas non lues

Les plus susceptibles de contenir des pannes, d'après leur titre :

`Vozdukh_SKV_Degraded_2018-09-03`, `Columbus_181.5_Hz_Sudden_Change`,
`LAB_PPA_Speed_Test_2019`, `ANITA-2_Pump_2024-06`, `CIR_Recirculation_Pump_Ops_2024`,
`Control_Moment_Gyroscope_(CMG)_Spindown_and_Spinup`, `Noisy_GLACIER_2019-04-25`,
`4BCO2_2022`, `4BCO2_2023` (conditions de référence du même matériel).

### B.4 Scripts de référence PIMS

`binaryToAscii.py` (1 594 o), `padread.m`, `psdexamplescript2.m`. Non téléchargés parce que
notre propre lecteur couvre déjà le format. Utiles seulement pour recouper une lecture.

---

## C. Ce qui n'existe pas

Ce point est structurel, pas un manque de téléchargement.

1. **Aucune donnée de courant moteur chez NASA.** SAMS est un ensemble d'accéléromètres.
   Le manuel PIMS ne publie que de l'accélération. Toute analyse fondée sur le courant
   (MCSA, courant à la fréquence de rotation, courant de quadrature) n'a donc **aucun
   équivalent mesuré côté NASA**, quel que soit le type de moteur.
2. **Aucune télémétrie de vitesse de rotation, sauf une mention.** Le PDF du ventilateur AAA
   cite des mesures de vitesse indépendantes (43 000 puis 25 000 tr/min), mais les séries
   correspondantes ne sont pas publiées avec le manuel.
3. **Aucun jeu étiqueté au sens de l'apprentissage automatique.** Trois événements de panne
   documentés, et dans les trois NASA conclut qu'elle ne distingue pas la panne. Il n'existe
   donc pas d'exemple positif exploitable directement comme étiquette.
4. **Aucun matériel sans balais instrumenté en courant, en orbite.** Le matériel ISS est
   sans balais mais n'est observé que mécaniquement.

---

## D. Comment récupérer ce qui manque

Utiliser `fetch_nasa_data.sh`, à côté de ce document. Il écrit toujours hors du dépôt,
reprend les téléchargements interrompus, ignore les fichiers déjà complets et demande
confirmation avant tout volume important.

```bash
./OpenData/Nasa/fetch_nasa_data.sh --help
```

| Commande | Effet | Volume |
|---|---|---|
| `list 2024-01-13` | Liste les flux capteurs disponibles ce jour-là | nul |
| `header es20 2024-01-13` | Les en-têtes seuls, pour vérifier avant de tirer | ~115 Ko |
| `pad es20 2024-01-13` | Un jour complet de mesures | ~691 Mo |
| `catalog` | Rafraîchit la liste des 270 PDF du manuel | ~31 Ko |
| `case hb_vib_equipment_4BCO2_2022.pdf` | Une étude de cas du manuel | variable |
| `pcoe bearings` | Jeu de roulements terrestre | 1,08 Go |

Destination par défaut : `~/Documents/spikypanda-data/microg-nasa/`. Modifiable avec `-d`
ou la variable d'environnement `NASA_DATA_DIR`. L'option `-y` supprime les confirmations,
nécessaire en usage non interactif.

Le script encapsule les deux pièges du serveur PIMS : aucune requête HEAD (le serveur y
répond 500 ou 403 sur des chemins qu'il sert en 200 à un GET), et récupération des fichiers
`.header` en même temps que les données, puisque la fréquence d'échantillonnage n'est que
dans l'en-tête.

---

## E. Provenance et conditions

Tout provient de deux serveurs NASA publics, sans authentification, consultés le
1er septembre 2026 :

- `gipoc.grc.nasa.gov` (Glenn Research Center, projet PIMS)
- `phm-datasets.s3.amazonaws.com` (miroir du dépôt PCoE)

Les œuvres NASA sont dans le domaine public américain (17 U.S.C. § 105). Le jeu PCoE
roulements demande de citer les donateurs : Lee, Qiu, Yu, Lin, et Rexnord Technical
Services, 2007.

Note importante pour toute reprise : l'ancien serveur `pims.grc.nasa.gov`, cité partout
dans la littérature et sur les pages NASA encore en ligne, **ne résout plus**. Toute
tentative de récupération basée sur cette adresse échouera.
