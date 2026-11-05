import { useEffect, useState } from "react"

// A tiny history-API router: Fire's routes are few and flat.

export type Route = { path: string; params: URLSearchParams }

const read = (): Route => ({ path: window.location.pathname, params: new URLSearchParams(window.location.search) })
const listeners = new Set<() => void>()

export function navigate(to: string, options: { replace?: boolean } = {}) {
  if (to === window.location.pathname + window.location.search) return
  if (options.replace) window.history.replaceState(null, "", to)
  else window.history.pushState(null, "", to)
  listeners.forEach((listener) => listener())
}

// Updates one query parameter without adding a history entry.
export function setParam(name: string, value: string | null) {
  const params = new URLSearchParams(window.location.search)
  if (value === null) params.delete(name)
  else params.set(name, value)
  const query = params.toString()
  navigate(window.location.pathname + (query ? `?${query}` : ""), { replace: true })
}

export function useRoute(): Route {
  const [route, setRoute] = useState(read)
  useEffect(() => {
    const update = () => setRoute(read())
    listeners.add(update)
    window.addEventListener("popstate", update)
    return () => {
      listeners.delete(update)
      window.removeEventListener("popstate", update)
    }
  }, [])
  return route
}

export const sections = ["dashboard", "metadata", "review", "builds", "purchases", "analytics"] as const
export type Section = (typeof sections)[number] | "team"

export function parseRoute(path: string): { appId?: string; section?: Section } {
  if (path === "/team") return { section: "team" }
  const match = /^\/apps\/([A-Za-z0-9._-]+)(?:\/([a-z]+))?\/?$/.exec(path)
  if (!match) return {}
  const section = sections.find((item) => item === match[2]) ?? "dashboard"
  return { appId: match[1], section }
}
