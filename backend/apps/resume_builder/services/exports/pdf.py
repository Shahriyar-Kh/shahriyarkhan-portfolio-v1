from html import escape
from io import BytesIO
from pathlib import Path
import re

import reportlab
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

from .security import split_text_and_links

FONT_REGULAR = "ResumeVera"
FONT_BOLD = "ResumeVeraBold"
NAVY = colors.HexColor("#17324D")
DARK = colors.HexColor("#18212B")


def _register_fonts():
    font_dir = Path(reportlab.__file__).parent / "fonts"
    registered = set(pdfmetrics.getRegisteredFontNames())
    if FONT_REGULAR not in registered:
        pdfmetrics.registerFont(TTFont(FONT_REGULAR, str(font_dir / "Vera.ttf")))
    if FONT_BOLD not in registered:
        pdfmetrics.registerFont(TTFont(FONT_BOLD, str(font_dir / "VeraBd.ttf")))


def _markup(value):
    output = []
    for text, url in split_text_and_links(value):
        visible = escape(text).replace("\n", "<br/>")
        if url:
            output.append(f'<link href="{escape(url, quote=True)}" color="#17324D">{visible}</link>')
        else:
            output.append(visible)
    return "".join(output)


def render_pdf(document):
    _register_fonts()
    buffer = BytesIO()
    styles = {
        "name": ParagraphStyle("ResumeName", fontName=FONT_BOLD, fontSize=17, leading=19, textColor=NAVY, alignment=TA_CENTER, spaceAfter=3),
        "title": ParagraphStyle("ResumeTitle", fontName=FONT_REGULAR, fontSize=10.8, leading=13.2, textColor=DARK, alignment=TA_CENTER, spaceAfter=2),
        "contact": ParagraphStyle("ResumeContact", fontName=FONT_REGULAR, fontSize=9, leading=11, textColor=DARK, alignment=TA_CENTER, spaceAfter=1),
        "heading": ParagraphStyle("ResumeHeading", fontName=FONT_BOLD, fontSize=10.5, leading=12.5, textColor=NAVY, spaceBefore=7.5, spaceAfter=2.5, keepWithNext=True),
        "body": ParagraphStyle("ResumeBody", fontName=FONT_REGULAR, fontSize=9.6, leading=12, textColor=DARK, spaceAfter=2.2),
        "bullet": ParagraphStyle("ResumeBullet", fontName=FONT_REGULAR, fontSize=9.6, leading=12, textColor=DARK, leftIndent=12, firstLineIndent=-7, bulletIndent=0, spaceAfter=1.7),
    }
    story = []
    if document.name:
        story.append(Paragraph(_markup(document.name), styles["name"]))
    if document.professional_title:
        story.append(Paragraph(_markup(document.professional_title), styles["title"]))
    for contact in document.contacts:
        story.append(Paragraph(_markup(contact), styles["contact"]))
    story.append(Spacer(1, 4))
    for section in document.sections:
        story.append(Paragraph(escape(section.heading), styles["heading"]))
        style = styles["body"] if section.key == "summary" else styles["bullet"]
        for item in section.items:
            story.append(Paragraph(_markup(item.text), style, bulletText=None if section.key == "summary" else "•"))

    title = f"{document.name} — Resume" if document.name else "Resume"
    author = document.name or "Portfolio resume export service"
    pdf = SimpleDocTemplate(
        buffer,
        pagesize=LETTER,
        leftMargin=0.62 * inch,
        rightMargin=0.62 * inch,
        topMargin=0.55 * inch,
        bottomMargin=0.55 * inch,
        pageCompression=1,
        invariant=1,
        title=title,
        author=author,
        subject=f"resume-content-sha256:{document.content_hash}",
    )

    def set_metadata(canvas, _doc):
        canvas.setTitle(title)
        canvas.setAuthor(author)
        canvas.setSubject(f"resume-content-sha256:{document.content_hash}")
        canvas.setCreator("Portfolio resume export service")

    pdf.build(story, onFirstPage=set_metadata, onLaterPages=set_metadata, canvasmaker=Canvas)
    artifact = buffer.getvalue()
    stable_id = document.content_hash[:32].encode("ascii")
    return re.sub(
        rb"/ID\s*\[\s*<[^>]+>\s*<[^>]+>\s*\]",
        b"/ID [<" + stable_id + b"><" + stable_id + b">]",
        artifact,
        count=1,
    )
