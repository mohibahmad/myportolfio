from pathlib import Path
import base64
import json
import shutil

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "output" / "pdf"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_PDF = OUTPUT_DIR / "Mohib-Ahmad-Resume.pdf"
SITE_PDF = ROOT / "Mohib-Ahmad-Resume.pdf"
SITE_DATA = ROOT / "resume-data.js"

PAGE_W, PAGE_H = A4
INK = HexColor("#101827")
MUTED = HexColor("#526071")
ACCENT = HexColor("#2F72E8")
PALE = HexColor("#EAF1FF")
LINE = HexColor("#DCE3EC")
WHITE = HexColor("#FFFFFF")


def wrapped_lines(text, font, size, width):
    words = text.split()
    lines = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if stringWidth(candidate, font, size) <= width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_wrapped(c, text, x, y, width, font="Helvetica", size=8.4,
                 leading=12, color=MUTED, max_lines=None):
    lines = wrapped_lines(text, font, size, width)
    if max_lines:
        lines = lines[:max_lines]
    c.setFillColor(color)
    c.setFont(font, size)
    for line in lines:
        c.drawString(x, y, line)
        y -= leading
    return y


def section_title(c, title, x, y, width):
    c.setFillColor(ACCENT)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(x, y, title.upper())
    c.setStrokeColor(LINE)
    c.setLineWidth(0.7)
    c.line(x, y - 6, x + width, y - 6)
    return y - 21


def bullet(c, text, x, y, width, size=8.1, leading=11):
    c.setFillColor(ACCENT)
    c.circle(x + 2, y + 2.5, 1.4, fill=1, stroke=0)
    return draw_wrapped(c, text, x + 10, y, width - 10, size=size,
                        leading=leading, color=MUTED) - 2


def role(c, title, company, dates, x, y, width, description):
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 10.2)
    c.drawString(x, y, title)
    c.setFillColor(ACCENT)
    c.setFont("Helvetica-Bold", 8.4)
    c.drawString(x, y - 14, company)
    date_width = stringWidth(dates, "Helvetica", 7.7)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 7.7)
    c.drawString(x + width - date_width, y - 14, dates)
    y = draw_wrapped(c, description, x, y - 30, width, size=8,
                     leading=10.8, color=MUTED)
    return y - 12


def project(c, name, label, description, x, y, width):
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 9.3)
    c.drawString(x, y, name)
    label_width = stringWidth(label, "Helvetica-Bold", 6.8) + 12
    c.setFillColor(PALE)
    c.roundRect(x + width - label_width, y - 3, label_width, 13, 6,
                fill=1, stroke=0)
    c.setFillColor(ACCENT)
    c.setFont("Helvetica-Bold", 6.8)
    c.drawCentredString(x + width - label_width / 2, y + 0.7, label)
    y = draw_wrapped(c, description, x, y - 15, width, size=7.8,
                     leading=10.2, color=MUTED)
    return y - 9


