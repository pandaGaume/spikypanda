#!/usr/bin/env bash
#
# Téléchargement à la demande des données ouvertes NASA (PIMS/SAMS et PCoE).
#
# Les données ne doivent jamais atterrir dans le dépôt. Ce script écrit
# systématiquement dans $NASA_DATA_DIR, qui est un frère du dépôt, et refuse
# de démarrer si la destination se trouve à l'intérieur d'un dépôt git.
#
# Deux pièges du serveur PIMS, tous deux contournés ici :
#   - il répond 500 ou 403 aux requêtes HEAD sur des chemins qu'il sert en 200
#     à un GET, donc aucune vérification de ce script n'utilise HEAD ;
#   - l'ancien hôte pims.grc.nasa.gov ne résout plus, il faut gipoc.grc.nasa.gov.
#
# Voir inventaire_donnees_nasa.md pour les formats, volumes et provenance.

set -euo pipefail

PAD_ROOT="https://gipoc.grc.nasa.gov/pims/pub/pad"
HANDBOOK_ROOT="https://gipoc.grc.nasa.gov/pims/pimsdocs/public/ISS%20Handbook"
HANDBOOK_INDEX="https://gipoc.grc.nasa.gov/wp/pims/handbook/"
PCOE_ROOT="https://phm-datasets.s3.amazonaws.com/NASA"

DEST_ROOT="${NASA_DATA_DIR:-$HOME/Documents/spikypanda-data/microg-nasa}"
ASSUME_YES=0

usage() {
    cat <<'USAGE'
Usage : fetch_nasa_data.sh [-y] [-d DEST] <commande> [arguments]

Commandes
  list <AAAA-MM-JJ>              Liste les flux capteurs disponibles ce jour-là
  pad <capteur> <AAAA-MM-JJ>     Un jour de mesures pour un capteur (~691 Mo à 500 Hz)
  header <capteur> <AAAA-MM-JJ>  Les en-têtes XML seuls, sans les données (~150 Ko)
  catalog                        Rafraîchit la liste des 270 PDF du manuel PIMS
  case <nom>                     Une étude de cas du manuel, par nom de fichier
  pcoe <bearings|femto>          Un jeu de défauts terrestres PCoE (1,08 Go pour bearings)

Options
  -y        Ne pas demander de confirmation avant les téléchargements volumineux
  -d DEST   Racine de destination (défaut : $NASA_DATA_DIR ou ~/Documents/spikypanda-data/microg-nasa)

Exemples
  ./fetch_nasa_data.sh list 2024-01-13
  ./fetch_nasa_data.sh header es20 2024-01-13
  ./fetch_nasa_data.sh pad es20 2024-01-13
  ./fetch_nasa_data.sh case hb_vib_equipment_4BCO2_2022.pdf
  ./fetch_nasa_data.sh pcoe bearings

Les fichiers déjà présents et complets sont ignorés, les téléchargements
interrompus reprennent où ils en étaient.
USAGE
}

die() { echo "erreur : $*" >&2; exit 1; }

# Refuse toute destination située dans un dépôt git : les données restent locales.
guard_destination() {
    mkdir -p "$DEST_ROOT"
    local resolved
    resolved="$(cd "$DEST_ROOT" && pwd -P)"
    if git -C "$resolved" rev-parse --show-toplevel >/dev/null 2>&1; then
        die "la destination $resolved est dans le dépôt git $(git -C "$resolved" rev-parse --show-toplevel). Les données doivent rester hors du dépôt."
    fi
}

confirm() {
    [ "$ASSUME_YES" -eq 1 ] && return 0
    local answer=""
    printf '%s [o/N] ' "$1"
    # Le terminal d'abord, l'entrée standard ensuite. Sans aucun des deux, on
    # refuse : un téléchargement de plusieurs gigaoctets ne démarre pas tout seul.
    if ! read -r answer </dev/tty 2>/dev/null && ! read -r answer 2>/dev/null; then
        echo
        echo "  (pas de terminal interactif : utiliser -y pour confirmer d'avance)"
        return 1
    fi
    case "$answer" in [oOyY]*) return 0 ;; *) return 1 ;; esac
}

