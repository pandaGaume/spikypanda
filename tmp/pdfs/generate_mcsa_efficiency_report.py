from __future__ import annotations

import math
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    Image,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[2]
TMP = ROOT / "tmp" / "pdfs"
OUTPUT = ROOT / "output" / "pdf" / "mcsa-deep-learning-gru-snn-efficiency-report-2026-08-27.pdf"

NAVY = colors.HexColor("#132A3A")
BLUE = colors.HexColor("#2374AB")
TEAL = colors.HexColor("#1B998B")
GREEN = colors.HexColor("#3A936A")
ORANGE = colors.HexColor("#F18F01")
RED = colors.HexColor("#C44536")
INK = colors.HexColor("#17212B")
MID = colors.HexColor("#536472")
PALE = colors.HexColor("#EDF4F7")
LIGHT_BLUE = colors.HexColor("#E8F1F8")
LIGHT_GREEN = colors.HexColor("#E7F4EF")
LIGHT_ORANGE = colors.HexColor("#FFF1DC")
GRID = colors.HexColor("#C8D3DA")
WHITE = colors.white


def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont("Arial", "C:/Windows/Fonts/arial.ttf"))
    pdfmetrics.registerFont(TTFont("Arial-Bold", "C:/Windows/Fonts/arialbd.ttf"))
    pdfmetrics.registerFont(TTFont("Arial-Italic", "C:/Windows/Fonts/ariali.ttf"))
    pdfmetrics.registerFontFamily(
        "Arial",
        normal="Arial",
        bold="Arial-Bold",
        italic="Arial-Italic",
        boldItalic="Arial-Bold",
    )


register_fonts()


class AccentRule(Flowable):
    def __init__(self, width: float, color=TEAL, thickness: float = 2.5):
        super().__init__()
        self.width = width
        self.height = 5
        self.color = color
        self.thickness = thickness

    def draw(self) -> None:
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(self.thickness)
        self.canv.line(0, 2.5, self.width, 2.5)


styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        name="ReportTitle",
        parent=styles["Title"],
        fontName="Arial-Bold",
        fontSize=25,
        leading=30,
        textColor=NAVY,
        alignment=TA_LEFT,
        spaceAfter=10,
    )
)
styles.add(
    ParagraphStyle(
        name="ReportSubtitle",
        parent=styles["Normal"],
        fontName="Arial",
        fontSize=12.5,
        leading=18,
        textColor=MID,
        spaceAfter=12,
    )
)
styles.add(
    ParagraphStyle(
        name="H1x",
        parent=styles["Heading1"],
        fontName="Arial-Bold",
        fontSize=16,
        leading=20,
        textColor=NAVY,
        spaceBefore=5,
        spaceAfter=8,
    )
)
styles.add(
    ParagraphStyle(
        name="H2x",
        parent=styles["Heading2"],
        fontName="Arial-Bold",
        fontSize=12,
        leading=15,
        textColor=BLUE,
        spaceBefore=7,
        spaceAfter=5,
    )
)
styles.add(
    ParagraphStyle(
        name="BodyX",
        parent=styles["BodyText"],
        fontName="Arial",
        fontSize=9.4,
        leading=13.2,
        textColor=INK,
        spaceAfter=6,
    )
)
styles.add(
    ParagraphStyle(
        name="SmallX",
        parent=styles["BodyText"],
        fontName="Arial",
        fontSize=7.6,
        leading=10.2,
        textColor=MID,
        spaceAfter=4,
    )
)
styles.add(
    ParagraphStyle(
        name="CalloutX",
        parent=styles["BodyText"],
        fontName="Arial-Bold",
        fontSize=10,
        leading=14,
        textColor=NAVY,
        spaceAfter=0,
    )
)
styles.add(
    ParagraphStyle(
        name="MetricValue",
        parent=styles["BodyText"],
        fontName="Arial-Bold",
        fontSize=18,
        leading=21,
        textColor=NAVY,
        alignment=TA_CENTER,
        spaceAfter=3,
    )
)
styles.add(
    ParagraphStyle(
        name="MetricLabel",
        parent=styles["BodyText"],
        fontName="Arial",
        fontSize=7.4,
        leading=9.5,
        textColor=MID,
        alignment=TA_CENTER,
    )
)
styles.add(
    ParagraphStyle(
        name="TableHead",
        parent=styles["BodyText"],
        fontName="Arial-Bold",
        fontSize=7.4,
        leading=9,
        textColor=WHITE,
        alignment=TA_CENTER,
    )
)
styles.add(
    ParagraphStyle(
        name="TableCell",
        parent=styles["BodyText"],
        fontName="Arial",
        fontSize=7.2,
        leading=9.2,
        textColor=INK,
    )
)
styles.add(
    ParagraphStyle(
        name="TableCellBold",
        parent=styles["BodyText"],
        fontName="Arial-Bold",
        fontSize=7.2,
        leading=9.2,
        textColor=INK,
    )
)
styles.add(
    ParagraphStyle(
        name="Formula",
        parent=styles["BodyText"],
        fontName="Courier",
        fontSize=8.2,
        leading=11.2,
        leftIndent=8,
        rightIndent=8,
        textColor=NAVY,
        backColor=PALE,
        borderPadding=7,
        spaceBefore=3,
        spaceAfter=7,
    )
)
styles.add(
    ParagraphStyle(
        name="CaptionX",
        parent=styles["BodyText"],
        fontName="Arial-Italic",
        fontSize=7.3,
        leading=9.5,
        textColor=MID,
        alignment=TA_CENTER,
        spaceAfter=5,
    )
)


