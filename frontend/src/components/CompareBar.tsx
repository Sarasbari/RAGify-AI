import { useState } from "react"
import { GitCompare, ChevronRight } from "lucide-react"
import { DocumentMeta } from "../lib/api"

interface Props {
  allDocs: DocumentMeta[]
  activeDoc: DocumentMeta
  onStartCompare: (docIds: string[]) => void
}

export function CompareBar({ allDocs, activeDoc, onStartCompare }: Props) {
  const [selectedId, setSelectedId] = useState<string>("")

  const readyDocs = allDocs.filter(
    d => d.status === "ready" && d.document_id !== activeDoc.document_id
  )

  if (readyDocs.length === 0) return null

  return (
    <div className="border-b border-ink-800 px-4 py-2.5 flex items-center gap-3
      bg-ink-900/40">
      <GitCompare className="w-3.5 h-3.5 text-gold-400 shrink-0" />
      <span className="font-mono text-xs text-ink-400 shrink-0">Compare with</span>

      <select
        value={selectedId}
        onChange={e => setSelectedId(e.target.value)}
        className="flex-1 bg-ink-900 border border-ink-700 rounded-lg
          text-xs font-body text-ink-200 px-2 py-1.5 outline-none
          focus:border-ink-500 cursor-pointer min-w-0"
      >
        <option value="">Select a document...</option>
        {readyDocs.map(d => (
          <option key={d.document_id} value={d.document_id}>
            {d.filename}
          </option>
        ))}
      </select>

      <button
        disabled={!selectedId}
        onClick={() => onStartCompare([activeDoc.document_id, selectedId])}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
          bg-gold-400 text-ink-950 text-xs font-body font-medium
          disabled:opacity-30 disabled:cursor-not-allowed
          hover:bg-gold-300 transition-colors shrink-0"
      >
        Compare
        <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  )
}