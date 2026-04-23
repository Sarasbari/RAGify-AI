const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000"

export interface DocumentMeta {
  document_id: string
  filename: string
  status: "processing" | "ready" | "failed"
  page_count: number
  uploaded_at: string
}

export interface Citation {
  source_index: number
  page_number: number
  chunk_index: number
  preview: string
}

// Upload a PDF, returns document_id immediately
export async function uploadDocument(file: File): Promise<{ document_id: string; status: string }> {
  const form = new FormData()
  form.append("file", file)
  const res = await fetch(`${BASE}/api/documents/upload`, { method: "POST", body: form })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// Poll until status = ready | failed
export async function getDocumentStatus(id: string): Promise<DocumentMeta> {
  const res = await fetch(`${BASE}/api/documents/${id}/status`)
  if (!res.ok) throw new Error("Failed to fetch status")
  return res.json()
}

// List all documents
export async function listDocuments(): Promise<DocumentMeta[]> {
  const res = await fetch(`${BASE}/api/documents/`)
  if (!res.ok) return []
  return res.json()
}

// Stream a RAG query — calls onToken for each token, onDone with citations
export async function streamQuery(
  question: string,
  documentId: string,
  onToken: (token: string) => void,
  onDone: (citations: Citation[]) => void,
  onError: (err: string) => void
) {
  const res = await fetch(`${BASE}/api/query/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, document_id: documentId }),
  })

  if (!res.ok) {
    onError("Query failed. Is the document ready?")
    return
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let fullText = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue
      const data = line.slice(6)
      if (data === "[DONE]") continue

      // Restore escaped newlines
      const token = data.replace(/\\n/g, "\n")

      // Check if this token contains citations
      if (token.includes("__CITATIONS__")) {
        const parts = token.split("__CITATIONS__")
        const textPart = parts[0]
        const citationRaw = parts[1]?.replace("__END_CITATIONS__", "")

        if (textPart) onToken(textPart)

        try {
          const citations: Citation[] = JSON.parse(citationRaw)
          onDone(citations)
        } catch {
          onDone([])
        }
        return
      }

      fullText += token
      onToken(token)
    }
  }

  onDone([])
}

export async function streamCompare(
  question: string,
  documentIds: string[],
  onToken: (token: string) => void,
  onDone: (citations: Citation[]) => void,
  onError: (err: string) => void
) {
  const res = await fetch(`${BASE}/api/query/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, document_ids: documentIds }),
  })

  if (!res.ok) {
    onError("Comparison failed. Are both documents ready?")
    return
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue
      const data = line.slice(6)
      if (data === "[DONE]") continue

      const token = data.replace(/\\n/g, "\n")

      if (token.includes("__CITATIONS__")) {
        const parts = token.split("__CITATIONS__")
        if (parts[0]) onToken(parts[0])
        try {
          onDone(JSON.parse(parts[1].replace("__END_CITATIONS__", "")))
        } catch { onDone([]) }
        return
      }

      onToken(token)
    }
  }

  onDone([])
}