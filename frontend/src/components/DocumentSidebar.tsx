import { useState, useEffect } from "react"
import { FileText, Trash2, Upload, CheckCircle, Loader2, Clock } from "lucide-react"
import { listDocuments, uploadDocument, getDocumentStatus, DocumentMeta } from "../lib/api"

interface Props {
  activeDocId: string | null
  onSelect: (doc: DocumentMeta) => void
  onUploadReady: (doc: DocumentMeta) => void
}

export function DocumentSidebar({ activeDocId, onSelect, onUploadReady }: Props) {
  const [docs, setDocs] = useState<DocumentMeta[]>([])
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchDocs()
  }, [])

  async function fetchDocs() {
    const list = await listDocuments()
    setDocs(list)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)

    try {
      const { document_id } = await uploadDocument(file)

      // Add a placeholder while processing
      const placeholder: DocumentMeta = {
        document_id,
        filename: file.name,
        status: "processing",
        page_count: 0,
        uploaded_at: new Date().toISOString()
      }
      setDocs(prev => [placeholder, ...prev])

      // Poll until ready
      const poll = async () => {
        const status = await getDocumentStatus(document_id)
        setDocs(prev =>
          prev.map(d => d.document_id === document_id ? status : d)
        )
        if (status.status === "processing") {
          setTimeout(poll, 2000)
        } else if (status.status === "ready") {
          setUploading(false)
          onUploadReady(status)
        } else {
          setUploading(false)
        }
      }
      poll()

    } catch {
      setUploading(false)
    }

    // Reset input so same file can be re-uploaded
    e.target.value = ""
  }

  async function handleDelete(e: React.MouseEvent, docId: string) {
    e.stopPropagation() // prevent triggering onSelect
    setDeletingId(docId)

    try {
      await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/documents/${docId}`,
        { method: "DELETE" }
      )
      setDocs(prev => prev.filter(d => d.document_id !== docId))
    } finally {
      setDeletingId(null)
    }
  }

  const statusIcon = (doc: DocumentMeta) => {
    if (doc.status === "ready")
      return <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
    if (doc.status === "processing")
      return <Loader2 className="w-3 h-3 text-gold-400 animate-spin shrink-0" />
    return <Clock className="w-3 h-3 text-ink-500 shrink-0" />
  }

  return (
    <aside className="w-64 border-r border-ink-900 flex flex-col h-full shrink-0">

      {/* Header */}
      <div className="px-4 py-4 border-b border-ink-900 flex items-center justify-between">
        <span className="font-mono text-xs text-ink-400 uppercase tracking-widest">
          Documents
        </span>
        <label className={`
          cursor-pointer flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
          border border-ink-700 hover:border-ink-500 transition-colors
          text-xs font-body text-ink-300 hover:text-ink-100
          ${uploading ? "opacity-50 pointer-events-none" : ""}
        `}>
          {uploading
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <Upload className="w-3 h-3" />
          }
          Upload
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleUpload}
          />
        </label>
      </div>

      {/* Doc list */}
      <div className="flex-1 overflow-y-auto py-2">
        {docs.length === 0 && (
          <p className="text-xs font-mono text-ink-600 text-center mt-8 px-4">
            No documents yet.<br />Upload a PDF to start.
          </p>
        )}

        {docs.map(doc => (
          <div
            key={doc.document_id}
            onClick={() => doc.status === "ready" && onSelect(doc)}
            className={`
              group flex items-start gap-3 px-4 py-3 transition-all duration-150
              ${doc.status === "ready" ? "cursor-pointer" : "cursor-default"}
              ${activeDocId === doc.document_id
                ? "bg-ink-800 border-r-2 border-gold-400"
                : "hover:bg-ink-900/60 border-r-2 border-transparent"
              }
            `}
          >
            <FileText className="w-4 h-4 text-ink-500 shrink-0 mt-0.5" />

            <div className="flex-1 min-w-0">
              <p className={`text-xs font-body truncate leading-tight ${
                activeDocId === doc.document_id ? "text-ink-100" : "text-ink-300"
              }`}>
                {doc.filename}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                {statusIcon(doc)}
                <span className="text-xs font-mono text-ink-600">
                  {doc.status === "ready"
                    ? `${doc.page_count}p`
                    : doc.status
                  }
                </span>
              </div>
            </div>

            {/* Delete button — only visible on hover */}
            {doc.status === "ready" && (
              <button
                onClick={(e) => handleDelete(e, doc.document_id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity
                  p-1 rounded hover:bg-red-500/10 text-ink-600 hover:text-red-400"
              >
                {deletingId === doc.document_id
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : <Trash2 className="w-3 h-3" />
                }
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-ink-900">
        <p className="font-mono text-xs text-ink-700 text-center">
          {docs.filter(d => d.status === "ready").length} doc
          {docs.filter(d => d.status === "ready").length !== 1 ? "s" : ""} ready
        </p>
      </div>
    </aside>
  )
}