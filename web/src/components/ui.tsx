import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { useI18n, type MessageKey } from "../i18n"
import { ApiError } from "../lib/api"
import Icon, { type IconName } from "./Icon"

export type Tone = "warm" | "pale" | "sand" | "orange"

export function CardHeading({ icon, tone, title, note, children }: { icon: IconName; tone: Tone; title: string; note?: string; children?: ReactNode }) {
  return (
    <div className="card-heading">
      <div>
        <span className={`card-icon ${tone}`}>
          <Icon name={icon} size={17} />
        </span>
        <h2>{title}</h2>
        {note && <p>{note}</p>}
      </div>
      {children}
    </div>
  )
}

export function PageHeading({ icon, title, children }: { icon: IconName; title: string; children?: ReactNode }) {
  return (
    <div className="review-heading">
      <div>
        <span className="card-icon warm">
          <Icon name={icon} size={20} />
        </span>
        <div>
          <h1>{title}</h1>
        </div>
      </div>
      {children && <div className="builds-toolbar">{children}</div>}
    </div>
  )
}

const errorKeys: Record<string, MessageKey> = {
  no_credentials: "error.noCredentials",
  apple_authentication: "error.authentication",
  apple_permission: "error.permission",
  not_found: "error.notFound",
  apple_rate_limit: "error.rateLimit",
  apple_timeout: "error.timeout",
  apple_unavailable: "error.unavailable",
  network: "error.network",
  origin_denied: "error.origin",
}

// Apple's own explanation is shown for rejected changes, since it says what to fix.
export function useErrorText() {
  const { t } = useI18n()
  return (error: unknown) => {
    if (error instanceof ApiError) {
      if (error.code in errorKeys) return t(errorKeys[error.code])
      if ((error.code === "apple_rejected" || error.code === "invalid_request") && error.message) {
        return t("error.rejected", { detail: error.message })
      }
    }
    if (error instanceof Error && error.message) return t("error.generic") + ` (${error.message})`
    return t("error.generic")
  }
}

export function LoadState({ error, onRetry, loading }: { error?: unknown; onRetry?: () => void; loading?: boolean }) {
  const { t } = useI18n()
  const text = useErrorText()
  if (error) {
    return (
      <div className="state-panel error" role="alert">
        <span className="card-icon warm">
          <Icon name="bell" size={20} />
        </span>
        <strong>{t("state.errorTitle")}</strong>
        <p>{text(error)}</p>
        {onRetry && (
          <button className="quiet-button" onClick={onRetry}>
            <Icon name="refresh" size={14} />
            {t("action.retry")}
          </button>
        )}
      </div>
    )
  }
  if (loading) {
    return (
      <div className="state-panel" aria-busy="true">
        <span className="spinner" aria-hidden="true" />
        <p>{t("state.loading")}</p>
      </div>
    )
  }
  return null
}

export function Empty({ icon = "apps", title, children }: { icon?: IconName; title: string; children?: ReactNode }) {
  return (
    <div className="state-panel">
      <span className="card-icon warm">
        <Icon name={icon} size={20} />
      </span>
      <strong>{title}</strong>
      {children}
    </div>
  )
}

export function Modal({ title, note, onClose, children, footer, wide }: { title: string; note?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const { t } = useI18n()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    ref.current?.querySelector<HTMLElement>("input, textarea, select, button.accent-button")?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
      previous?.focus?.()
    }
    // Runs once per open dialog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className="attachment-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={ref} className={`attachment-modal profile-modal fire-modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="attachment-modal-head">
          <div>
            <h2>{title}</h2>
            {note && <p>{note}</p>}
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t("action.close")}>
            ×
          </button>
        </div>
        <div className="profile-form">{children}</div>
        {footer && <div className="iap-modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

export function Confirm({ title, body, confirmLabel, danger, onConfirm, onClose }: { title: string; body: string; confirmLabel: string; danger?: boolean; onConfirm: () => Promise<void> | void; onClose: () => void }) {
  const { t } = useI18n()
  const text = useErrorText()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)
  return (
    <Modal
      title={title}
      onClose={busy ? () => undefined : onClose}
      footer={
        <>
          <span>{error ? <span className="profile-field-error">{text(error)}</span> : null}</span>
          <div>
            <button type="button" className="quiet-button" disabled={busy} onClick={onClose}>
              {t("action.cancel")}
            </button>
            <button
              type="button"
              className={`accent-button ${danger ? "danger" : ""}`}
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                setError(null)
                try {
                  await onConfirm()
                  onClose()
                } catch (caught) {
                  setError(caught)
                  setBusy(false)
                }
              }}
            >
              {busy ? t("state.working") : confirmLabel}
            </button>
          </div>
        </>
      }
    >
      <p className="confirm-text">{body}</p>
    </Modal>
  )
}

type ToastState = { message: string; tone: "ok" | "error" } | null
const ToastContext = createContext<(message: string, tone?: "ok" | "error") => void>(() => undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null)
  const timer = useRef<number>(undefined)
  const show = (message: string, tone: "ok" | "error" = "ok") => {
    setToast({ message, tone })
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToast(null), tone === "error" ? 6000 : 2600)
  }
  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div className={`toast ${toast.tone === "error" ? "toast-error" : ""}`} role="status">
          <span>{toast.tone === "error" ? "!" : <Icon name="check" size={13} />}</span>
          {toast.message}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)

// Runs an action with a busy flag and reports failures as a toast.
export function useAction() {
  const notify = useToast()
  const text = useErrorText()
  const [busy, setBusy] = useState<string | null>(null)
  const run = async (name: string, action: () => Promise<unknown>, success?: string) => {
    setBusy(name)
    try {
      await action()
      if (success) notify(success)
      return true
    } catch (error) {
      notify(text(error), "error")
      return false
    } finally {
      setBusy(null)
    }
  }
  return { busy, run }
}

export function Field({ label, hint, children, className }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={className}>
      <span>
        {label} {hint && <small>{hint}</small>}
      </span>
      {children}
    </label>
  )
}

export function ascLink(path = "") {
  return `https://appstoreconnect.apple.com${path}`
}

export function ExternalButton({ href, children, className = "quiet-button" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a className={`${className} link-button`} href={href} target="_blank" rel="noreferrer noopener">
      {children}
      <Icon name="external" size={13} />
    </a>
  )
}