def build_resume():
    c = canvas.Canvas(str(OUTPUT_PDF), pagesize=A4, pageCompression=1)
    c.setTitle("Mohib Ahmad - Flutter Developer Resume")
    c.setAuthor("Mohib Ahmad")
    c.setSubject("Flutter Developer Resume")

    c.setFillColor(INK)
    c.rect(0, PAGE_H - 128, PAGE_W, 128, fill=1, stroke=0)
    c.setFillColor(ACCENT)
    c.rect(0, PAGE_H - 128, 7, 128, fill=1, stroke=0)

    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 27)
    c.drawString(45, PAGE_H - 52, "Mohib Ahmad")
    c.setFillColor(HexColor("#8FB5FF"))
    c.setFont("Helvetica-Bold", 11)
    c.drawString(46, PAGE_H - 73, "FLUTTER DEVELOPER")
    c.setFillColor(HexColor("#CCD5E3"))
    c.setFont("Helvetica", 8.5)
    c.drawString(46, PAGE_H - 100, "Remote - Worldwide")
    c.drawString(160, PAGE_H - 100, "mohibahmad338@gmail.com")
    c.drawString(338, PAGE_H - 100, "github.com/mohibahmad")
    c.drawString(46, PAGE_H - 116, "linkedin.com/in/mohibahmad38")
    c.drawString(224, PAGE_H - 116, "mohibahmad.studio")

    left_x = 46
    left_w = 162
    divider_x = 226
    right_x = 246
    right_w = PAGE_W - right_x - 46
    top_y = PAGE_H - 158

    c.setStrokeColor(LINE)
    c.setLineWidth(0.7)
    c.line(divider_x, 45, divider_x, top_y + 8)

    y = section_title(c, "Profile", left_x, top_y, left_w)
    y = draw_wrapped(
        c,
        "Flutter developer focused on production-quality iOS, Android, and macOS applications. Builds scalable products with clean architecture, modern state management, Firebase, APIs, and thoughtful UI/UX.",
        left_x, y, left_w, size=8.2, leading=11.2, color=MUTED,
    ) - 15

    y = section_title(c, "Core Skills", left_x, y, left_w)
    for item in [
        "Flutter and Dart",
        "Riverpod and BLoC",
        "Clean Architecture, MVC, MVVM",
        "Firebase Auth, Firestore, Storage",
        "REST APIs with Dio and HTTP",
        "Unit and widget testing",
        "UI/UX implementation",
        "Performance optimization",
    ]:
        y = bullet(c, item, left_x, y, left_w)
    y -= 7

    y = section_title(c, "Tools", left_x, y, left_w)
    y = draw_wrapped(
        c,
        "Git, GitHub Actions, Fastlane, GoRouter, Hive, SQLite, FCM, Google Maps, Stripe, Gemini API, OpenAI API",
        left_x, y, left_w, size=8.1, leading=11.2, color=MUTED,
    ) - 16

    y = section_title(c, "Focus", left_x, y, left_w)
    for item in [
        "Cross-platform mobile products",
        "AI and API integrations",
        "Offline-first experiences",
        "App Store and Play Store delivery",
    ]:
        y = bullet(c, item, left_x, y, left_w)

    y = section_title(c, "Experience", right_x, top_y, right_w)
    y = role(
        c, "Flutter Developer", "TS Technology", "May 2026 - Present",
        right_x, y, right_w,
        "Developing scalable Flutter applications with a focus on performance, clean architecture, and production engineering. Collaborates with cross-functional teams to ship reliable mobile features.",
    )
    y = role(
        c, "Flutter Intern", "TS Technology", "Mar 2026 - May 2026",
        right_x, y, right_w,
        "Built cross-platform mobile features using Dart, state management, and modern mobile UI patterns while working with senior developers and established engineering practices.",
    )

    y = section_title(c, "Selected Projects", right_x, y + 1, right_w)
    y = project(
        c, "TravelNest", "IN DEVELOPMENT",
        "Flutter travel booking platform with destination search, Firebase services, Google Maps, Stripe payments, and a clean booking flow.",
        right_x, y, right_w,
    )
    y = project(
        c, "Nova Learn", "IN DEVELOPMENT",
        "AI-assisted education platform using Flutter, Firebase, and Gemini API for personalized learning, interactive support, and progress tracking.",
        right_x, y, right_w,
    )
    y = project(
        c, "TradePulse", "IN DEVELOPMENT",
        "Cross-platform investment tracker for iOS, Android, and macOS with watchlists, market data, portfolio analytics, and charts.",
        right_x, y, right_w,
    )

    y = section_title(c, "Working Style", right_x, y + 1, right_w)
    y = bullet(c, "Plan user flows and technical architecture before implementation.", right_x, y, right_w)
    y = bullet(c, "Translate design systems into polished, responsive Flutter interfaces.", right_x, y, right_w)
    y = bullet(c, "Test, optimize, and prepare production releases for mobile stores.", right_x, y, right_w)

    c.setStrokeColor(LINE)
    c.line(46, 31, PAGE_W - 46, 31)
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 7.2)
    c.drawString(46, 18, "Mohib Ahmad - Flutter Developer")
    c.drawRightString(PAGE_W - 46, 18, "Portfolio: mohibahmad.studio")

    c.save()
    shutil.copyfile(OUTPUT_PDF, SITE_PDF)
    encoded_pdf = base64.b64encode(OUTPUT_PDF.read_bytes()).decode("ascii")
    SITE_DATA.write_text(
        "window.__resumePdfBase64 = " + json.dumps(encoded_pdf) + ";\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    build_resume()
    print(OUTPUT_PDF)
    print(SITE_PDF)
    print(SITE_DATA)
