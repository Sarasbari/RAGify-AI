from dataclasses import dataclass
from app.services.pdf_parser import ParsedDocument

@dataclass
class Chunk:
    content: str
    page_number: int
    chunk_index: int
    document_id: str = ""
    char_count: int = 0

def _split_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    """
    Recursive character splitter.
    Tries to split on paragraphs first, then sentences, then words, then chars.
    This preserves meaning better than naive fixed-size splits.
    """
    separators = ["\n\n", "\n", ". ", " ", ""]
    
    def split_recursive(text: str, separators: list[str]) -> list[str]:
        if not separators:
            # Last resort: hard split by character count
            return [text[i:i+chunk_size] for i in range(0, len(text), chunk_size - overlap)]

        sep = separators[0]
        splits = text.split(sep) if sep else list(text)
        
        chunks = []
        current = ""

        for split in splits:
            candidate = current + (sep if current else "") + split

            if len(candidate) <= chunk_size:
                current = candidate
            else:
                if current:
                    chunks.append(current)
                # If a single split is larger than chunk_size, recurse
                if len(split) > chunk_size:
                    chunks.extend(split_recursive(split, separators[1:]))
                    current = ""
                else:
                    current = split

        if current:
            chunks.append(current)

        return chunks

    raw_chunks = split_recursive(text, separators)

    # Apply overlap: each chunk starts with the tail of the previous chunk
    final_chunks = []
    for i, chunk in enumerate(raw_chunks):
        if i == 0:
            final_chunks.append(chunk)
        else:
            # Take last `overlap` chars of previous chunk and prepend
            prev_tail = final_chunks[-1][-overlap:] if len(final_chunks[-1]) > overlap else final_chunks[-1]
            final_chunks.append(prev_tail + " " + chunk)

    return [c.strip() for c in final_chunks if c.strip()]


def chunk_document(
    parsed_doc: ParsedDocument,
    chunk_size: int = 600,
    overlap: int = 100
) -> list[Chunk]:
    chunks = []
    chunk_index = 0

    for page in parsed_doc.pages:
        page_chunks = _split_text(page.text, chunk_size, overlap)

        for raw_chunk in page_chunks:
            if len(raw_chunk.strip()) < 50:  # skip tiny fragments
                continue

            chunks.append(Chunk(
                content=raw_chunk.strip(),
                page_number=page.page_number,
                chunk_index=chunk_index,
                char_count=len(raw_chunk.strip())
            ))
            chunk_index += 1

    return chunks