def P(text: str, style: str = "BodyX") -> Paragraph:
    return Paragraph(text, styles[style])


def metric_box(value: str, label: str, background) -> Table:
    table = Table(
        [[P(value, "MetricValue")], [P(label, "MetricLabel")]],
        colWidths=[5.05 * cm],
        rowHeights=[0.8 * cm, 1.05 * cm],
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), background),
                ("BOX", (0, 0), (-1, -1), 0.6, GRID),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    return table


def callout(text: str, background=LIGHT_BLUE, border=BLUE) -> Table:
    t = Table([[P(text, "CalloutX")]], colWidths=[17.0 * cm])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), background),
                ("BOX", (0, 0), (-1, -1), 0.8, border),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return t


def styled_table(data, widths, header=True, font_size=7.2) -> Table:
    normalized = []
    for row_index, row in enumerate(data):
        normalized.append(
            [
                cell
                if isinstance(cell, Flowable)
                else P(str(cell), "TableHead" if header and row_index == 0 else "TableCell")
                for cell in row
            ]
        )
    table = Table(normalized, colWidths=widths, repeatRows=1 if header else 0, hAlign="LEFT")
    commands = [
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 0.35, GRID),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    if header:
        commands.append(("BACKGROUND", (0, 0), (-1, 0), NAVY))
    for row in range(1 if header else 0, len(normalized)):
        if row % 2 == 0:
            commands.append(("BACKGROUND", (0, row), (-1, row), colors.HexColor("#F6F8F9")))
    table.setStyle(TableStyle(commands))
    return table


def make_charts() -> tuple[Path, Path, Path]:
    plt.rcParams.update(
        {
            "font.family": "DejaVu Sans",
            "axes.titleweight": "bold",
            "axes.labelcolor": "#17212B",
            "text.color": "#17212B",
            "xtick.color": "#536472",
            "ytick.color": "#536472",
        }
    )

    names = ["VGG-19", "NASNet-M", "CNN-LSTM", "LSTM MCSA", "GRU h=32", "SNN h=32"]
    params = [143_700_000, 5_300_000, 100_000, 4_773, 3_621, 1_893]
    accuracies = [99.4, 96.2, 92.3, 88.0, 91.0, 78.5]
    palette = ["#536472", "#536472", "#2374AB", "#1B998B", "#3A936A", "#F18F01"]

    path1 = TMP / "parameters_log.png"
    fig, ax = plt.subplots(figsize=(9.2, 4.6), dpi=180)
    y = list(range(len(names)))
    ax.barh(y, params, color=palette, height=0.62)
    ax.set_xscale("log")
    ax.set_yticks(y, names)
    ax.invert_yaxis()
    ax.set_xlabel("Nombre de paramètres, échelle logarithmique")
    ax.set_title("Réduction progressive de la taille du modèle")
    ax.grid(axis="x", alpha=0.22)
    labels = ["143,7 M", "5,3 M", "~100 k", "4 773", "3 621", "1 893"]
    for yi, value, label in zip(y, params, labels):
        ax.text(value * 1.13, yi, label, va="center", fontsize=8.5, fontweight="bold")
    ax.spines[["top", "right", "left"]].set_visible(False)
    fig.tight_layout()
    fig.savefig(path1, bbox_inches="tight", facecolor="white")
    plt.close(fig)

    path2 = TMP / "accuracy_vs_parameters.png"
    fig, ax = plt.subplots(figsize=(9.2, 4.8), dpi=180)
    for name, x, yv, c in zip(names, params, accuracies, palette):
        ax.scatter(x, yv, s=90 if name in ("GRU h=32", "SNN h=32") else 60, color=c, edgecolor="white", linewidth=0.8, zorder=3)
        offset = (7, -12) if name == "SNN h=32" else (7, 6)
        ax.annotate(name, (x, yv), xytext=offset, textcoords="offset points", fontsize=7.8, fontweight="bold" if name in ("GRU h=32", "SNN h=32") else "normal")
    ax.set_xscale("log")
    ax.set_xlim(1_000, 400_000_000)
    ax.set_ylim(60, 102)
    ax.set_xlabel("Nombre de paramètres, échelle logarithmique")
    ax.set_ylabel("Accuracy publiée ou observée (%)")
    ax.set_title("Précision et compacité, comparaison indicative")
    ax.grid(alpha=0.22)
    ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout()
    fig.savefig(path2, bbox_inches="tight", facecolor="white")
    plt.close(fig)

    path3 = TMP / "weighted_work.png"
    labels = ["GRU\nMAC", "SNN\npropagation", "SNN\ncapteur + réseau"]
    values = [225_280, 5_305, 22_000]
    colors_bar = ["#3A936A", "#F18F01", "#2374AB"]
    fig, ax = plt.subplots(figsize=(8.8, 4.6), dpi=180)
    bars = ax.bar(labels, values, color=colors_bar, width=0.58)
    ax.set_yscale("log")
    ax.set_ylabel("Opérations par fenêtre, échelle logarithmique")
    ax.set_title("Charge de calcul après extraction de l'enveloppe")
    ax.grid(axis="y", alpha=0.22)
    ax.spines[["top", "right", "left"]].set_visible(False)
    for bar, value, label in zip(bars, values, ["225 280", "5 305", "~22 000"]):
        ax.text(bar.get_x() + bar.get_width() / 2, value * 1.18, label, ha="center", va="bottom", fontsize=9, fontweight="bold")
    fig.tight_layout()
    fig.savefig(path3, bbox_inches="tight", facecolor="white")
    plt.close(fig)

    return path1, path2, path3


