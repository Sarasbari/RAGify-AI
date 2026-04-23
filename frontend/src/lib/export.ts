import jsPDF from "jspdf"
import { Citation } from "./api"

interface ExportOptions {
  question: string
  answer: string
  citations: Citation[]
  documentName: string
}

export async function exportToPdf({
  question,
  answer,
  citations,
  documentName,
}: ExportOptions): Promise<void> {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  const PAGE_W = 210
  const PAGE_H = 297
  const MARGIN = 20
  const CONTENT_W = PAGE_W - MARGIN * 2
  let y = MARGIN

  // ── Helpers ──────────────────────────────────────────────

  function checkPageBreak(neededHeight: number) {
    if (y + neededHeight > PAGE_H - MARGIN) {
      pdf.addPage()
      y = MARGIN
    }
  }

  function drawText(
    text: string,
    x: number,
    fontSize: number,
    color: [number, number, number],
    maxWidth: number,
    lineHeight = 6
  ): number {
    pdf.setFontSize(fontSize)
    pdf.setTextColor(...color)
    const lines = pdf.splitTextToSize(text, maxWidth)
    const blockHeight = lines.length * lineHeight
    checkPageBreak(blockHeight)
    pdf.text(lines, x, y)
    y += blockHeight
    return blockHeight
  }

  function drawHRule(color: [number, number, number] = [50, 45, 35]) {
    checkPageBreak(4)
    pdf.setDrawColor(...color)
    pdf.setLineWidth(0.3)
    pdf.line(MARGIN, y, PAGE_W - MARGIN, y)
    y += 4
  }

  // ── Header ───────────────────────────────────────────────

  // Dark header bar
  pdf.setFillColor(14, 13, 9)
  pdf.rect(0, 0, PAGE_W, 28, "F")

  pdf.setFontSize(16)
  pdf.setTextColor(212, 168, 67)   // gold-400
  pdf.setFont("helvetica", "bold")
  pdf.text("RagifyAI", MARGIN, 13)

  pdf.setFontSize(8)
  pdf.setTextColor(136, 135, 128)  // ink-400
  pdf.setFont("helvetica", "normal")
  pdf.text("Legal Document Intelligence", MARGIN, 20)

  // Timestamp top-right
  const now = new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  })
  pdf.setFontSize(7)
  pdf.setTextColor(90, 88, 80)
  pdf.text(now, PAGE_W - MARGIN, 20, { align: "right" })

  y = 36

  // ── Document name ─────────────────────────────────────────

  pdf.setFontSize(8)
  pdf.setTextColor(90, 88, 80)
  pdf.setFont("helvetica", "normal")
  pdf.text(`Source: ${documentName}`, MARGIN, y)
  y += 8

  drawHRule([40, 37, 28])

  // ── Question ─────────────────────────────────────────────

  y += 2
  pdf.setFont("helvetica", "bold")
  drawText("Question", MARGIN, 8, [136, 135, 128], CONTENT_W)
  y += 2

  pdf.setFont("helvetica", "bold")
  drawText(question, MARGIN, 12, [232, 230, 223], CONTENT_W, 7)
  y += 6

  drawHRule()

  // ── Answer ───────────────────────────────────────────────

  y += 2
  pdf.setFont("helvetica", "bold")
  drawText("Answer", MARGIN, 8, [136, 135, 128], CONTENT_W)
  y += 2

  pdf.setFont("helvetica", "normal")

  // Split answer into paragraphs — preserve Claude's formatting
  const paragraphs = answer.split("\n\n").filter(Boolean)
  for (const para of paragraphs) {
    const trimmed = para.trim()
    if (!trimmed) continue

    // Detect if this looks like a heading (short, ends without period)
    const isHeading = trimmed.length < 60 && !trimmed.endsWith(".")
    if (isHeading && paragraphs.length > 1) {
      y += 2
      pdf.setFont("helvetica", "bold")
      drawText(trimmed, MARGIN, 10, [212, 168, 67], CONTENT_W, 6)
      pdf.setFont("helvetica", "normal")
    } else {
      drawText(trimmed, MARGIN, 10, [200, 198, 188], CONTENT_W, 6)
    }
    y += 3
  }

  // ── Citations ────────────────────────────────────────────

  if (citations.length > 0) {
    y += 4
    drawHRule()
    y += 2

    pdf.setFont("helvetica", "bold")
    drawText("Sources", MARGIN, 8, [136, 135, 128], CONTENT_W)
    y += 2

    for (const c of citations as any[]) {
      checkPageBreak(20)

      // Citation card background
      pdf.setFillColor(26, 25, 16)
      pdf.roundedRect(MARGIN, y, CONTENT_W, 18, 2, 2, "F")

      // Source index badge
      pdf.setFillColor(212, 168, 67)
      pdf.roundedRect(MARGIN + 3, y + 3, 12, 12, 1, 1, "F")
      pdf.setFontSize(8)
      pdf.setTextColor(14, 13, 9)
      pdf.setFont("helvetica", "bold")
      pdf.text(`${c.source_index}`, MARGIN + 9, y + 10, { align: "center" })

      // Doc name + page
      pdf.setFontSize(7)
      pdf.setTextColor(90, 88, 80)
      pdf.setFont("helvetica", "normal")
      const label = c.document_name
        ? `${c.document_name.replace(".pdf", "")} — Page ${c.page_number}`
        : `Page ${c.page_number}`
      pdf.text(label, MARGIN + 18, y + 8)

      // Preview text
      pdf.setFontSize(7)
      pdf.setTextColor(136, 135, 128)
      const preview = pdf.splitTextToSize(c.preview || "", CONTENT_W - 20)
      pdf.text(preview[0], MARGIN + 18, y + 14)

      y += 22
    }
  }

  // ── Footer on every page ──────────────────────────────────

  const totalPages = (pdf as any).internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i)
    pdf.setFontSize(7)
    pdf.setTextColor(64, 61, 46)
    pdf.text(
      `Ragify AI  ·  Page ${i} of ${totalPages}`,
      PAGE_W / 2,
      PAGE_H - 8,
      { align: "center" }
    )
  }

  // ── Save ──────────────────────────────────────────────────

  const safeName = documentName.replace(".pdf", "").replace(/[^a-z0-9]/gi, "_")
  pdf.save(`ragify_${safeName}_${Date.now()}.pdf`)
}