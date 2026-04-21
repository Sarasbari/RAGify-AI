import { useState } from "react"
import { FileText, Zap } from "lucide-react"
import { UploadZone } from "./components/UploadZone"
import { ChatInterface } from "./components/ChatInterface"
import { DocumentMeta } from "./lib/api"
import "./index.css"

export default function App() {
  const [activeDoc, setActiveDoc] = useState<DocumentMeta | null>(null)

  return (
    <div className="min-h-screen bg-ink-950 flex flex-col">

      {/* Header */}
      <header className="border-b border-ink-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gold-400/10 border border-gold-400/20
            flex items-center justify-center">
            <Zap className="w-4 h-4 text-gold-400" />
          </div>
          <span className="font-display text-lg text-ink-100 tracking-tight">
            Ragify<span className="text-gold-400">AI</span>
          </span>
        </div>

        {activeDoc && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg
            bg-ink-900 border border-ink-800">
            <FileText className="w-3.5 h-3.5 text-ink-400" />
            <span className="font-mono text-xs text-ink-300 max-w-[200px] truncate">
              {activeDoc.filename}
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </div>
        )}
      </header>

      {/* Main */}
      <main className="flex-1 flex overflow-hidden">

        {!activeDoc ? (
          /* Upload screen */
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-lg animate-fade-up">
              <div className="text-center mb-10">
                <h1 className="font-display text-5xl text-ink-50 leading-tight mb-3">
                  Legal documents,<br />
                  <span className="text-gold-400">answered instantly.</span>
                </h1>
                <p className="font-body text-ink-400 text-base leading-relaxed">
                  Upload any contract or NDA. Ask questions in plain English.<br />
                  Get precise answers with exact clause citations.
                </p>
              </div>
              <UploadZone onReady={setActiveDoc} />
            </div>
          </div>
        ) : (
          /* Chat screen */
          <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full
            border-x border-ink-900 overflow-hidden">
            <ChatInterface document={activeDoc} />
          </div>
        )}
      </main>
    </div>
  )
}