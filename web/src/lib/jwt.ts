// Signs App Store Connect tokens in the browser with WebCrypto. The private
// key is imported as non-extractable, so page scripts can sign with it but
// cannot read it back, and it never leaves this browser.

export type KeyType = "team" | "individual"

export function canSignInBrowser() {
  return typeof window !== "undefined" && window.isSecureContext && Boolean(window.crypto?.subtle)
}

export async function importP8(text: string): Promise<CryptoKey> {
  const match = /-----BEGIN PRIVATE KEY-----([\s\S]+?)-----END PRIVATE KEY-----/.exec(text)
  if (!match) throw new Error("not-pkcs8")
  const der = Uint8Array.from(atob(match[1].replace(/\s+/g, "")), (char) => char.charCodeAt(0))
  try {
    return await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"])
  } catch {
    throw new Error("not-p256")
  }
}

const encoder = new TextEncoder()

function base64url(data: Uint8Array | string) {
  const bytes = typeof data === "string" ? encoder.encode(data) : data
  let binary = ""
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)))
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export const tokenLifetimeSeconds = 10 * 60

export async function signToken(key: CryptoKey, keyId: string, keyType: KeyType, issuerId?: string) {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: "ES256", kid: keyId, typ: "JWT" }
  const claims: Record<string, unknown> = { iat: now, exp: now + tokenLifetimeSeconds, aud: "appstoreconnect-v1" }
  if (keyType === "individual") claims.sub = "user"
  else claims.iss = issuerId
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`
  // WebCrypto returns the raw R || S form JWS expects.
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, encoder.encode(unsigned))
  return `${unsigned}.${base64url(new Uint8Array(signature))}`
}
