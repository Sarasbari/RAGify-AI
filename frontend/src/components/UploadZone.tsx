import { useRef, useState } from "react"
import { Upload, Loader2, CheckCircle, XCircle } from "lucide-react"
import { uploadDocument, getDocumentStatus, DocumentMeta } from "../lib/api"

interface Props {
  onReady: (doc: DocumentMeta) => void
}

type UploadState = "idle" | "uploading" | "processing" | "ready" | "failed"

export function UploadZone({ onReady }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<UploadState>("idle")
  const [filename, setFilename] = useState("")
  const [error, setError] = useState("")
  const [dragOver, setDragOver] = useState(false)

  async function handleFile(file: File) {
    if (!file.name.endsWith(".pdf")) {
      setError("Only PDF files are supported")
      return
    }

    setFilename(file.name)
    setError("")
    setState("uploading")

    try {
      const { document_id } = await uploadDocument(file)
      setState("processing")

      // Poll every 2 seconds until ready
      const poll = async () => {
        const status = await getDocumentStatus(document_id)
        if (status.status === "ready") {
          setState("ready")
          onReady(status)
        } else if (status.status === "failed") {
          setState("failed")
          setError("Processing failed. Try a different PDF.")
        } else {
          setTimeout(poll, 2000)
        }
      }
      poll()

    } catch (e: any) {
      setState("failed")
      setError(e.message || "Upload failed")
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const statusConfig = {
    idle: {
      icon: <Upload className="w-8 h-8 text-ink-400" />,
      label: "Drop your contract or NDA here",
      sub: "PDF up to 50MB",
    },
    uploading: {
      icon: <Loader2 className="w-8 h-8 text-gold-400 animate-spin" />,
      label: "Uploading...",
      sub: filename,
    },
    processing: {
      icon: <Loader2 className="w-8 h-8 text-gold-400 animate-spin" />,
      label: "Processing document",
      sub: "Parsing → Chunking → Embedding",
    },
    ready: {
      icon: <CheckCircle className="w-8 h-8 text-emerald-400" />,
      label: "Document ready",
      sub: filename,
    },
    failed: {
      icon: <XCircle className="w-8 h-8 text-red-400" />,
      label: "Something went wrong",
      sub: error,
    },
  }

  const cfg = statusConfig[state]
  const isActive = state === "idle" || state === "failed"

  return (
    <div
      onClick={() => isActive && inputRef.current?.click()}
      onDrop={onDrop}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      className={`
        relative border rounded-xl p-10 text-center transition-all duration-200
        flex flex-col items-center gap-4
        ${isActive ? "cursor-pointer" : "cursor-default"}
        ${dragOver
          ? "border-gold-400 bg-gold-400/5"
          : "border-ink-700 hover:border-ink-500 bg-ink-900/40"
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      <div className="transition-transform duration-200">
        {cfg.icon}
      </div>

      <div>
        <p className="font-body font-medium text-ink-100 text-sm">{cfg.label}</p>
        <p className="font-mono text-xs text-ink-400 mt-1">{cfg.sub}</p>
      </div>

      {state === "processing" && (
        <div className="flex gap-1 mt-1">
          {["Parsing", "Chunking", "Embedding"].map((step, i) => (
            <span
              key={step}
              className="text-xs font-mono px-2 py-0.5 rounded-full border border-ink-700 text-ink-400"
              style={{ animationDelay: `${i * 0.2}s` }}
            >
              {step}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}