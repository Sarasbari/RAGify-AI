import { useState, useRef, useEffect } from "react"
import { Send, Bot, User } from "lucide-react"
import { streamQuery, Citation, DocumentMeta } from "../lib/api"
import { CitationPanel } from "./CitationPanel"

interface Message {
  role: "user" | "assistant"
  content: string
  citations?: Citation[]
  streaming?: boolean
}

interface Props {
  document: DocumentMeta
}

const SUGGESTED = [
  "What are the termination conditions?",
  "What are the payment terms?",
  "What are the confidentiality obligations?",
  "Who are the parties involved?",
]

export function ChatInterface({ document }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function ask(question: string) {
    if (!question.trim() || loading) return

    const userMsg: Message = { role: "user", content: question }
    const assistantMsg: Message = { role: "assistant", content: "", streaming: true }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setInput("")
    setLoading(true)

    await streamQuery(
      question,
      document.document_id,

      // onToken — append each token to the last message
      (token) => {
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          updated[updated.length - 1] = {
            ...last,
            content: last.content + token
          }
          return updated
        })
      },

      // onDone — attach citations, mark streaming finished
      (citations) => {
        setMessages(prev => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          updated[updated.length - 1] = {
            ...last,
            citations,
            streaming: false
          }
          return updated
        })
        setLoading(false)
      },

      // onError
      (err) => {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: "assistant",
            content: `Error: ${err}`,
            streaming: false
          }
          return updated
        })
        setLoading(false)
      }
    )
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      ask(input)
    }
  }

  return (
    <div className="flex flex-col h-full">

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-2 py-4 flex flex-col gap-6">

        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 animate-fade-up">
            <div className="text-center">
              <p className="font-display text-2xl text-ink-200 mb-1">
                Ask about your document
              </p>
              <p className="font-mono text-xs text-ink-500">
                {document.filename} · {document.page_count} pages
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-sm">
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  onClick={() => ask(q)}
                  className="text-left text-sm font-body text-ink-300 px-4 py-2.5
                    border border-ink-800 rounded-lg hover:border-ink-600
                    hover:text-ink-100 hover:bg-ink-900/60 transition-all duration-150"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 animate-fade-up ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-gold-400/10 border border-gold-400/20
                flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-gold-400" />
              </div>
            )}

            <div className={`max-w-[80%] ${msg.role === "user" ? "order-first" : ""}`}>
              {msg.role === "user" ? (
                <div className="bg-ink-800 rounded-2xl rounded-tr-sm px-4 py-3">
                  <p className="text-sm font-body text-ink-100 leading-relaxed">
                    {msg.content}
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-ink-900 border border-ink-800">
                  <p className="text-sm font-body text-ink-200 leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                    {msg.streaming && (
                      <span className="inline-flex gap-0.5 ml-1 align-middle">
                        {[0, 1, 2].map(i => (
                          <span
                            key={i}
                            className="w-1 h-1 rounded-full bg-gold-400 animate-pulse-dot"
                            style={{ animationDelay: `${i * 0.16}s` }}
                          />
                        ))}
                      </span>
                    )}
                  </p>
                  {!msg.streaming && msg.citations && (
                    <CitationPanel citations={msg.citations} />
                  )}
                </div>
              )}
            </div>

            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-ink-700 border border-ink-600
                flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5 text-ink-300" />
              </div>
            )}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-ink-800 px-3 py-3">
        <div className="flex gap-2 items-end bg-ink-900 border border-ink-700
          rounded-xl px-3 py-2 focus-within:border-ink-500 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={loading}
            placeholder="Ask anything about this document..."
            rows={1}
            className="flex-1 bg-transparent text-sm font-body text-ink-100
              placeholder-ink-600 resize-none outline-none leading-relaxed
              max-h-32 overflow-y-auto py-1 disabled:opacity-50"
          />
          <button
            onClick={() => ask(input)}
            disabled={loading || !input.trim()}
            className="w-8 h-8 rounded-lg bg-gold-400 hover:bg-gold-300
              disabled:opacity-30 disabled:cursor-not-allowed
              flex items-center justify-center shrink-0 transition-all duration-150
              active:scale-95"
          >
            <Send className="w-3.5 h-3.5 text-ink-950" />
          </button>
        </div>
        <p className="text-center text-xs font-mono text-ink-700 mt-2">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}