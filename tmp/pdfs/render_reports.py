from pathlib import Path

import pypdfium2 as pdfium
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[2]
REPORTS = {
    "fr": ROOT / "output" / "pdf" / "mcsa-deep-learning-gru-snn-efficiency-report-2026-08-27.pdf",
    "en-us": ROOT / "output" / "pdf" / "mcsa-deep-learning-gru-snn-efficiency-report-en-us-2026-08-27.pdf",
}


def render_report(label: str, pdf_path: Path) -> None:
    output_dir = ROOT / "tmp" / "pdfs" / f"rendered-{label}"
    output_dir.mkdir(parents=True, exist_ok=True)
    document = pdfium.PdfDocument(str(pdf_path))
    thumbnails = []

    for index in range(len(document)):
        image = document[index].render(scale=1.6).to_pil().convert("RGB")
        page_path = output_dir / f"page-{index + 1:02d}.png"
        image.save(page_path)
        thumbnail = image.copy()
        thumbnail.thumbnail((360, 510))
        thumbnails.append((index + 1, thumbnail))

    margin = 24
    label_height = 28
    columns = 4
    rows = (len(thumbnails) + columns - 1) // columns
    cell_width = 360 + margin * 2
    cell_height = 510 + label_height + margin * 2
    sheet = Image.new("RGB", (columns * cell_width, rows * cell_height), "#d9dde3")
    draw = ImageDraw.Draw(sheet)
    for position, (page_number, thumbnail) in enumerate(thumbnails):
        row, column = divmod(position, columns)
        x = column * cell_width + margin
        y = row * cell_height + margin + label_height
        sheet.paste(thumbnail, (x, y))
        draw.text((x, y - label_height + 4), f"Page {page_number}", fill="#111827")
    sheet.save(output_dir / "contact-sheet.png")
    print(f"{label}: {len(thumbnails)} pages rendered to {output_dir}")


for report_label, report_path in REPORTS.items():
    render_report(report_label, report_path)
