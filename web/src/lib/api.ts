export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export type TokenSource = () => Promise<string | null>

let tokenSource: TokenSource = async () => null

// The active profile installs its token source; server profiles send none.
export function setTokenSource(source: TokenSource) {
  tokenSource = source
}

export async function api<T>(path: string, init: { method?: string; body?: unknown; token?: string | null } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" }
  const token = init.token !== undefined ? init.token : await tokenSource()
  if (token) headers["X-App-Store-Token"] = token
  if (init.body !== undefined) headers["Content-Type"] = "application/json"
  let response: Response
  try {
    response = await fetch(`/api/v1${path}`, {
      method: init.method ?? "GET",
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      credentials: "same-origin",
    })
  } catch {
    throw new ApiError(0, "network", "")
  }
  const text = await response.text()
  let data: unknown = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    // A proxy or old server may answer with HTML.
  }
  if (!response.ok) {
    const error = (data as { error?: { code?: string; message?: string } } | null)?.error
    throw new ApiError(response.status, error?.code ?? "http", error?.message ?? "")
  }
  return data as T
}