def page_decoration(canvas, doc) -> None:
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(NAVY)
    canvas.rect(0, height - 13 * mm, width, 13 * mm, stroke=0, fill=1)
    canvas.setFont("Arial-Bold", 7.8)
    canvas.setFillColor(WHITE)
    canvas.drawString(18 * mm, height - 8.5 * mm, "SPikyPanda | Diagnostic MCSA compact et neuromorphique")
    canvas.setFont("Arial", 7.2)
    canvas.setFillColor(MID)
    canvas.drawString(18 * mm, 10 * mm, "Rapport comparatif R&D - 27 août 2026")
    canvas.drawRightString(width - 18 * mm, 10 * mm, f"Page {doc.page}")
    canvas.setStrokeColor(GRID)
    canvas.setLineWidth(0.4)
    canvas.line(18 * mm, 14 * mm, width - 18 * mm, 14 * mm)
    canvas.restoreState()


def build_report() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    chart_params, chart_accuracy, chart_work = make_charts()

    doc = BaseDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=20 * mm,
        bottomMargin=18 * mm,
        title="De 143,7 millions de paramètres à 1 893 poids",
        author="SpikyPanda R&D",
        subject="Comparaison MCSA, LSTM, GRU et SNN pour diagnostic de barres rotoriques cassées",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
    doc.addPageTemplates([PageTemplate(id="report", frames=[frame], onPage=page_decoration)])

    story = []

    story.extend(
        [
            Spacer(1, 11 * mm),
            P("DE 143,7 MILLIONS DE PARAMÈTRES À 1 893 POIDS", "ReportTitle"),
            P(
                "Trajectoire expérimentale vers un diagnostic MCSA compact, événementiel et compatible MCU",
                "ReportSubtitle",
            ),
            AccentRule(17 * cm, TEAL, 3),
            Spacer(1, 5 * mm),
            P(
                "Ce rapport met en perspective trois étapes de réduction successives : les grands réseaux profonds de la littérature, le modèle récurrent compact issu du travail MCSA, puis le SNN hard-forward actuel. Il sépare volontairement la taille du modèle, le nombre de calculs, la mémoire et l'énergie estimée.",
                "BodyX",
            ),
            Spacer(1, 3 * mm),
            Table(
                [[
                    metric_box("75 900 x", "moins de paramètres que VGG-19", LIGHT_BLUE),
                    metric_box("1,9 x", "moins de poids que le GRU", LIGHT_GREEN),
                    metric_box("42,5 x", "moins de propagations pondérées", LIGHT_ORANGE),
                ]],
                colWidths=[5.55 * cm, 5.55 * cm, 5.55 * cm],
                hAlign="LEFT",
            ),
            Spacer(1, 6 * mm),
            callout(
                "Résultat central : le progrès le plus important ne vient pas d'une simple compression. Il vient d'une meilleure représentation physique du signal, puis d'un changement de nature du calcul. Le SNN ne multiplie plus des matrices denses à chaque pas. Il ne propage des poids que lorsqu'un événement utile apparaît.",
                LIGHT_GREEN,
                TEAL,
            ),
            Spacer(1, 7 * mm),
            P("Chiffres de référence", "H2x"),
            styled_table(
                [
                    ["Étape", "Architecture", "Paramètres", "Accuracy", "Résultat principal"],
                    ["Littérature", "VGG-19", "143,7 M", "99,4 %", "Très haute précision, coût GPU"],
                    ["Papier MCSA", "LSTM h=32", "4 773", "88,0 %", "19,1 KB float32"],
                    ["Expérience SpikyPanda", "GRU h=32", "3 621", "91,0 % test", "364/400"],
                    ["Expérience SpikyPanda", "SNN 32+5 LIF", "1 893", "78,5 % test", "314/400, split groupé"],
                ],
                [2.5 * cm, 3.0 * cm, 2.2 * cm, 2.4 * cm, 6.5 * cm],
            ),
            Spacer(1, 3 * mm),
            P(
                "Note terminologique : dans les références du papier MCSA, les modèles à plusieurs millions de paramètres sont des CNN profonds, notamment VGG-19 et NASNet-Mobile. Le MLP explicitement évalué est au contraire un petit modèle de 773 paramètres qui atteint 67,0 %. Le rapport utilise donc l'expression exacte <b>grands réseaux profonds</b>.",
                "SmallX",
            ),
            Spacer(1, 4 * mm),
            P("Document de synthèse technique | SpikyPanda | 27 août 2026", "SmallX"),
        ]
    )

    story.append(PageBreak())
    story.extend(
        [
            P("1. Pourquoi cette comparaison est significative", "H1x"),
            P(
                "Une accuracy élevée ne dit rien, à elle seule, sur la possibilité d'embarquer le modèle. Un réseau de 143,7 millions de paramètres peut atteindre 99,4 %, mais il représente environ 574,8 MB de poids en float32 et suppose un environnement GPU. À l'opposé, une solution MCU doit tenir dans quelques kilo-octets et limiter les accès mémoire, les multiplications et les fonctions non linéaires.",
            ),
            P(
                "La trajectoire étudiée répond donc à une question plus exigeante que la seule précision : <b>quelle quantité minimale de représentation et de calcul suffit pour extraire une information de sévérité réellement utile à partir du courant moteur ?</b>",
            ),
            Image(str(chart_params), width=16.5 * cm, height=8.25 * cm),
            P(
                "Figure 1. Nombre de paramètres des architectures citées et des modèles SpikyPanda. L'échelle logarithmique est indispensable pour rendre visibles les modèles compacts.",
                "CaptionX",
            ),
            P("Lecture correcte des facteurs de réduction", "H2x"),
            styled_table(
                [
                    ["Comparaison", "Rapport", "Ce que cela signifie"],
                    ["VGG-19 / SNN", "143 700 000 / 1 893 = 75 909 x", "Réduction du nombre de paramètres"],
                    ["NASNet-M / SNN", "5 300 000 / 1 893 = 2 800 x", "Réduction du nombre de paramètres"],
                    ["LSTM MCSA / SNN", "4 773 / 1 893 = 2,52 x", "Réduction du nombre de paramètres"],
                    ["GRU / SNN", "3 621 / 1 893 = 1,91 x", "Réduction du nombre de paramètres"],
                    ["Calcul GRU / propagation SNN", "225 280 / 5 305 = 42,47 x", "Réduction des opérations pondérées"],
                ],
                [4.0 * cm, 5.4 * cm, 7.1 * cm],
            ),
            Spacer(1, 3 * mm),
            callout(
                "Le facteur proche de 45 ne décrit pas la taille mémoire entre GRU et SNN. Il décrit la réduction des propagations pondérées par fenêtre. La taille des poids est, elle, divisée par 1,9.",
                LIGHT_ORANGE,
                ORANGE,
            ),
        ]
    )

    story.append(PageBreak())
    story.extend(
        [
            P("2. Première rupture : comprendre le signal avant d'agrandir le réseau", "H1x"),
            P(
                "Le papier MCSA part d'un constat physique. Une barre rotorique cassée crée des bandes latérales autour de la fréquence d'alimentation. Pour une fréquence réseau f et un glissement s, les composantes principales apparaissent autour de f(1 - 2s) et f(1 + 2s). Dans le domaine temporel, cela produit une modulation lente de l'amplitude, typiquement entre 2 et 6 Hz pour le banc étudié.",
            ),
            P("Fréquence de modulation approximative :  f_mod = 2 s f", "Formula"),
            P(
                "Les grands CNN appliqués au signal brut ou au spectrogramme disposent de millions de paramètres pour apprendre implicitement cette extraction. Le travail MCSA la rend explicite au moyen d'une enveloppe RMS sur un demi-cycle :",
            ),
            P("env(t) = racine[ (1/W) * somme(i=0..W-1) x(t+i)^2 ]", "Formula"),
            P(
                "Après suppression du transitoire, décimation vers 60 Hz et centrage par fenêtre, 256 échantillons haute fréquence sont remplacés par 64 valeurs d'enveloppe. La signature lente devient directement accessible au réseau récurrent.",
            ),
            P("Ablation rapportée dans le papier", "H2x"),
            styled_table(
                [
                    ["Représentation", "Accuracy", "Échec ou gain observé"],
                    ["Signal brut, normalisation par trace, 64 pas", "26,8 %", "La normalisation efface la signature d'amplitude"],
                    ["Signal brut, normalisation globale, 256 pas", "16,0 %", "Gradient récurrent insuffisant sur la longue séquence"],
                    ["Enveloppe, min/max global", "35,0 %", "Le niveau de charge domine encore"],
                    ["Enveloppe centrée", "88,0 %", "La modulation utile devient visible"],
                ],
                [6.2 * cm, 2.2 * cm, 8.1 * cm],
            ),
            Spacer(1, 4 * mm),
            callout(
                "Le gain décisif n'est pas une couche supplémentaire. C'est la suppression d'une information inutile, la porteuse, et d'une variable parasite, la charge moyenne. Cette étape réduit le besoin de capacité de plusieurs ordres de grandeur.",
                LIGHT_GREEN,
                TEAL,
            ),
            P("Ce que montre le petit MLP", "H2x"),
            P(
                "Le baseline FFT + MLP ne contient que 773 paramètres, donc moins que le SNN actuel, mais il atteint seulement 67,0 %. Cela prouve qu'un faible nombre de paramètres ne suffit pas. L'architecture doit être adaptée à la structure temporelle du phénomène. Le LSTM, le GRU et le SNN introduisent chacun une forme de mémoire que le petit MLP ne possède pas.",
            ),
            P("Résultat du papier MCSA", "H2x"),
            P(
                "Le LSTM h=32 contient 4 773 paramètres, occupe 19,1 KB en float32 et atteint 88,0 % sur cinq niveaux de sévérité. La décision binaire sain/défectueux atteint 97,3 %. Ce résultat établit qu'une représentation physique explicite peut remplacer une grande partie de la capacité d'un réseau profond.",
            ),
        ]
    )

    story.append(PageBreak())
    story.extend(
        [
            P("3. Deuxième rupture : du LSTM au GRU compact", "H1x"),
            P(
                "Le GRU conserve une mémoire récurrente mais utilise trois groupes de poids au lieu des quatre portes du LSTM. Avec 3 entrées, 32 unités cachées et 5 sorties, le comptage exact est le suivant :",
            ),
            P(
                "Entrée GRU : 3 x 3 x 32 = 288\n"
                "Récurrence GRU : 3 x 32 x 32 = 3 072\n"
                "Biais GRU : 3 x 32 = 96\n"
                "Sortie : 32 x 5 + 5 = 165\n"
                "Total : 3 621 paramètres",
                "Formula",
            ),
            P(
                "Le meilleur checkpoint enregistré atteint 93,5 % en validation et 91,0 % sur 400 fenêtres de test, soit 364 classifications correctes. Les poids occupent exactement 14 484 octets en float32, soit 14,14 Kio.",
            ),
            callout(
                "Par rapport au LSTM du papier, le GRU réduit les paramètres de 24,1 % tout en passant de 88,0 % à 91,0 % sur le test observé. Cette évolution est encourageante, mais elle ne constitue pas une ablation contrôlée : le protocole et la version du pipeline ont également évolué.",
                LIGHT_BLUE,
                BLUE,
            ),
            Spacer(1, 4 * mm),
            P("Coût de calcul du GRU", "H2x"),
            P(
                "Le runtime actuel calcule les trois portes du GRU et les cinq sorties à chacun des 64 pas temporels :",
            ),
            P(
                "MAC par pas = 3 x 32 x (3 + 32) + 32 x 5 = 3 520\n"
                "MAC par fenêtre = 3 520 x 64 = 225 280",
                "Formula",
            ),
            P(
                "À ces opérations s'ajoutent 6 464 appels à sigmoid ou tanh. Sur MCU, ces fonctions peuvent coûter davantage qu'une multiplication-accumulation, sauf si elles sont remplacées par des tables ou des approximations dédiées.",
            ),
            P("Comparaison précision / compacité", "H2x"),
            Image(str(chart_accuracy), width=16.3 * cm, height=8.5 * cm),
            P(
                "Figure 2. La position d'un modèle ne doit être interprétée qu'avec son protocole expérimental. Les points de littérature, le GRU historique et le SNN groupé ne partagent pas tous le même découpage des acquisitions.",
                "CaptionX",
            ),
        ]
    )

    story.append(PageBreak())
    story.extend(
        [
            P("4. Troisième rupture : du calcul dense au calcul événementiel", "H1x"),
            P(
                "Le SNN actuel ne remplace pas simplement les activations du GRU par des zéros et des uns. Il change l'interface entre le signal et le réseau. Neuf cellules sensorielles filtrent les trois courants autour de trois champs fréquentiels. Les croisements de phase et trois niveaux d'intensité produisent 54 ports de spikes binaires.",
            ),
            P(
                "Topologie compilée : observation -> 9 cellules IIR -> 54 ports -> 32 LIF cachés -> 5 LIF de classe",
                "Formula",
            ),
            P("Comptage exact des poids", "H2x"),
            P(
                "Capteur vers hidden : 54 x 32 = 1 728\n"
                "Hidden vers classes : 32 x 5 = 160\n"
                "Signal de fin vers classes : 5\n"
                "Total : 1 893 poids entraînables",
                "Formula",
            ),
            P(
                "Le forward d'entraînement est strictement identique au forward LIF natif : seuil binaire, reset hard et aucune valeur fractionnaire transmise dans les liens. La dérivée surrogate intervient uniquement pendant le calcul du gradient. La loss est alignée sur le score réellement lu par le runtime :",
            ),
            P("score[c] = 2 x nombre_de_spikes[c] + membrane_finale[c] / seuil[c]", "Formula"),
            P(
                "Cette correction a fait passer le meilleur SNN hard-forward de 51,0 % à 78,5 % sur le test indépendant, tout en réduisant l'activité de 179,2 à 118,6 spikes neuronaux par fenêtre.",
            ),
            P("Calcul événementiel mesuré", "H2x"),
            styled_table(
                [
                    ["Origine", "Calcul", "Opérations pondérées moyennes"],
                    ["Capteur -> 32 LIF", "147,24 événements x 32", "4 712 additions de poids"],
                    ["32 LIF -> 5 classes", "117,64 spikes cachés x 5", "588 additions de poids"],
                    ["Fin de fenêtre", "1 événement x 5", "5 additions de poids"],
                    ["Total réseau", "", "environ 5 305 additions"],
                ],
                [5.2 * cm, 5.0 * cm, 6.3 * cm],
            ),
            Spacer(1, 3 * mm),
            P(
                "Comme l'amplitude d'un spike vaut 1, la propagation peut se réduire à <b>membrane += poids</b>. Les multiplications restent nécessaires dans les neuf filtres IIR et dans la décroissance des membranes, mais elles ne sont plus répétées sur une matrice dense complète à chaque pas.",
            ),
            callout(
                "225 280 MAC pour le GRU contre environ 5 305 additions synaptiques pour le SNN : 42,5 fois moins de propagations pondérées par fenêtre.",
                LIGHT_ORANGE,
                ORANGE,
            ),
        ]
    )

    story.append(PageBreak())
    story.extend(
        [
            P("5. Mémoire, CPU et énergie estimée", "H1x"),
            P("Mémoire des poids", "H2x"),
            styled_table(
                [
                    ["Modèle", "Paramètres", "Poids float32", "Poids int8", "Observation"],
                    ["VGG-19", "143,7 M", "574,8 MB", "143,7 MB", "GPU dans la référence"],
                    ["NASNet-M", "5,3 M", "21,2 MB", "5,3 MB", "GPU dans la référence"],
                    ["CNN-LSTM", "~100 k", "~400 KB", "~100 KB", "Hybride profond"],
                    ["LSTM MCSA", "4 773", "19,1 KB", "4,8 KB", "Papier MCSA"],
                    ["GRU h=32", "3 621", "14,5 KB", "3,6 KB", "Checkpoint observé"],
                    ["SNN h=32", "1 893", "7,6 KB", "1,9 KB", "Poids seuls"],
                ],
                [3.1 * cm, 2.3 * cm, 2.5 * cm, 2.3 * cm, 6.3 * cm],
            ),
            Spacer(1, 3 * mm),
            P(
                "Le déploiement SNN doit aussi stocker les coefficients des neuf filtres, les seuils, les constantes LIF et éventuellement les indices de routage. Une représentation spécialisée occuperait environ 8 à 9 Kio en float32. Un graphe générique sparse serait plutôt dans la zone 10 à 13 Kio. En int8, les indices peuvent coûter davantage que les poids. Il est donc essentiel de compiler les blocs denses sous forme de tableaux contigus.",
            ),
            P("Charge de calcul", "H2x"),
            Image(str(chart_work), width=15.6 * cm, height=7.7 * cm),
            P(
                "Figure 3. Le capteur SNN ajoute environ 1 152 mises à jour de filtres biquad. En intégrant les filtres, les seuils, les LIF et le routage, la charge arithmétique utile est estimée entre 17 000 et 30 000 opérations simples par fenêtre.",
                "CaptionX",
            ),
            P("Estimation MCU, modèle seul", "H2x"),
            styled_table(
                [
                    ["Hypothèse illustrative", "GRU", "SNN spécialisé"],
                    ["Cycles par fenêtre", "0,5 à 1,5 million", "50 000 à 150 000"],
                    ["MCU 80 MHz", "6,25 à 18,75 ms", "0,63 à 1,88 ms"],
                    ["À 10 mW actifs", "environ 60 à 190 µJ", "environ 6 à 20 µJ"],
                    ["Rapport énergétique attendu", "référence 1", "environ 5 à 15 fois moins"],
                ],
                [6.2 * cm, 5.1 * cm, 5.2 * cm],
            ),
            P(
                "Ces microjoules ne sont pas des mesures. Ils illustrent une plage plausible. Le ratio est plus robuste que la valeur absolue, qui dépend du MCU, du format numérique, de la mémoire et du compilateur.",
                "SmallX",
            ),
        ]
    )

    story.append(PageBreak())
    story.extend(
        [
            P("6. Ce que l'estimation inclut, et ce qu'elle n'inclut pas", "H1x"),
            P("Le coût commun de l'enveloppe", "H2x"),
            P(
                "Le GRU et le SNN consomment actuellement une enveloppe RMS déjà préparée. Sur le dispositif réel, cette enveloppe doit être calculée à partir de trois courants échantillonnés autour de 55,6 kHz. Sur une fenêtre de 1,066 s, cela représente près de 60 000 échantillons par phase, environ 178 000 carrés et 356 000 additions ou soustractions pour une RMS glissante simple.",
            ),
            P(
                "Si cette étape est exécutée par le même MCU, elle devient un coût commun important et réduit l'avantage énergétique de bout en bout vers une estimation de 1,5 à 3 fois. Si l'enveloppe est fournie par le capteur, un DSP ou une chaîne d'acquisition existante, l'avantage du moteur neuronal seul reste plutôt de 5 à 15 fois.",
            ),
            P("La représentation logicielle compte", "H2x"),
            P(
                "Le checkpoint SNN mesure environ 13,5 ms par fenêtre dans le navigateur. Ce temps ne reflète pas le potentiel MCU : le runtime TypeScript manipule un graphe dynamique, des objets d'événements, des canaux et des exponentielles génériques. Le gain attendu nécessite un noyau embarqué avec tableaux contigus, fanouts implicites, absence d'allocation par spike et coefficients de décroissance pré-calculés.",
            ),
            P("RAM de travail", "H2x"),
            styled_table(
                [
                    ["Élément", "GRU h=32", "SNN 9 capteurs + 37 LIF"],
                    ["État principal", "32 hidden + buffers de portes", "9 états IIR + 37 membranes"],
                    ["RAM optimisée estimée", "0,6 à 1,2 Kio", "1 à 3 Kio"],
                    ["Risque principal", "Buffers non réutilisés", "Files d'événements et métadonnées de graphe"],
                ],
                [5.0 * cm, 5.6 * cm, 5.9 * cm],
            ),
            Spacer(1, 4 * mm),
            callout(
                "Le SNN gagne nettement sur les poids et le trafic mémoire, mais pas automatiquement sur la RAM. Un ordonnanceur événementiel trop générique peut consommer davantage d'état qu'un GRU compact.",
                LIGHT_ORANGE,
                ORANGE,
            ),
            P("Comparabilité des accuracies", "H2x"),
            P(
                "Le GRU à 91,0 % utilise le dataset historique de fingerprint dcb578a0, avec 64 pas. Le SNN à 78,5 % utilise le dataset ec00f5c3, 128 pas à 120,110 Hz et un découpage groupé par acquisition. Ce dernier interdit qu'une acquisition, ou des fenêtres qui se recouvrent dans cette acquisition, apparaisse à la fois dans l'apprentissage et le test.",
            ),
            P(
                "Il serait donc incorrect d'affirmer que le SNN perd exactement 12,5 points face au GRU à protocole identique. La prochaine comparaison scientifique doit entraîner le GRU h=32 sur ec00f5c3, avec le même train, la même validation et les mêmes 400 fenêtres indépendantes.",
            ),
            P("Robustesse ventilée par niveau de charge", "H2x"),
            P(
                "Le jeu d'essai couvre huit niveaux de charge, de 12,5 % à 100 %. La matrice de confusion agrégée du checkpoint ne permet cependant pas d'établir à quelles charges les erreurs se produisent. Le papier ne doit donc pas attribuer les erreurs Healthy/BRB1 aux faibles charges sans rejouer l'inférence et rattacher chaque prédiction à son acquisition source.",
            ),
            styled_table(
                [
                    ["Mesure à publier pour chaque charge", "Rôle scientifique"],
                    ["Nombre de fenêtres et accuracy", "Vérifier la représentativité et la stabilité globale"],
                    ["Rappel Healthy et rappel BRB1", "Localiser la limite de détection du défaut léger"],
                    ["Erreurs Healthy vers BRB1 et BRB1 vers Healthy", "Distinguer faux positifs et défauts manqués"],
                    ["Marge de classification et taux d'événements", "Relier l'incertitude à la visibilité physique du signal"],
                ],
                [7.5 * cm, 9.0 * cm],
            ),
        ]
    )

    story.append(PageBreak())
    story.extend(
        [
            P("7. Interprétation R&amp;D", "H1x"),
            P("La progression observée", "H2x"),
            styled_table(
                [
                    ["Étape", "Question résolue", "Résultat obtenu"],
                    ["Grands réseaux profonds", "Peut-on atteindre une accuracy très élevée ?", "Oui, 96 à 99,4 %, avec 5,3 à 143,7 M paramètres"],
                    ["Prétraitement MCSA", "Quelle information physique est réellement utile ?", "Enveloppe lente 2 à 6 Hz, LSTM de 4 773 paramètres"],
                    ["GRU compact", "Peut-on réduire la mémoire récurrente ?", "3 621 paramètres, 91,0 % sur le test historique"],
                    ["SNN hard-forward", "Peut-on remplacer le calcul dense par des événements ?", "1 893 poids, 5 305 propagations, 78,5 % sur split groupé"],
                ],
                [3.5 * cm, 6.1 * cm, 6.9 * cm],
            ),
            Spacer(1, 5 * mm),
            P("Ce que le SNN démontre déjà", "H2x"),
            P(
                "Le SNN actuel démontre qu'un réseau strictement binaire dans ses communications peut apprendre une classification à cinq niveaux sans pseudo-spikes dans le forward. Il atteint 78,5 % sur un test indépendant groupé avec 1 893 poids, 147,2 événements sensoriels et 118,6 spikes neuronaux par fenêtre. Son meilleur avantage n'est pas encore l'accuracy. C'est le passage d'un calcul dense systématique à une activité conditionnée par les événements du signal.",
            ),
            P("Ce qui reste à prouver", "H2x"),
            styled_table(
                [
                    ["Validation", "Mesure attendue"],
                    ["GRU sur split groupé", "Accuracy, MAC, temps et énergie sur ec00f5c3"],
                    ["Noyau SNN MCU compact", "Cycles exacts, flash, RAM, absence d'allocation"],
                    ["Quantification", "Écart d'accuracy float32 contre int8/int16"],
                    ["Énergie physique", "µJ par fenêtre mesurés au shunt ou avec un analyseur de puissance"],
                    ["Prétraitement complet", "Séparer coût RMS commun, capteur ondulatoire et réseau"],
                    ["Robustesse par charge", "Accuracy, rappels Healthy/BRB1, marge et taux d'événements pour chacune des huit charges"],
                ],
                [6.1 * cm, 10.4 * cm],
            ),
            Spacer(1, 5 * mm),
            callout(
                "Conclusion : la trajectoire ne montre pas qu'un SNN est simplement un réseau plus petit. Elle montre qu'une compréhension physique du signal permet d'abord de supprimer des millions de paramètres, puis qu'une représentation événementielle permet de supprimer environ 42 fois les propagations pondérées restantes. Le résultat est une architecture crédible pour MCU, sous réserve de confirmer la mesure sur un noyau embarqué compact.",
                LIGHT_GREEN,
                TEAL,
            ),
            Spacer(1, 5 * mm),
            P("Références et provenance des chiffres", "H2x"),
            P(
                "[1] G. Pelletier, <i>Envelope-Domain Preprocessing for Ultra-Compact LSTM-Based Broken Rotor Bar Severity Grading</i>, document local motor-current-mcsa-paper.pdf, 5 pages.",
                "SmallX",
            ),
            P(
                "[2] Checkpoint GRU motor_current_best_val_93p5.json : GRU h=32, 3 621 paramètres, validation 93,5 %, test 91,0 % (364/400), fingerprint dcb578a0.",
                "SmallX",
            ),
            P(
                "[3] Checkpoint SNN motor_current_snn_h32_5a83490c_best_val_82p5.json : 1 893 poids, validation 82,5 %, test 78,5 % (314/400), fingerprint ec00f5c3.",
                "SmallX",
            ),
            P(
                "[4] Rapport expérimental local runtime-decoder-loss-experiment.md : protocole hard-forward, activité neuronale, identité avec le runtime natif et comparaison de loss.",
                "SmallX",
            ),
            P(
                "[5] Les chiffres VGG-19, NASNet-Mobile et CNN-LSTM sont repris du tableau comparatif du papier MCSA, qui cite les travaux de Barrera-Llanga et al. et Jakaria et al. Les protocoles publiés ne sont pas nécessairement identiques.",
                "SmallX",
            ),
        ]
    )

    doc.build(story)


if __name__ == "__main__":
    build_report()
    print(OUTPUT)
