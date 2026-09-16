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
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer

from .security import split_text_and_links

FONT_REGULAR = "ResumeVera"
FONT_BOLD = "ResumeVeraBold"
ACCENT = colors.HexColor("#2457D6")
DARK = colors.HexColor("#182033")
MUTED = colors.HexColor("#667085")


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
            output.append(f'<link href="{escape(url, quote=True)}" color="#2457D6">{visible}</link>')
        else:
            output.append(visible)
    return "".join(output)


def render_pdf(document):
    """Render a polished, ATS-readable recruiter resume.

    The layout intentionally mirrors international software-engineering CV
    conventions: single column, clear identity block, restrained blue accent,
    conventional section headings, strong role/project hierarchy and simple
    bullets.  There are no tables, columns, text boxes or images, and all core
    content remains selectable text sourced from the governed snapshot.
    """
    _register_fonts()
    buffer = BytesIO()
    styles = {
        "name": ParagraphStyle(
            "ResumeName",
            fontName=FONT_BOLD,
            fontSize=19,
            leading=22,
            textColor=ACCENT,
            alignment=TA_CENTER,
            spaceAfter=3,
        ),
        "title": ParagraphStyle(
            "ResumeTitle",
            fontName=FONT_REGULAR,
            fontSize=10.6,
            leading=13,
            textColor=DARK,
            alignment=TA_CENTER,
            spaceAfter=3,
        ),
        "contact": ParagraphStyle(
            "ResumeContact",
            fontName=FONT_REGULAR,
            fontSize=8.8,
            leading=10.8,
            textColor=MUTED,
            alignment=TA_CENTER,
            spaceAfter=1,
        ),
        "heading": ParagraphStyle(
            "ResumeHeading",
            fontName=FONT_BOLD,
            fontSize=10.1,
            leading=12.2,
            textColor=ACCENT,
            spaceBefore=2,
            spaceAfter=4.5,
            keepWithNext=True,
        ),
        "body": ParagraphStyle(
            "ResumeBody",
            fontName=FONT_REGULAR,
            fontSize=9.55,
            leading=12.4,
            textColor=DARK,
            spaceAfter=3.2,
        ),
        "skill": ParagraphStyle(
            "ResumeSkill",
            fontName=FONT_REGULAR,
            fontSize=9.25,
            leading=11.7,
            textColor=DARK,
            leftIndent=0,
            spaceAfter=2,
        ),
        "entry_heading": ParagraphStyle(
            "ResumeEntryHeading",
            fontName=FONT_BOLD,
            fontSize=9.65,
            leading=11.9,
            textColor=DARK,
            spaceBefore=2.8,
            spaceAfter=1.8,
            keepWithNext=True,
        ),
        "detail": ParagraphStyle(
            "ResumeDetail",
            fontName=FONT_REGULAR,
            fontSize=8.9,
            leading=11.1,
            textColor=MUTED,
            leftIndent=13,
            spaceAfter=1.8,
        ),
        "bullet": ParagraphStyle(
            "ResumeBullet",
            fontName=FONT_REGULAR,
            fontSize=9.25,
            leading=11.8,
            textColor=DARK,
            leftIndent=14,
            firstLineIndent=-8,
            bulletIndent=0,
            spaceAfter=1.9,
        ),
    }

    story = []
    if document.name:
        story.append(Paragraph(_markup(document.name.upper()), styles["name"]))
    if document.professional_title:
        story.append(Paragraph(_markup(document.professional_title), styles["title"]))
    for contact in document.contacts:
        story.append(Paragraph(_markup(contact), styles["contact"]))
    story.append(Spacer(1, 4))

    for section in document.sections:
        story.append(
            HRFlowable(
                width="100%",
                thickness=0.8,
                color=ACCENT,
                spaceBefore=4,
                spaceAfter=4.5,
            )
        )
        story.append(Paragraph(escape(section.heading), styles["heading"]))
        for item in section.items:
            kind = item.kind if item.kind in styles else "body"
            bullet_text = "•" if kind == "bullet" else None
            story.append(Paragraph(_markup(item.text), styles[kind], bulletText=bullet_text))

    title = f"{document.name} - Software Engineer CV" if document.name else "Software Engineer CV"
    author = document.name or "Portfolio resume export service"
    pdf = SimpleDocTemplate(
        buffer,
        pagesize=LETTER,
        leftMargin=0.62 * inch,
        rightMargin=0.62 * inch,
        topMargin=0.48 * inch,
        bottomMargin=0.5 * inch,
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
