import { useState } from "react"
import { Copy, Check, FileDown, Loader2 } from "lucide-react"
import { Citation } from "../lib/api"

type CitationWithOptionalDocumentName = Citation & { document_name?: string }

function getCitationDocumentName(citation: Citation) {
  return (citation as CitationWithOptionalDocumentName).document_name
}

async function exportToPdf({
  question,
  answer,
  citations,
  documentName,
}: {
  question: string
  answer: string
  citations: Citation[]
  documentName: string
}) {
  const sources = citations.length
    ? `<h3>Sources</h3><ul>${citations.map((c) => {
        const citationDocumentName = getCitationDocumentName(c)
        return `<li>[${c.source_index}] ${citationDocumentName ? `${citationDocumentName} — ` : ""}Page ${c.page_number}: ${c.preview}</li>`
      }).join("")}</ul>`
    : ""

  const html = `
    <html>
      <head>
        <title>${documentName || "Export"}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; line-height: 1.5; }
          h1, h2, h3 { margin-bottom: 8px; }
          p { white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <h1>${documentName || "Document"}</h1>
        <h2>Question</h2>
        <p>${question}</p>
        <h2>Answer</h2>
        <p>${answer}</p>
        ${sources}
      </body>
    </html>
  `

  const printWindow = window.open("", "_blank")
  if (!printWindow) throw new Error("Unable to open print window")

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
  printWindow.close()
}

interface Props {
  content: string
  citations: Citation[]
  question: string
  documentName: string
}

export function MessageActions({ content, citations, question, documentName }: Props) {
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)

  async function handleCopy() {
    // Build a clean plain-text version with citations appended
    const citationText = citations.length
      ? "\n\nSources:\n" + citations.map((c) => {
          const citationDocumentName = getCitationDocumentName(c)
          return `[${c.source_index}] ${citationDocumentName ? citationDocumentName + " — " : ""}Page ${c.page_number}: ${c.preview}`
        }).join("\n")
      : ""

    await navigator.clipboard.writeText(content + citationText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleExport() {
    setExporting(true)
    try {
      await exportToPdf({ question, answer: content, citations, documentName })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex items-center gap-1 mt-3 pt-3 border-t border-ink-800/60">
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
          text-xs font-mono transition-all duration-150
          text-ink-500 hover:text-ink-200 hover:bg-ink-800"
      >
        {copied
          ? <Check className="w-3 h-3 text-emerald-400" />
          : <Copy className="w-3 h-3" />
        }
        {copied ? "Copied" : "Copy"}
      </button>

      <button
        onClick={handleExport}
        disabled={exporting}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
          text-xs font-mono transition-all duration-150
          text-ink-500 hover:text-ink-200 hover:bg-ink-800
          disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {exporting
          ? <Loader2 className="w-3 h-3 animate-spin" />
          : <FileDown className="w-3 h-3" />
        }
        {exporting ? "Generating..." : "Export PDF"}
      </button>
    </div>
  )
}