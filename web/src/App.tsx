import { useEffect } from "react"
import AddProfileDialog from "./components/AddProfileDialog"
import Sidebar, { Brand, LanguageButtons } from "./components/Sidebar"
import { Empty, LoadState, ToastProvider, useToast } from "./components/ui"
import { I18nProvider, useI18n } from "./i18n"
import { readPrefs, writePrefs } from "./lib/profiles"
import { navigate, parseRoute, useRoute } from "./lib/router"
import { SessionProvider, useSession } from "./lib/session"
import type { App as AppSummary } from "./lib/types"
import { useApi } from "./lib/useApi"
import Analytics from "./pages/Analytics"
import Builds from "./pages/Builds"
import Dashboard from "./pages/Dashboard"
import Metadata from "./pages/Metadata"
import Purchases from "./pages/Purchases"
import Review from "./pages/Review"
import Team from "./pages/Team"

export default function App() {
  return (
    <I18nProvider>
      <ToastProvider>
        <Session />
      </ToastProvider>
    </I18nProvider>
  )
}

function Session() {
  const { t } = useI18n()
  return (
    <SessionProvider serverName={t("profile.serverName")}>
      <Root />
    </SessionProvider>
  )
}

function Root() {
  const { ready, active, sessionError } = useSession()
  if (!ready) {
    return (
      <div className="stage boot">
        <LoadState loading />
      </div>
    )
  }
  if (!active) return <Welcome backendDown={sessionError} />
  // A new profile starts with fresh state and data.
  return <Shell key={active.id} />
}

function Welcome({ backendDown }: { backendDown: boolean }) {
  const { t } = useI18n()
  const notify = useToast()
  const { profiles, add } = useSession()
  return (
    <div className="stage welcome">
      <div className="welcome-card">
        <Brand />
        <h1>{t("welcome.title")}</h1>
        <p>{t("welcome.body")}</p>
        {backendDown && <p className="profile-form-hint warning">{t("welcome.backendDown")}</p>}
        <LanguageButtons />
      </div>
      {!backendDown && (
        <AddProfileDialog
          profiles={profiles}
          closable={false}
          onClose={() => undefined}
          onAdd={async (profile) => {
            await add(profile)
            notify(t("profile.added", { name: profile.name }))
          }}
        />
      )}
    </div>
  )
}

function Shell() {
  const { t } = useI18n()
  const { active } = useSession()
  const route = useRoute()
  const { appId, section } = parseRoute(route.path)
  const apps = useApi<{ apps: AppSummary[] }>("/apps")
  const list = apps.data?.apps
  // Pages outside an app, such as Users and access, keep showing the last app used.
  const rememberedId = active ? readPrefs(active.id).appId : undefined
  const app = list?.find((item) => item.id === appId) ?? (section === "team" ? list?.find((item) => item.id === rememberedId) : undefined)

  // Send / and unknown paths to the last app used with this profile.
  useEffect(() => {
    if (!list || !active || section) return
    const remembered = readPrefs(active.id).appId
    const target = list.find((item) => item.id === remembered) ?? list[0]
    if (target) navigate(`/apps/${target.id}/dashboard`, { replace: true })
  }, [list, active, section])

  useEffect(() => {
    if (active && app) writePrefs(active.id, { appId: app.id })
  }, [active, app])

  useEffect(() => {
    const page = section === "team" ? t("nav.team") : section ? t(`nav.${section}` as Parameters<typeof t>[0]) : ""
    document.title = [page, app?.name, "Fire"].filter(Boolean).join(" · ")
  }, [section, app, t])

  let content
  if (section === "team") content = <Team />
  else if (apps.error && !list) content = <LoadState error={apps.error} onRetry={apps.reload} />
  else if (!list) content = <LoadState loading />
  else if (list.length === 0) content = <Empty title={t("apps.none")}><p>{t("apps.noneBody")}</p></Empty>
  else if (!app) content = <LoadState loading={!section} error={section ? new Error(t("apps.notFound")) : undefined} />
  else if (section === "metadata") content = <Metadata app={app} />
  else if (section === "review") content = <Review app={app} />
  else if (section === "builds") content = <Builds app={app} />
  else if (section === "purchases") content = <Purchases app={app} />
  else if (section === "analytics") content = <Analytics app={app} />
  else content = <Dashboard app={app} />

  return (
    <div className="stage">
      <div className="app-window">
        <Sidebar apps={list} appsLoading={apps.loading} appsError={Boolean(apps.error)} appId={app?.id ?? appId} section={section ?? "dashboard"} />
        <main key={`${app?.id}-${section}`}>{content}</main>
      </div>
    </div>
  )
}
