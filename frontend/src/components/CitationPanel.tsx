import { Citation } from "../lib/api"
import { BookOpen, FileText } from "lucide-react"

interface Props {
  citations: Citation[]
}

export function CitationPanel({ citations }: Props) {
  if (!citations.length) return null

  // Check if this is a multi-doc response
  const isMultiDoc = citations.some(c => (c as any).document_name)

  return (
    <div className="mt-4 border-t border-ink-800 pt-4">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-3.5 h-3.5 text-gold-400" />
        <span className="text-xs font-mono text-gold-400 uppercase tracking-widest">
          Sources
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {citations.map((c: any) => (
          <div
            key={c.source_index}
            className="flex gap-3 p-3 rounded-lg bg-ink-900
              border border-ink-800 animate-fade-up"
          >
            <span className="font-mono text-xs text-gold-400 mt-0.5 shrink-0">
              [{c.source_index}]
            </span>
            <div className="min-w-0">
              {isMultiDoc && c.document_name && (
                <div className="flex items-center gap-1 mb-1">
                  <FileText className="w-3 h-3 text-ink-500" />
                  <span className="font-mono text-xs text-ink-400 truncate">
                    {c.document_name.replace(".pdf", "")}
                  </span>
                </div>
              )}
              <span className="font-mono text-xs text-ink-500 block mb-1">
                Page {c.page_number}
              </span>
              <p className="text-xs text-ink-300 leading-relaxed line-clamp-2">
                {c.preview}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}