import fitz  # PyMuPDF
from dataclasses import dataclass

@dataclass
class ParsedPage:
    page_number: int
    text: str
    char_count: int

@dataclass
class ParsedDocument:
    pages: list[ParsedPage]
    total_pages: int
    total_chars: int
    filename: str

def parse_pdf(file_bytes: bytes, filename: str) -> ParsedDocument:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    total_pages = len(doc)
    pages = []

    for page_num in range(total_pages):
        page = doc[page_num]
        text = page.get_text("text")  # extract raw text

        # Skip nearly empty pages (cover pages, blank pages, etc.)
        if len(text.strip()) < 30:
            continue

        pages.append(ParsedPage(
            page_number=page_num + 1,  # 1-indexed for humans
            text=text.strip(),
            char_count=len(text.strip())
        ))

    doc.close()

    return ParsedDocument(
        pages=pages,
        total_pages=total_pages,
        total_chars=sum(p.char_count for p in pages),
        filename=filename
    )