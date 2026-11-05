import { useEffect, useRef, useState } from "react"
import { languages, useI18n, type MessageKey } from "../i18n"
import { profileIconStyle, type Profile } from "../lib/profiles"
import { navigate, type Section } from "../lib/router"
import { useSession } from "../lib/session"
import type { App } from "../lib/types"
import AddProfileDialog from "./AddProfileDialog"
import AppMark from "./AppMark"
import Icon, { type IconName } from "./Icon"
import { ProfileGlyphMark } from "./ProfileGlyphMark"
import { Confirm, useToast } from "./ui"

const workspace: [Section, MessageKey, IconName][] = [
  ["dashboard", "nav.dashboard", "dashboard"],
  ["metadata", "nav.metadata", "metadata"],
  ["review", "nav.review", "check"],
  ["builds", "nav.builds", "cloud"],
  ["purchases", "nav.purchases", "tag"],
  ["analytics", "nav.analytics", "chart"],
]

const sidebarWidthKey = "fire.sidebarWidth"
const sidebarWidths = { initial: 224, min: 200, max: 400, step: 16 }

function readSidebarWidth() {
  try {
    const saved = Number(window.localStorage.getItem(sidebarWidthKey))
    return saved >= sidebarWidths.min && saved <= sidebarWidths.max ? saved : sidebarWidths.initial
  } catch {
    return sidebarWidths.initial
  }
}

function SidebarResizer({ width, onChange }: { width: number; onChange: (width: number) => void }) {
  const { t } = useI18n()
  // The sidebar never takes more than 40% of the window; fire.css applies the same limit.
  const resize = (next: number) => onChange(Math.round(Math.max(sidebarWidths.min, Math.min(sidebarWidths.max, window.innerWidth * 0.4, next))))
  return (
    <div
      className="sidebar-resizer"
      role="separator"
      aria-orientation="vertical"
      aria-label={t("nav.resizeSidebar")}
      aria-valuemin={sidebarWidths.min}
      aria-valuemax={sidebarWidths.max}
      aria-valuenow={width}
      tabIndex={0}
      onPointerDown={(event) => {
        if (event.button === 0) event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) resize(event.clientX - event.currentTarget.parentElement!.getBoundingClientRect().left)
      }}
      onDoubleClick={() => onChange(sidebarWidths.initial)}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") resize(width - sidebarWidths.step)
        if (event.key === "ArrowRight") resize(width + sidebarWidths.step)
      }}
    />
  )
}

function moveMenuFocus(menu: HTMLElement | null, step: number) {
  const items = [...(menu?.querySelectorAll<HTMLElement>("button") ?? [])]
  const index = items.indexOf(document.activeElement as HTMLElement)
  items[(index + step + items.length) % items.length]?.focus()
}

function useDismiss(open: boolean, root: React.RefObject<HTMLElement | null>, close: () => void) {
  useEffect(() => {
    if (!open) return
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close()
    }
    document.addEventListener("pointerdown", dismiss)
    return () => document.removeEventListener("pointerdown", dismiss)
  }, [open, root, close])
}

export function Brand() {
  const { t } = useI18n()
  return (
    <div className="brand">
      <div className="brand-symbol">F</div>
      <div>
        <strong>Fire</strong>
        <span>{t("brand.tagline")}</span>
      </div>
    </div>
  )
}

