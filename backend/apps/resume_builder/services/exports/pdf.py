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
    bullets. There are no tables, columns, text boxes or images, and all core
    content remains selectable text sourced from the governed snapshot.

    Visible text must preserve the normalized snapshot verbatim. Styling may
    change case visually only through font treatment, never by rewriting the
    stored text, because artifact integrity validation compares the exported
    semantic text to the immutable approved snapshot.
    """
    _register_fonts()
    buffer = BytesIO()
    styles = {
        "name": ParagraphStyle(
            "ResumeName",
            fontName=FONT_BOLD,
            fontSize=18.5,
            leading=21,
            textColor=ACCENT,
            alignment=TA_CENTER,
            spaceAfter=2.5,
        ),
        "title": ParagraphStyle(
            "ResumeTitle",
            fontName=FONT_REGULAR,
            fontSize=10.4,
            leading=12.2,
            textColor=DARK,
            alignment=TA_CENTER,
            spaceAfter=2.5,
        ),
        "contact": ParagraphStyle(
            "ResumeContact",
            fontName=FONT_REGULAR,
            fontSize=8.65,
            leading=10.2,
            textColor=MUTED,
            alignment=TA_CENTER,
            spaceAfter=0.7,
        ),
        "heading": ParagraphStyle(
            "ResumeHeading",
            fontName=FONT_BOLD,
            fontSize=10,
            leading=11.7,
            textColor=ACCENT,
            spaceBefore=1,
            spaceAfter=3.4,
            keepWithNext=True,
        ),
        "body": ParagraphStyle(
            "ResumeBody",
            fontName=FONT_REGULAR,
            fontSize=9.4,
            leading=11.8,
            textColor=DARK,
            spaceAfter=2.6,
        ),
        "skill": ParagraphStyle(
            "ResumeSkill",
            fontName=FONT_REGULAR,
            fontSize=9.15,
            leading=11.25,
            textColor=DARK,
            leftIndent=0,
            spaceAfter=1.5,
        ),
        "entry_heading": ParagraphStyle(
            "ResumeEntryHeading",
            fontName=FONT_BOLD,
            fontSize=9.5,
            leading=11.35,
            textColor=DARK,
            spaceBefore=1.8,
            spaceAfter=1.3,
            keepWithNext=True,
        ),
        "detail": ParagraphStyle(
            "ResumeDetail",
            fontName=FONT_REGULAR,
            fontSize=8.75,
            leading=10.7,
            textColor=MUTED,
            leftIndent=12,
            spaceAfter=1.25,
        ),
        "bullet": ParagraphStyle(
            "ResumeBullet",
            fontName=FONT_REGULAR,
            fontSize=9.15,
            leading=11.25,
            textColor=DARK,
            leftIndent=14,
            firstLineIndent=-8,
            bulletIndent=0,
            spaceAfter=1.45,
        ),
    }

    story = []
    if document.name:
        story.append(Paragraph(_markup(document.name), styles["name"]))
    if document.professional_title:
        story.append(Paragraph(_markup(document.professional_title), styles["title"]))
    for contact in document.contacts:
        story.append(Paragraph(_markup(contact), styles["contact"]))
    story.append(Spacer(1, 2))

    for section in document.sections:
        story.append(
            HRFlowable(
                width="100%",
                thickness=0.75,
                color=ACCENT,
                spaceBefore=2.5,
                spaceAfter=3.25,
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
        leftMargin=0.55 * inch,
        rightMargin=0.55 * inch,
        topMargin=0.42 * inch,
        bottomMargin=0.42 * inch,
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