# Répertoire d'archive d'un flux : sams2 pour les têtes 121fNN, samses pour esNN.
stream_directory() {
    case "$1" in es*) echo "samses_accel_$1" ;; *) echo "sams2_accel_$1" ;; esac
}

# URL du répertoire jour d'un flux, à partir d'une date AAAA-MM-JJ.
day_url() {
    local sensor="$1" date="$2"
    [[ "$date" =~ ^([0-9]{4})-([0-9]{2})-([0-9]{2})$ ]] || die "date invalide \"$date\", format attendu AAAA-MM-JJ"
    echo "$PAD_ROOT/year${BASH_REMATCH[1]}/month${BASH_REMATCH[2]}/day${BASH_REMATCH[3]}/$(stream_directory "$sensor")/"
}

# Noms de fichiers PAD d'un répertoire jour. GET uniquement, jamais HEAD.
list_records() {
    curl -fsSL --max-time 120 "$1" \
        | grep -oE 'href="[0-9]{4}_[0-9]{2}_[0-9]{2}_[^"]*"' \
        | sed 's/^href="//; s/"$//' \
        | sort -u
}

# Télécharge une URL vers un fichier, en reprenant si le fichier est partiel.
fetch_to() {
    local url="$1" out="$2"
    mkdir -p "$(dirname "$out")"
    curl -fsSL --retry 3 --retry-delay 2 --max-time 1800 -C - -o "$out" "$url" \
        || curl -fsSL --retry 3 --retry-delay 2 --max-time 1800 -o "$out" "$url"
}

cmd_list() {
    local date="${1:?date manquante, format AAAA-MM-JJ}"
    [[ "$date" =~ ^([0-9]{4})-([0-9]{2})-([0-9]{2})$ ]] || die "date invalide \"$date\""
    local url="$PAD_ROOT/year${BASH_REMATCH[1]}/month${BASH_REMATCH[2]}/day${BASH_REMATCH[3]}/"
    echo "Flux disponibles le $date :"
    curl -fsSL --max-time 120 "$url" \
        | grep -oE 'href="(sams2|samses)_accel_[^"/]*/"' \
        | sed 's/^href="//; s#/"$##; s/^sams2_accel_//; s/^samses_accel_//' \
        | sort -u | sed 's/^/  /'
    echo
    echo "Les flux suffixés 005 et 006 sont décimés (34 Hz / 5 Hz et 142 Hz / 6 Hz)."
    echo "Pour des signatures de machines tournantes, prendre le flux non suffixé."
}

cmd_header() {
    local sensor="${1:?capteur manquant}" date="${2:?date manquante}"
    local url dest count=0
    url="$(day_url "$sensor" "$date")"
    dest="$DEST_ROOT/pad/$sensor/$date"
    echo "En-têtes de $sensor le $date -> $dest"
    while read -r f; do
        case "$f" in *.header) ;; *) continue ;; esac
        [ -s "$dest/$f" ] && { count=$((count + 1)); continue; }
        fetch_to "$url$f" "$dest/$f"
        count=$((count + 1))
    done < <(list_records "$url")
    [ "$count" -eq 0 ] && die "aucun en-tête trouvé (capteur ou date sans couverture ?)"
    echo "$count en-têtes."
}

