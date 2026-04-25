import { useRef, useState, useEffect } from "react"
import { Upload, Loader2, CheckCircle, XCircle } from "lucide-react"
import { uploadDocument, getDocumentStatus, DocumentMeta } from "../lib/api"

interface Props {
  onReady: (doc: DocumentMeta) => void
}

type UploadState = "idle" | "uploading" | "processing" | "ready" | "failed"

interface Stage {
  label: string
  duration: number  // ms this stage roughly takes
  color: string
}

const STAGES: Stage[] = [
  { label: "Parsing",   duration: 3000,  color: "#d4a843" },
  { label: "Chunking",  duration: 4000,  color: "#d4a843" },
  { label: "Embedding", duration: 8000,  color: "#d4a843" },
]

// Simulated progress — moves fast at first, slows near 95%, waits for real "ready"
function useSimulatedProgress(active: boolean) {
  const [progress, setProgress] = useState(0)
  const [stageIndex, setStageIndex] = useState(0)
  const rafRef = useRef<number>()
  const startRef = useRef<number>(0)
  const stageStartRef = useRef<number>(0)

  useEffect(() => {
    if (!active) {
      setProgress(0)
      setStageIndex(0)
      return
    }

    startRef.current = performance.now()
    stageStartRef.current = performance.now()

    const totalDuration = STAGES.reduce((s, st) => s + st.duration, 0)
    // each stage occupies a % slice of the bar
    const stageWidths = STAGES.map(st => (st.duration / totalDuration) * 100)
    const stageOffsets = stageWidths.reduce<number[]>((acc, _w, i) => {
      acc.push(i === 0 ? 0 : acc[i - 1] + stageWidths[i - 1])
      return acc
    }, [])

    function tick(now: number) {
      const elapsed = now - startRef.current
      const stageElapsed = now - stageStartRef.current

      // Determine current stage
      let cumulative = 0
      let currentStage = 0
      for (let i = 0; i < STAGES.length; i++) {
        cumulative += STAGES[i].duration
        if (elapsed < cumulative) { currentStage = i; break }
        currentStage = STAGES.length - 1
      }
      setStageIndex(currentStage)

      // Ease-out progress within each stage — fast start, slows to 92%
      const stageDur = STAGES[currentStage].duration
      const stageProgress = Math.min(stageElapsed / stageDur, 1)
      const eased = 1 - Math.pow(1 - stageProgress, 2.5)  // ease-out cubic

      // Map to global progress — cap at 92% so "ready" signal snaps it to 100%
      const stageStart = stageOffsets[currentStage]
      const stageWidth = stageWidths[currentStage]
      const global = stageStart + eased * stageWidth * 0.92

      setProgress(Math.min(global, 92))

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [active])

  function complete() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    setProgress(100)
    setStageIndex(STAGES.length - 1)
  }

  return { progress, stageIndex, complete }
}

export function UploadZone({ onReady }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<UploadState>("idle")
  const [filename, setFilename] = useState("")
  const [error, setError] = useState("")
  const [dragOver, setDragOver] = useState(false)

  const isProcessing = state === "processing"
  const { progress, stageIndex, complete } = useSimulatedProgress(isProcessing)

  async function handleFile(file: File) {
    if (!file.name.endsWith(".pdf")) { setError("Only PDF files are supported"); return }
    setFilename(file.name)
    setError("")
    setState("uploading")

    try {
      const { document_id } = await uploadDocument(file)
      setState("processing")

      const poll = async () => {
        const status = await getDocumentStatus(document_id)
        if (status.status === "ready") {
          complete()         // snap bar to 100%
          setTimeout(() => {
            setState("ready")
            onReady(status)
          }, 500)            // brief pause so user sees 100%
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

      {/* Icon */}
      <div className="transition-transform duration-200">
        {state === "idle" && <Upload className="w-8 h-8 text-ink-400" />}
        {state === "uploading" && <Loader2 className="w-8 h-8 text-gold-400 animate-spin" />}
        {state === "processing" && (
          <div className="relative w-10 h-10">
            {/* Spinning ring */}
            <svg className="w-10 h-10 animate-spin" viewBox="0 0 40 40">
              <circle
                cx="20" cy="20" r="16"
                fill="none"
                stroke="#2a2820"
                strokeWidth="3"
              />
              <circle
                cx="20" cy="20" r="16"
                fill="none"
                stroke="#d4a843"
                strokeWidth="3"
                strokeDasharray={`${progress} 100`}
                strokeDashoffset="25"
                strokeLinecap="round"
                pathLength="100"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center
              font-mono text-xs text-gold-400">
              {Math.round(progress)}
            </span>
          </div>
        )}
        {state === "ready" && <CheckCircle className="w-8 h-8 text-emerald-400" />}
        {state === "failed" && <XCircle className="w-8 h-8 text-red-400" />}
      </div>

      {/* Label */}
      <div>
        <p className="font-body font-medium text-ink-100 text-sm">
          {state === "idle"       && "Drop your contract or NDA here"}
          {state === "uploading"  && "Uploading..."}
          {state === "processing" && "Processing document"}
          {state === "ready"      && "Document ready"}
          {state === "failed"     && "Something went wrong"}
        </p>
        <p className="font-mono text-xs text-ink-400 mt-1">
          {state === "idle"       && "PDF up to 50MB"}
          {state === "uploading"  && filename}
          {state === "processing" && filename}
          {state === "ready"      && filename}
          {state === "failed"     && error}
        </p>
      </div>

      {/* Progress bar — only during processing */}
      {state === "processing" && (
        <div className="w-full flex flex-col gap-3">

          {/* Linear bar */}
          <div className="w-full h-1.5 bg-ink-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #b8891f, #d4a843, #e8c96d)",
              }}
            />
          </div>

          {/* Stage pills */}
          <div className="flex items-center justify-center gap-2">
            {STAGES.map((stage, i) => {
              const isDone    = i < stageIndex
              const isActive  = i === stageIndex
              const isPending = i > stageIndex

              return (
                <div key={stage.label} className="flex items-center gap-2">
                  <div className={`
                    flex items-center gap-1.5 px-3 py-1 rounded-full
                    border text-xs font-mono transition-all duration-300
                    ${isDone
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : isActive
                      ? "border-gold-400/60 bg-gold-400/10 text-gold-300"
                      : "border-ink-700 bg-transparent text-ink-600"
                    }
                  `}>
                    {isDone && (
                      <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor"
                          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse" />
                    )}
                    {stage.label}
                  </div>

                  {/* Connector dot between pills */}
                  {i < STAGES.length - 1 && (
                    <span className={`w-1 h-1 rounded-full transition-colors duration-300
                      ${isDone ? "bg-emerald-500/40" : "bg-ink-700"}`}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* Percentage text */}
          <p className="font-mono text-xs text-ink-600 text-center">
            {Math.round(progress)}% complete
          </p>
        </div>
      )}
    </div>
  )
}