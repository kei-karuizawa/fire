import { useState, type ReactNode } from "react"
import type { App } from "../lib/types"

// The app's icon, or the fallback while there is none or it fails to load.
export default function AppMark({ app, fallback }: { app?: App; fallback?: ReactNode }) {
  const [failed, setFailed] = useState<string>()
  if (app?.iconUrl && app.iconUrl !== failed) return <img className="app-mark" src={app.iconUrl} alt="" onError={() => setFailed(app.iconUrl)} />
  return fallback ?? app?.name.charAt(0)
}