cmd_pad() {
    local sensor="${1:?capteur manquant}" date="${2:?date manquante}"
    local url dest records total data_count
    url="$(day_url "$sensor" "$date")"
    dest="$DEST_ROOT/pad/$sensor/$date"
    records="$(list_records "$url")" || die "répertoire introuvable : $url"
    [ -z "$records" ] && die "aucun enregistrement pour $sensor le $date"

    total="$(echo "$records" | wc -l)"
    data_count="$(echo "$records" | grep -cv '\.header$' || true)"
    echo "Capteur $sensor, $date : $total fichiers dont $data_count de données."
    echo "Volume estimé à 500 Hz : environ $((data_count * 48 / 10)) Mo."
    echo "Destination : $dest"
    confirm "Télécharger ?" || { echo "abandon."; return 0; }

    local done=0
    while read -r f; do
        [ -n "$f" ] || continue
        if [ -s "$dest/$f" ]; then done=$((done + 1)); continue; fi
        fetch_to "$url$f" "$dest/$f"
        done=$((done + 1))
        printf '\r  %d/%d' "$done" "$total"
    done <<< "$records"
    printf '\n'
    echo "Terminé : $(du -sh "$dest" | cut -f1) dans $dest"
    echo "Rappel : la fréquence d'échantillonnage n'est que dans les fichiers .header."
}

cmd_catalog() {
    local dest="$DEST_ROOT/catalog/pims_handbook_catalog_urls.txt"
    mkdir -p "$(dirname "$dest")"
    curl -fsSL --max-time 120 "$HANDBOOK_INDEX" \
        | grep -oE "href='[^']*ISS Handbook/hb_[^']*\.pdf'" \
        | sed "s/^href='//; s/'$//" | sort -u > "$dest"
    echo "$(wc -l < "$dest") adresses -> $dest"
    sed 's#.*/hb_##; s/_.*//' "$dest" | sort | uniq -c | sed 's/^/  /'
}

cmd_case() {
    local name="${1:?nom de fichier manquant, ex. hb_vib_equipment_4BCO2_2022.pdf}"
    local dest="$DEST_ROOT/pims_case_studies_pdf/${name#hb_vib_equipment_}"
    [ -s "$dest" ] && { echo "déjà présent : $dest"; return 0; }
    fetch_to "$HANDBOOK_ROOT/$name" "$dest"
    echo "$(wc -c < "$dest") o -> $dest"
}

cmd_pcoe() {
    local which="${1:?jeu manquant : bearings ou femto}" file dest
    case "$which" in
        bearings) file="4.+Bearings.zip"; echo "Jeu IMS / Université de Cincinnati, 1,08 Go." ;;
        femto)    file="10.+FEMTO+Bearing.zip"; echo "Jeu FEMTO-ST Besançon." ;;
        *) die "jeu inconnu \"$which\", attendu bearings ou femto" ;;
    esac
    dest="$DEST_ROOT/pcoe/$(echo "$file" | tr '+' '_')"
    [ -s "$dest" ] && { echo "déjà présent : $dest"; return 0; }
    confirm "Télécharger vers $dest ?" || { echo "abandon."; return 0; }
    fetch_to "$PCOE_ROOT/$file" "$dest"
    echo "$(du -sh "$dest" | cut -f1) -> $dest"
    echo "Citation requise : Lee, Qiu, Yu, Lin, et Rexnord Technical Services, 2007."
}

while getopts ":yd:h" opt; do
    case "$opt" in
        y) ASSUME_YES=1 ;;
        d) DEST_ROOT="$OPTARG" ;;
        h) usage; exit 0 ;;
        \?) die "option inconnue -$OPTARG" ;;
        :) die "l'option -$OPTARG attend une valeur" ;;
    esac
done
shift $((OPTIND - 1))

[ $# -eq 0 ] && { usage; exit 1; }
command="$1"; shift
guard_destination

case "$command" in
    list)    cmd_list "$@" ;;
    pad)     cmd_pad "$@" ;;
    header)  cmd_header "$@" ;;
    catalog) cmd_catalog "$@" ;;
    case)    cmd_case "$@" ;;
    pcoe)    cmd_pcoe "$@" ;;
    help)    usage ;;
    *)       die "commande inconnue \"$command\", voir --help" ;;
esac
