import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { api, setTokenSource } from "./api"
import { signToken, tokenLifetimeSeconds } from "./jwt"
import { deleteProfile, loadProfiles, readActiveProfile, saveProfile, writeActiveProfile, type Profile } from "./profiles"
import type { Session } from "./types"
import { setCacheScope } from "./useApi"

type SessionState = {
  ready: boolean
  session: Session | null
  sessionError: boolean
  profiles: Profile[]
  active: Profile | null
  switchTo: (id: string) => void
  add: (profile: Profile) => Promise<void>
  remove: (id: string) => Promise<void>
}

const Context = createContext<SessionState | null>(null)

export const serverProfileId = "server"

// Builds a token source that re-signs shortly before the token expires.
function tokenSourceFor(profile: Profile | null) {
  if (!profile?.key) return async () => null
  let token = ""
  let expires = 0
  return async () => {
    const now = Date.now() / 1000
    if (!token || expires - now < 120) {
      token = await signToken(profile.key!, profile.keyId, profile.keyType, profile.issuerId)
      expires = now + tokenLifetimeSeconds
    }
    return token
  }
}

export function SessionProvider({ children, serverName }: { children: ReactNode; serverName: string }) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionError, setSessionError] = useState(false)
  const [stored, setStored] = useState<Profile[] | null>(null)
  const [activeId, setActiveId] = useState<string | null>(readActiveProfile)

  useEffect(() => {
    api<Session>("/session", { token: null })
      .then(setSession)
      .catch(() => setSessionError(true))
    void loadProfiles().then(setStored)
  }, [])

  const profiles = useMemo(() => {
    const list = [...(stored ?? [])]
    if (session?.serverKey) {
      list.unshift({
        id: serverProfileId,
        name: serverName,
        glyph: "cloud",
        tone: "Graphite",
        keyType: session.serverKey.keyType,
        keyId: session.serverKey.keyId,
        issuerId: session.serverKey.issuerId,
        keyFile: "",
        server: true,
      })
    }
    return list
  }, [stored, session, serverName])

  const ready = stored !== null && (session !== null || sessionError)
  const active = profiles.find((item) => item.id === activeId) ?? profiles[0] ?? null

  // Install the token source during render so child effects that fetch on
  // mount already use the active profile.
  const installed = useRef<string | null>(null)
  if (ready && installed.current !== (active?.id ?? "")) {
    installed.current = active?.id ?? ""
    setTokenSource(tokenSourceFor(active))
    setCacheScope(active?.id ?? "")
  }

  const switchTo = useCallback((id: string) => {
    writeActiveProfile(id)
    setActiveId(id)
  }, [])
  const add = useCallback(
    async (profile: Profile) => {
      await saveProfile(profile)
      setStored(await loadProfiles())
      switchTo(profile.id)
    },
    [switchTo],
  )
  const remove = useCallback(async (id: string) => {
    await deleteProfile(id)
    setStored(await loadProfiles())
  }, [])

  const value: SessionState = {
    ready,
    session,
    sessionError,
    profiles,
    active,
    switchTo,
    add,
    remove,
  }
  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useSession() {
  const value = useContext(Context)
  if (!value) throw new Error("useSession must be used inside SessionProvider")
  return value
}