function AppSwitcher({ apps, appId, section, loading }: { apps: App[] | undefined; appId?: string; section: Section; loading: boolean }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const current = apps?.find((item) => item.id === appId)
  useDismiss(open, root, () => setOpen(false))
  useEffect(() => {
    if (!open) return
    const items = menu.current
    ;(items?.querySelector<HTMLElement>('[aria-checked="true"]') ?? items?.querySelector<HTMLElement>("button"))?.focus()
  }, [open])
  return (
    <div className="app-switch-area" ref={root}>
      <button className="account-switch" aria-haspopup="menu" aria-expanded={open} disabled={!apps?.length} onClick={() => setOpen(!open)}>
        <span className="account-icon">
          <AppMark app={current} fallback={<Icon name="store" size={16} />} />
        </span>
        <span>
          <strong>{current?.name ?? (loading ? t("state.loading") : t("apps.choose"))}</strong>
          <small>{current ? current.bundleId : t("apps.count", { count: apps?.length ?? 0 })}</small>
        </span>
        <Icon name="chevron" size={14} />
      </button>
      {open && apps && (
        <div
          ref={menu}
          className="profile-menu app-menu"
          role="menu"
          aria-label={t("apps.title")}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false)
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault()
              moveMenuFocus(menu.current, event.key === "ArrowDown" ? 1 : -1)
            }
          }}
        >
          <p>{t("apps.count", { count: apps.length })}</p>
          <div className="profile-menu-list">
            {apps.map((item) => (
              <button
                key={item.id}
                role="menuitemradio"
                aria-checked={item.id === appId}
                className={item.id === appId ? "selected" : ""}
                onClick={() => {
                  setOpen(false)
                  navigate(`/apps/${item.id}/${section === "team" ? "dashboard" : section}`)
                }}
              >
                <i className="profile-menu-avatar app-avatar">
                  <AppMark app={item} />
                </i>
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.bundleId}</small>
                </span>
                {item.id === appId && <Icon name="check" size={15} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function LanguagePicker() {
  const { t, lang, setLang } = useI18n()
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const current = languages.find((item) => item.code === lang)
  useEffect(() => {
    if (!open) return
    menu.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus()
    const dismiss = (event: PointerEvent) => {
      if (!(event.target as Element).closest('[data-menu-root="language"]')) setOpen(false)
    }
    document.addEventListener("pointerdown", dismiss)
    return () => document.removeEventListener("pointerdown", dismiss)
  }, [open])
  const close = () => {
    setOpen(false)
    trigger.current?.focus()
  }
  return (
    <>
      <button ref={trigger} data-menu-root="language" className={open ? "menu-open" : ""} aria-label={`${t("nav.language")}: ${current?.name}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon name="globe" />
        <span>{t("nav.language")}</span>
        <span className="nav-value">{current?.name}</span>
      </button>
      {open && (
        <div
          ref={menu}
          data-menu-root="language"
          className="language-menu"
          role="menu"
          aria-label={t("nav.language")}
          onKeyDown={(event) => {
            if (event.key === "Escape") close()
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault()
              moveMenuFocus(menu.current, event.key === "ArrowDown" ? 1 : -1)
            }
          }}
        >
          {languages.map((item) => (
            <button
              key={item.code}
              lang={item.code}
              role="menuitemradio"
              aria-checked={item.code === lang}
              className={item.code === lang ? "selected" : ""}
              onClick={() => {
                setLang(item.code)
                close()
              }}
            >
              {item.name}
              {item.code === lang && <Icon name="check" size={15} />}
            </button>
          ))}
        </div>
      )}
    </>
  )
}

export function LanguageButtons() {
  const { lang, setLang } = useI18n()
  return (
    <div className="platform-switch welcome-languages" role="group">
      {languages.map((item) => (
        <button key={item.code} lang={item.code} className={item.code === lang ? "active" : ""} aria-pressed={item.code === lang} onClick={() => setLang(item.code)}>
          {item.name}
        </button>
      ))}
    </div>
  )
}

function ProfileSwitcher({ status }: { status: "ok" | "checking" | "error" }) {
  const { t } = useI18n()
  const notify = useToast()
  const { profiles, active, switchTo, add, remove } = useSession()
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<Profile | null>(null)
  const area = useRef<HTMLDivElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const moreButton = useRef<HTMLButtonElement>(null)
  useDismiss(open, area, () => setOpen(false))
  useEffect(() => {
    if (open) menu.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus()
  }, [open])
  if (!active) return null
  const close = () => {
    setOpen(false)
    moreButton.current?.focus()
  }
  const statusText = { ok: t("profile.status.ok"), checking: t("profile.status.checking"), error: t("profile.status.error") }[status]
  return (
    <>
      <div className="profile-area" ref={area}>
        {open && (
          <div
            ref={menu}
            className="profile-menu"
            role="menu"
            aria-label={t("profile.switch")}
            onKeyDown={(event) => {
              if (event.key === "Escape") close()
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault()
                moveMenuFocus(menu.current, event.key === "ArrowDown" ? 1 : -1)
              }
            }}
          >
            <p>{t("profile.switch")}</p>
            <div className="profile-menu-list">
              {profiles.map((item) => (
                <button
                  key={item.id}
                  role="menuitemradio"
                  aria-checked={item.id === active.id}
                  className={item.id === active.id ? "selected" : ""}
                  onClick={() => {
                    close()
                    if (item.id !== active.id) {
                      switchTo(item.id)
                      notify(t("profile.switched", { name: item.name }))
                    }
                  }}
                >
                  <i className="profile-menu-avatar" style={profileIconStyle(item.tone, item.glyph)}>
                    <ProfileGlyphMark name={item.name} glyph={item.glyph} image={item.image} />
                  </i>
                  <span>
                    <strong>{item.name}</strong>
                    <small>
                      {item.server ? t("profile.serverKey") : t(item.keyType === "team" ? "profile.keyType.teamKey" : "profile.keyType.individualKey")} · {item.keyId}
                    </small>
                  </span>
                  {item.id === active.id && <Icon name="check" size={15} />}
                </button>
              ))}
            </div>
            <button
              role="menuitem"
              className="profile-menu-add"
              onClick={() => {
                setOpen(false)
                setAdding(true)
              }}
            >
              <i>
                <Icon name="plus" size={15} />
              </i>
              <span>
                <strong>{t("profile.add")}</strong>
                <small>{t("profile.addNote")}</small>
              </span>
            </button>
            {!active.server && (
              <button
                role="menuitem"
                className="profile-menu-remove"
                onClick={() => {
                  setOpen(false)
                  setRemoving(active)
                }}
              >
                <i>
                  <Icon name="trash" size={15} />
                </i>
                <span>
                  <strong>{t("profile.remove")}</strong>
                  <small>{t("profile.removeNote")}</small>
                </span>
              </button>
            )}
          </div>
        )}
        <div className="profile">
          <button className="profile-avatar" aria-label={t("profile.menu")} aria-haspopup="menu" aria-expanded={open} style={profileIconStyle(active.tone, active.glyph)} onClick={() => setOpen(!open)}>
            <ProfileGlyphMark name={active.name} glyph={active.glyph} image={active.image} />
          </button>
          <div>
            <strong title={active.name}>{active.name}</strong>
            <span className={`profile-status ${status}`}>
              <i /> {statusText}
            </span>
          </div>
          <button ref={moreButton} className={`profile-more ${open ? "open" : ""}`} aria-label={t("profile.menu")} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
            <Icon name="more" />
          </button>
        </div>
      </div>
      {adding && (
        <AddProfileDialog
          profiles={profiles}
          onClose={() => setAdding(false)}
          onAdd={async (profile) => {
            await add(profile)
            setAdding(false)
            notify(t("profile.added", { name: profile.name }))
          }}
        />
      )}
      {removing && (
        <Confirm
          title={t("profile.removeTitle", { name: removing.name })}
          body={t("profile.removeBody")}
          confirmLabel={t("profile.remove")}
          danger
          onClose={() => setRemoving(null)}
          onConfirm={async () => {
            await remove(removing.id)
            const next = profiles.find((item) => item.id !== removing.id)
            if (next) switchTo(next.id)
          }}
        />
      )}
    </>
  )
}

export default function Sidebar({ apps, appsLoading, appsError, appId, section }: { apps: App[] | undefined; appsLoading: boolean; appsError: boolean; appId?: string; section: Section }) {
  const { t } = useI18n()
  const go = (target: Section) => {
    if (target === "team") navigate("/team")
    else if (appId) navigate(`/apps/${appId}/${target}`)
  }
  const status = appsError ? "error" : apps ? "ok" : "checking"
  const [width, setWidth] = useState(readSidebarWidth)
  useEffect(() => {
    try {
      window.localStorage.setItem(sidebarWidthKey, String(width))
    } catch {
      // The width is a convenience only.
    }
  }, [width])
  return (
    <aside className="sidebar" style={{ "--sidebar-width": `${width}px` } as React.CSSProperties}>
      <Brand />
      <AppSwitcher apps={apps} appId={appId} section={section} loading={appsLoading} />
      <nav>
        <p>{t("nav.workspace")}</p>
        {workspace.map(([target, label, icon]) => (
          <button key={target} className={section === target ? "active" : ""} aria-current={section === target ? "page" : undefined} disabled={!appId} onClick={() => go(target)}>
            <Icon name={icon} />
            <span>{t(label)}</span>
          </button>
        ))}
        <p>{t("nav.management")}</p>
        <button className={section === "team" ? "active" : ""} aria-current={section === "team" ? "page" : undefined} onClick={() => go("team")}>
          <Icon name="team" />
          <span>{t("nav.team")}</span>
        </button>
        <p>{t("nav.settings")}</p>
        <LanguagePicker />
      </nav>
      <ProfileSwitcher status={status} />
      <SidebarResizer width={width} onChange={setWidth} />
    </aside>
  )
}
