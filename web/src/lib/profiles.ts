// API key profiles. Browser profiles live in IndexedDB with a non-extractable
// CryptoKey; a key configured on the server appears as a built-in profile.
import type { KeyType } from "./jwt"

export const profileTones = {
  Sand: { background: "#f1c59e", color: "#81411f" },
  Orange: { background: "#fde0d1", color: "#b7451e" },
  Blue: { background: "#d9e8fa", color: "#1f5fb0" },
  Green: { background: "#d6f0e1", color: "#1e7045" },
  Violet: { background: "#e4e0fb", color: "#4f3fc0" },
  Rose: { background: "#fbdfe9", color: "#b02a62" },
  Graphite: { background: "#e6e3df", color: "#4e4944" },
}
export type ProfileTone = keyof typeof profileTones
export type ProfileGlyph = "initials" | "store" | "apps" | "team" | "tag" | "cloud" | "chart" | "globe" | "image"

export type Profile = {
  id: string
  name: string
  glyph: ProfileGlyph
  tone: ProfileTone
  image?: string
  keyType: KeyType
  keyId: string
  issuerId?: string
  keyFile: string
  // Absent for the server's key, which signs on the server.
  key?: CryptoKey
  server?: boolean
}

const dbName = "fire"
const store = "profiles"

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(store, { keyPath: "id" })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function run<T>(mode: IDBTransactionMode, action: (objects: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const request = action(db.transaction(store, mode).objectStore(store))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  }).finally(() => db.close()) as Promise<T>
}

export async function loadProfiles(): Promise<Profile[]> {
  try {
    const list = await run<Profile[]>("readonly", (objects) => objects.getAll() as IDBRequest<Profile[]>)
    return list.sort((a, b) => a.name.localeCompare(b.name))
  } catch {
    return []
  }
}

export const saveProfile = (profile: Profile) => run("readwrite", (objects) => objects.put(profile))
export const deleteProfile = (id: string) => run("readwrite", (objects) => objects.delete(id))

// Small per-profile preferences kept in localStorage.
type Prefs = { vendorNumber?: string; appId?: string }

export function readPrefs(profileId: string): Prefs {
  try {
    return JSON.parse(window.localStorage.getItem(`fire.prefs.${profileId}`) ?? "{}") as Prefs
  } catch {
    return {}
  }
}

export function writePrefs(profileId: string, prefs: Prefs) {
  try {
    window.localStorage.setItem(`fire.prefs.${profileId}`, JSON.stringify({ ...readPrefs(profileId), ...prefs }))
  } catch {
    // Preferences are a convenience only.
  }
}

export function readActiveProfile() {
  try {
    return window.localStorage.getItem("fire.activeProfile")
  } catch {
    return null
  }
}

export function writeActiveProfile(id: string) {
  try {
    window.localStorage.setItem("fire.activeProfile", id)
  } catch {
    // Not critical.
  }
}

export const profileInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("")

export const profileIconStyle = (tone: ProfileTone, glyph: ProfileGlyph) =>
  glyph === "image" ? { background: "#fff" } : profileTones[tone]
