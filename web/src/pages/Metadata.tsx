import { useEffect, useMemo, useRef, useState } from "react"
import Icon from "../components/Icon"
import { CardHeading, Confirm, ExternalButton, LoadState, ascLink, useAction, useToast } from "../components/ui"
import { useI18n } from "../i18n"
import { api } from "../lib/api"
import { navigate, setParam, useRoute } from "../lib/router"
import { platformLabel } from "../lib/status"
import type { App, Locale, Metadata as MetadataDoc, ReviewDetail, ScreenshotSet } from "../lib/types"
import { useApi } from "../lib/useApi"

type LocaleField = "name" | "subtitle" | "privacyPolicyUrl" | "privacyChoicesUrl" | "description" | "keywords" | "promotionalText" | "whatsNew" | "supportUrl" | "marketingUrl"
type VersionField = "releaseType" | "earliestReleaseDate" | "copyright"
type CategoryField = "primaryCategory" | "secondaryCategory"
type ReviewField = Exclude<keyof ReviewDetail, "id">
type Edits = {
  locales: Record<string, Partial<Record<LocaleField, string>>>
  version: Partial<Record<VersionField, string>>
  categories: Partial<Record<CategoryField, string>>
  review: Partial<Record<ReviewField, string | boolean>>
}
const noEdits: Edits = { locales: {}, version: {}, categories: {}, review: {} }

const infoFields: LocaleField[] = ["name", "subtitle", "privacyPolicyUrl", "privacyChoicesUrl"]
const submittableStates = ["PREPARE_FOR_SUBMISSION", "DEVELOPER_REJECTED", "REJECTED", "METADATA_REJECTED", "INVALID_BINARY"]

// App Store localizations Apple supports.
const storeLocales = ["ar-SA", "ca", "cs", "da", "de-DE", "el", "en-AU", "en-CA", "en-GB", "en-US", "es-ES", "es-MX", "fi", "fr-CA", "fr-FR", "he", "hi", "hr", "hu", "id", "it", "ja", "ko", "ms", "nl-NL", "no", "pl", "pt-BR", "pt-PT", "ro", "ru", "sk", "sv", "th", "tr", "uk", "vi", "zh-Hans", "zh-Hant"]

export const localeBadge = (code: string) => {
  const special: Record<string, string> = { "zh-Hans": "ZH", "zh-Hant": "ZH-TW", ja: "JP", "en-GB": "EN-GB", "en-AU": "EN-AU", "en-CA": "EN-CA", "pt-BR": "PT-BR", "fr-CA": "FR-CA", "es-MX": "ES-MX" }
  return special[code] ?? code.split("-")[0].toUpperCase()
}

// Returns the local time "YYYY-MM-DDTHH:mm" for an ISO date, for datetime-local inputs.
function toLocalInput(value?: string) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default function Metadata({ app }: { app: App }) {
  const { t, enumLabel, localeName, number } = useI18n()
  const notify = useToast()
  const { busy, run } = useAction()
  const route = useRoute()
  const versionParam = route.params.get("version")
  const path = `/apps/${app.id}/metadata${versionParam ? `?version=${encodeURIComponent(versionParam)}` : ""}`
  const { data, error, loading, reload, setData } = useApi<MetadataDoc>(path)
  const [edits, setEdits] = useState<Edits>(noEdits)
  const [versionMenu, setVersionMenu] = useState(false)
  const [localeMenu, setLocaleMenu] = useState(false)
  const [adding, setAdding] = useState(false)
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const toolbar = useRef<HTMLDivElement>(null)

  const locales = data?.locales ?? []
  const localeCode = route.params.get("locale") ?? locales[0]?.locale ?? app.primaryLocale
  const locale = locales.find((item) => item.locale === localeCode) ?? locales[0]
  const version = data?.version
  const versionEditable = Boolean(version?.editable)
  const infoEditable = Boolean(data?.appInfo?.editable)

  const dirty = useMemo(
    () =>
      Object.values(edits.locales).reduce((sum, fields) => sum + Object.keys(fields).length, 0) +
      Object.keys(edits.version).length +
      Object.keys(edits.categories).length +
      Object.keys(edits.review).length,
    [edits],
  )

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  useEffect(() => {
    if (!versionMenu && !localeMenu) return
    const dismiss = (event: PointerEvent) => {
      if (!(event.target as Element).closest(".build-picker, .locale-picker")) {
        setVersionMenu(false)
        setLocaleMenu(false)
      }
    }
    document.addEventListener("pointerdown", dismiss)
    return () => document.removeEventListener("pointerdown", dismiss)
  }, [versionMenu, localeMenu])

  useEffect(() => {
    if (localeMenu) document.querySelector(".metadata-locale-menu .selected")?.scrollIntoView({ block: "nearest" })
  }, [localeMenu])

  if (!data) {
    return (
      <div className="review-workspace">
        <LoadState loading={loading} error={error} onRetry={reload} />
      </div>
    )
  }

  const value = (loc: Locale | undefined, field: LocaleField) => (loc ? (edits.locales[loc.locale]?.[field] ?? loc[field] ?? "") : "")
  const setField = (field: LocaleField, next: string) => {
    if (!locale) return
    setEdits((current) => {
      const fields = { ...current.locales[locale.locale] }
      if (next === (locale[field] ?? "")) delete fields[field]
      else fields[field] = next
      return { ...current, locales: { ...current.locales, [locale.locale]: fields } }
    })
  }
  const versionValue = (field: VersionField) => edits.version[field] ?? version?.[field] ?? ""
  const setVersionField = (field: VersionField, next: string) =>
    setEdits((current) => {
      const fields = { ...current.version }
      if (next === (version?.[field] ?? "")) delete fields[field]
      else fields[field] = next
      return { ...current, version: fields }
    })
  const categoryValue = (field: CategoryField) => edits.categories[field] ?? data.appInfo?.[field] ?? ""
  const setCategory = (field: CategoryField, next: string) =>
    setEdits((current) => {
      const fields = { ...current.categories }
      if (next === (data.appInfo?.[field] ?? "")) delete fields[field]
      else fields[field] = next
      return { ...current, categories: fields }
    })
  const reviewValue = <K extends ReviewField>(field: K): ReviewDetail[K] =>
    (edits.review[field] as ReviewDetail[K] | undefined) ?? data.reviewDetail?.[field] ?? ((field === "demoAccountRequired" ? false : "") as ReviewDetail[K])
  const setReview = (field: ReviewField, next: string | boolean) =>
    setEdits((current) => {
      const fields = { ...current.review }
      const original = data.reviewDetail?.[field] ?? (field === "demoAccountRequired" ? false : "")
      if (next === original) delete fields[field]
      else fields[field] = next
      return { ...current, review: fields }
    })

  const changeFor = (only?: { locale: string; field: LocaleField }) => {
    const localeChanges = Object.entries(only ? { [only.locale]: { [only.field]: edits.locales[only.locale]?.[only.field] } } : edits.locales)
      .map(([code, fields]) => {
        const loc = locales.find((item) => item.locale === code)!
        return { locale: code, appInfoLocalizationId: loc.appInfoLocalizationId ?? "", versionLocalizationId: loc.versionLocalizationId ?? "", fields }
      })
      .filter((item) => Object.keys(item.fields).length > 0)
    return {
      versionId: version!.id,
      appInfoId: data.appInfo?.id ?? "",
      locales: localeChanges,
      ...(only ? {} : { version: edits.version, categories: edits.categories, reviewDetail: edits.review }),
    }
  }

  const save = () =>
    run(
      "save",
      async () => {
        const result = await api<MetadataDoc>(`/apps/${app.id}/metadata`, { method: "PATCH", body: changeFor() })
        setData(result)
        setEdits(noEdits)
      },
      t("metadata.saved"),
    )

  const savePromo = () =>
    locale &&
    run(
      "promo",
      async () => {
        const result = await api<MetadataDoc>(`/apps/${app.id}/metadata`, { method: "PATCH", body: changeFor({ locale: locale.locale, field: "promotionalText" }) })
        setData(result)
        setEdits((current) => {
          const fields = { ...current.locales[locale.locale] }
          delete fields.promotionalText
          return { ...current, locales: { ...current.locales, [locale.locale]: fields } }
        })
      },
      t("metadata.promoSaved"),
    )

  const addLocale = (code: string) =>
    run(
      "locale",
      async () => {
        const result = await api<MetadataDoc>(`/apps/${app.id}/metadata/locales`, { method: "POST", body: { versionId: version!.id, locale: code } })
        setData(result)
        setParam("locale", code)
      },
      t("metadata.localeAdded", { locale: localeName(code) }),
    )

  const switchVersion = (id: string) => {
    if (dirty && !window.confirm(t("metadata.discardConfirm"))) return
    setEdits(noEdits)
    setVersionMenu(false)
    setParam("version", id)
  }

  const fill = (loc: Locale) => {
    const fields: LocaleField[] = ["name", "description", "keywords", "supportUrl"]
    return Math.round((fields.filter((field) => value(loc, field).trim()).length / fields.length) * 100)
  }
  const missingLocales = storeLocales.filter((code) => !locales.some((item) => item.locale === code))
  const count = (text: string, max: number) => `${number([...text].length)}/${number(max)}`
  const lockedNote = !versionEditable && version ? t("metadata.locked", { state: enumLabel("versionState", version.state) }) : ""

  const text = (field: LocaleField, max: number, multiline: boolean, disabled: boolean, className?: string) => {
    const current = value(locale, field)
    const props = {
      value: current,
      disabled: disabled || !locale,
      "aria-invalid": [...current].length > max,
      onChange: (event: { target: { value: string } }) => setField(field, event.target.value),
    }
    return (
      <div className={className}>
        {multiline ? <textarea {...props} /> : <input {...props} />}
        <small>{count(current, max)}</small>
      </div>
    )
  }

  return (
    <>
      <div className="metadata-page-top">
        <div className="review-heading metadata-page-heading">
          <div>
            <span className="card-icon warm">
              <Icon name="metadata" size={20} />
            </span>
            <div>
              <h1>{t("nav.metadata")}</h1>
            </div>
          </div>
          <div className="metadata-toolbar" ref={toolbar}>
            <div className="build-status">
              <div className="build-picker">
                <span>{t("metadata.version")}</span>
                <button aria-haspopup="menu" aria-expanded={versionMenu} disabled={!data.versions.length} onClick={() => setVersionMenu(!versionMenu)}>
                  {version ? `${platformLabel(version.platform)} ${version.versionString}` : t("metadata.noVersion")}
                  <Icon name="chevron" size={13} />
                </button>
                {versionMenu && (
                  <div className="build-menu" role="menu">
                    <span>{t("metadata.selectVersion")}</span>
                    {data.versions.map((item) => (
                      <button key={item.id} role="menuitemradio" aria-checked={item.id === version?.id} className={item.id === version?.id ? "selected" : ""} onClick={() => switchVersion(item.id)}>
                        <span>
                          <strong>
                            {platformLabel(item.platform)} {item.versionString}
                          </strong>
                          <small>{enumLabel("versionState", item.state)}</small>
                        </span>
                        {item.id === version?.id && <Icon name="check" size={13} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {version && (
                <div className={`top-status ${version.editable ? "" : "done"}`}>
                  <span>{t("metadata.status")}</span>
                  <strong>
                    <i />
                    {enumLabel("versionState", version.state)}
                  </strong>
                </div>
              )}
            </div>
            <div className="top-actions">
              <div className="locale-picker">
                <button className="date-button locale-button" aria-haspopup="menu" aria-expanded={localeMenu} disabled={!locale} onClick={() => setLocaleMenu(!localeMenu)}>
                  <span className="locale-symbol">{locale ? localeBadge(locale.locale) : "—"}</span>
                  {locale ? localeName(locale.locale) : t("metadata.noLocales")}
                  <Icon name="chevron" size={13} />
                </button>
                {localeMenu && (
                  <div className="locale-menu metadata-locale-menu" role="menu">
                    <div className="locale-menu-head">
                      <strong>{t("metadata.localization")}</strong>
                      <span>{t("metadata.languages", { count: locales.length })}</span>
                    </div>
                    {locales.map((item) => (
                      <button
                        key={item.locale}
                        role="menuitemradio"
                        aria-checked={item.locale === locale?.locale}
                        className={item.locale === locale?.locale ? "selected" : ""}
                        onClick={() => {
                          setParam("locale", item.locale)
                          setLocaleMenu(false)
                        }}
                      >
                        <span className="locale-symbol">{localeBadge(item.locale)}</span>
                        <span>
                          <strong>{localeName(item.locale)}</strong>
                          <small>{item.locale === app.primaryLocale ? t("metadata.primary") : item.locale}</small>
                        </span>
                        <small>{fill(item)}%</small>
                        {item.locale === locale?.locale ? <Icon name="check" size={13} /> : <span />}
                      </button>
                    ))}
                    {versionEditable && missingLocales.length > 0 && (
                      <button
                        className="add-locale"
                        onClick={() => {
                          setLocaleMenu(false)
                          setAdding(true)
                        }}
                      >
                        <Icon name="plus" size={13} />
                        {t("metadata.addLocalization")}
                      </button>
                    )}
                  </div>
                )}
              </div>
              <button className="quiet-button toolbar-quiet" disabled={!dirty || busy !== null} onClick={() => void save()}>
                <Icon name="cloud" size={14} />
                {busy === "save" ? t("state.saving") : dirty ? t("metadata.saveCount", { count: dirty }) : t("metadata.saved.none")}
              </button>
              {version && submittableStates.includes(version.state) && (
                <button className="accent-button toolbar-publish" disabled={busy !== null} onClick={() => setConfirmSubmit(true)}>
                  <Icon name="upload" size={14} />
                  {t("metadata.submit")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="page">
        {!version && <p className="page-notice">{t("metadata.noVersionBody")}</p>}
        {lockedNote && <p className="page-notice">{lockedNote}</p>}
        <section className="content-grid">
          <div className="metadata-section-heading release-section-heading">
            <span>
              <Icon name="upload" size={15} />
            </span>
            <div>
              <h2>{t("metadata.section.release")}</h2>
            </div>
          </div>
          <div className="metadata-section-heading compliance-section-heading">
            <span>
              <Icon name="key" size={15} />
            </span>
            <div>
              <h2>{t("metadata.section.compliance")}</h2>
            </div>
          </div>

          <article className="card form-card">
            <CardHeading icon="metadata" tone="warm" title={t("metadata.appInfo")} note={t("metadata.appInfoNote")}>
              {!infoEditable && data.appInfo && <span className="live-tag muted-tag">{t("metadata.infoLocked")}</span>}
            </CardHeading>
            <div className="form-fields">
              <label>
                <span>
                  {t("metadata.name")} <small>{t("common.upTo", { count: 30 })}</small>
                </span>
                {text("name", 30, false, !infoEditable || !locale?.appInfoLocalizationId)}
              </label>
              <label>
                <span>
                  {t("metadata.subtitle")} <small>{t("common.upTo", { count: 30 })}</small>
                </span>
                {text("subtitle", 30, false, !infoEditable || !locale?.appInfoLocalizationId)}
              </label>
              <label className="description-field">
                <span>
                  {t("metadata.description")} <small>{t("common.upTo", { count: number(4000) })}</small>
                </span>
                {text("description", 4000, true, !versionEditable || !locale?.versionLocalizationId)}
              </label>
            </div>
          </article>

          <article className="card promo-card">
            <CardHeading icon="upload" tone="orange" title={t("metadata.promo")} note={t("metadata.promoNote")}>
              <span className="live-tag">{t("metadata.publishAnytime")}</span>
            </CardHeading>
            <textarea value={value(locale, "promotionalText")} disabled={!locale?.versionLocalizationId} onChange={(event) => setField("promotionalText", event.target.value)} aria-label={t("metadata.promo")} />
            <div className="promo-footer">
              <span>{count(value(locale, "promotionalText"), 170)}</span>
              <button disabled={!locale || edits.locales[locale.locale]?.promotionalText === undefined || busy !== null} onClick={() => void savePromo()}>
                {busy === "promo" ? t("state.saving") : t("metadata.saveText")}
              </button>
            </div>
          </article>

          <article className="card keywords-card">
            <CardHeading icon="search" tone="pale" title={t("metadata.keywords")} note={t("metadata.keywordsNote", { app: app.name })}>
              <span className="keyword-count">{count(value(locale, "keywords"), 100)}</span>
            </CardHeading>
            <textarea
              className="keyword-input"
              value={value(locale, "keywords")}
              disabled={!versionEditable || !locale?.versionLocalizationId}
              aria-label={t("metadata.keywords")}
              aria-invalid={[...value(locale, "keywords")].length > 100}
              onChange={(event) => setField("keywords", event.target.value)}
            />
            <p className="field-hint">{t("metadata.keywordsHint")}</p>
          </article>

          <Screenshots localizationId={locale?.versionLocalizationId} appId={app.id} />

          <article className="card whats-new-card">
            <CardHeading icon="cloud" tone="orange" title={t("metadata.whatsNew")} note={t("metadata.whatsNewNote")}>
              <span className="keyword-count">{count(value(locale, "whatsNew"), 4000)}</span>
            </CardHeading>
            <textarea value={value(locale, "whatsNew")} disabled={!versionEditable || !locale?.versionLocalizationId} aria-label={t("metadata.whatsNew")} onChange={(event) => setField("whatsNew", event.target.value)} />
          </article>

          <article className="card urls-card">
            <CardHeading icon="globe" tone="pale" title={t("metadata.urls")} note={t("metadata.urlsNote")} />
            <div className="stacked-fields">
              <label>
                <span>{t("metadata.supportUrl")}</span>
                <input type="url" value={value(locale, "supportUrl")} disabled={!versionEditable || !locale?.versionLocalizationId} onChange={(event) => setField("supportUrl", event.target.value)} />
              </label>
              <label>
                <span>
                  {t("metadata.marketingUrl")} <small>{t("common.optional")}</small>
                </span>
                <input type="url" value={value(locale, "marketingUrl")} disabled={!versionEditable || !locale?.versionLocalizationId} onChange={(event) => setField("marketingUrl", event.target.value)} />
              </label>
            </div>
          </article>

          <article className="card contact-card">
            <CardHeading icon="team" tone="sand" title={t("metadata.contact")} note={t("metadata.contactNote")} />
            <div className="compact-field-grid">
              {(
                [
                  ["contactFirstName", "metadata.firstName", "text"],
                  ["contactLastName", "metadata.lastName", "text"],
                  ["contactPhone", "metadata.phone", "tel"],
                  ["contactEmail", "metadata.email", "email"],
                ] as const
              ).map(([field, label, type]) => (
                <label key={field}>
                  <span>{t(label)}</span>
                  <input type={type} value={String(reviewValue(field))} disabled={!versionEditable} onChange={(event) => setReview(field, event.target.value)} />
                </label>
              ))}
            </div>
          </article>

          <article className="card category-card">
            <CardHeading icon="apps" tone="warm" title={t("metadata.categories")} note={t("metadata.categoriesNote", { app: app.name })} />
            <div className="stacked-fields">
              <label>
                <span>{t("metadata.primaryCategory")}</span>
                <select value={categoryValue("primaryCategory")} disabled={!infoEditable} onChange={(event) => setCategory("primaryCategory", event.target.value)}>
                  {!categoryValue("primaryCategory") && <option value="">{t("common.choose")}</option>}
                  {data.categories.map((id) => (
                    <option key={id} value={id}>
                      {enumLabel("category", id)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>
                  {t("metadata.secondaryCategory")} <small>{t("common.optional")}</small>
                </span>
                <select value={categoryValue("secondaryCategory")} disabled={!infoEditable} onChange={(event) => setCategory("secondaryCategory", event.target.value)}>
                  <option value="">{t("common.none")}</option>
                  {data.categories
                    .filter((id) => id !== categoryValue("primaryCategory"))
                    .map((id) => (
                      <option key={id} value={id}>
                        {enumLabel("category", id)}
                      </option>
                    ))}
                </select>
              </label>
            </div>
          </article>

          <article className="card release-card">
            <CardHeading icon="upload" tone="orange" title={t("metadata.release")} note={t("metadata.releaseNote")} />
            <div className="release-options">
              {(
                [
                  ["MANUAL", "metadata.release.manual", "metadata.release.manualNote"],
                  ["AFTER_APPROVAL", "metadata.release.automatic", "metadata.release.automaticNote"],
                  ["SCHEDULED", "metadata.release.scheduled", "metadata.release.scheduledNote"],
                ] as const
              ).map(([option, title, detail]) => (
                <label key={option} className={versionValue("releaseType") === option ? "selected" : ""}>
                  <input type="radio" name="release" checked={versionValue("releaseType") === option} disabled={!versionEditable} onChange={() => setVersionField("releaseType", option)} />
                  <span>
                    <strong>{t(title)}</strong>
                    <small>{t(detail)}</small>
                  </span>
                  {option === "SCHEDULED" && (
                    <input
                      className="release-date"
                      type="datetime-local"
                      aria-label={t("metadata.release.date")}
                      disabled={!versionEditable || versionValue("releaseType") !== "SCHEDULED"}
                      value={toLocalInput(versionValue("earliestReleaseDate"))}
                      onChange={(event) => setVersionField("earliestReleaseDate", event.target.value ? new Date(event.target.value).toISOString() : "")}
                    />
                  )}
                </label>
              ))}
            </div>
            <div className="stacked-fields release-copyright">
              <label>
                <span>{t("metadata.copyright")}</span>
                <input value={versionValue("copyright")} disabled={!versionEditable} placeholder={`${new Date().getFullYear()} ${app.name}`} onChange={(event) => setVersionField("copyright", event.target.value)} />
              </label>
            </div>
          </article>

          <article className="card age-card">
            <CardHeading icon="team" tone="sand" title={t("metadata.ageRating")} note={t("metadata.ageRatingNote")}>
              <span className="age-badge">{enumLabel("ageRating", data.appInfo?.ageRating)}</span>
            </CardHeading>
            <div className="setting-summary">
              <div>
                <strong>{t("metadata.ageCurrent", { rating: enumLabel("ageRating", data.appInfo?.ageRating) })}</strong>
                <span>{t("metadata.ageHint")}</span>
              </div>
              <a className="link-inline" href={ascLink(`/apps/${app.id}/distribution/info`)} target="_blank" rel="noreferrer noopener">
                {t("metadata.editQuestionnaire")} <Icon name="external" size={12} />
              </a>
            </div>
          </article>

          <article className="card privacy-card">
            <CardHeading icon="key" tone="warm" title={t("metadata.privacy")} note={t("metadata.privacyNote")} />
            <div className="privacy-grid">
              <div className="stacked-fields">
                <label>
                  <span>{t("metadata.privacyUrl")}</span>
                  <input type="url" value={value(locale, "privacyPolicyUrl")} disabled={!infoEditable || !locale?.appInfoLocalizationId} onChange={(event) => setField("privacyPolicyUrl", event.target.value)} />
                </label>
                <label>
                  <span>
                    {t("metadata.privacyChoicesUrl")} <small>{t("common.optional")}</small>
                  </span>
                  <input type="url" value={value(locale, "privacyChoicesUrl")} disabled={!infoEditable || !locale?.appInfoLocalizationId} onChange={(event) => setField("privacyChoicesUrl", event.target.value)} />
                </label>
              </div>
              <div className="data-collection">
                <strong>{t("metadata.dataCollection")}</strong>
                <p className="notice-text">{t("metadata.dataCollectionNote")}</p>
                <a className="data-details" href={ascLink(`/apps/${app.id}/distribution/privacy`)} target="_blank" rel="noreferrer noopener">
                  {t("metadata.openPrivacy")} <Icon name="external" size={13} />
                </a>
              </div>
            </div>
          </article>

          <article className="card metadata-review-notes">
            <CardHeading icon="metadata" tone="orange" title={t("metadata.reviewNotes")} note={t("metadata.reviewNotesNote")}>
              <span className="keyword-count">{count(String(reviewValue("notes")), 4000)}</span>
            </CardHeading>
            <label className="demo-toggle">
              <input type="checkbox" checked={Boolean(reviewValue("demoAccountRequired"))} disabled={!versionEditable} onChange={(event) => setReview("demoAccountRequired", event.target.checked)} />
              {t("metadata.signInRequired")}
            </label>
            {reviewValue("demoAccountRequired") && (
              <div className="compact-field-grid demo-fields">
                <label>
                  <span>{t("metadata.demoUser")}</span>
                  <input value={String(reviewValue("demoAccountName"))} autoComplete="off" disabled={!versionEditable} onChange={(event) => setReview("demoAccountName", event.target.value)} />
                </label>
                <label>
                  <span>{t("metadata.demoPassword")}</span>
                  <input type="password" value={String(reviewValue("demoAccountPassword"))} autoComplete="new-password" disabled={!versionEditable} onChange={(event) => setReview("demoAccountPassword", event.target.value)} />
                </label>
              </div>
            )}
            <textarea value={String(reviewValue("notes"))} disabled={!versionEditable} aria-label={t("metadata.reviewNotes")} placeholder={t("metadata.reviewNotesPlaceholder")} onChange={(event) => setReview("notes", event.target.value)} />
          </article>
        </section>
      </div>
      {adding && (
        <AddLocaleDialog
          options={missingLocales}
          onClose={() => setAdding(false)}
          onAdd={(code) => {
            setAdding(false)
            void addLocale(code)
          }}
        />
      )}
      {confirmSubmit && version && (
        <Confirm
          title={t("metadata.submitTitle", { version: version.versionString })}
          body={dirty ? t("metadata.submitBodyDirty") : t("metadata.submitBody")}
          confirmLabel={t("metadata.submit")}
          onClose={() => setConfirmSubmit(false)}
          onConfirm={async () => {
            if (dirty) {
              const result = await api<MetadataDoc>(`/apps/${app.id}/metadata`, { method: "PATCH", body: changeFor() })
              setData(result)
              setEdits(noEdits)
            }
            await api(`/apps/${app.id}/reviews`, { method: "POST", body: { versionId: version.id } })
            notify(t("metadata.submitted"))
            navigate(`/apps/${app.id}/review`)
          }}
        />
      )}
    </>
  )
}

function AddLocaleDialog({ options, onAdd, onClose }: { options: string[]; onAdd: (code: string) => void; onClose: () => void }) {
  const { t, localeName } = useI18n()
  const sorted = [...options].sort((a, b) => localeName(a).localeCompare(localeName(b)))
  const [choice, setChoice] = useState(sorted[0] ?? "")
  return (
    <div className="attachment-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form
        className="attachment-modal profile-modal fire-modal"
        role="dialog"
        aria-modal="true"
        aria-label={t("metadata.addLocalization")}
        onSubmit={(event) => {
          event.preventDefault()
          if (choice) onAdd(choice)
        }}
      >
        <div className="attachment-modal-head">
          <div>
            <h2>{t("metadata.addLocalization")}</h2>
            <p>{t("metadata.addLocalizationNote")}</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label={t("action.close")}>
            ×
          </button>
        </div>
        <div className="profile-form">
          <label>
            <span>{t("metadata.language")}</span>
            <select className="modal-select" value={choice} onChange={(event) => setChoice(event.target.value)} autoFocus>
              {sorted.map((code) => (
                <option key={code} value={code}>
                  {localeName(code)} ({code})
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="iap-modal-footer">
          <span />
          <div>
            <button type="button" className="quiet-button" onClick={onClose}>
              {t("action.cancel")}
            </button>
            <button type="submit" className="accent-button">
              {t("action.add")}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

function Screenshots({ localizationId, appId }: { localizationId?: string; appId: string }) {
  const { t, enumLabel } = useI18n()
  const { data, error, loading } = useApi<{ sets: ScreenshotSet[] }>(localizationId ? `/localizations/${localizationId}/screenshots` : null)
  const [index, setIndex] = useState(0)
  const set = data?.sets[Math.min(index, (data?.sets.length ?? 1) - 1)]
  return (
    <article className="card screenshots-card">
      <CardHeading icon="upload" tone="orange" title={t("metadata.screenshots")} note={set ? enumLabel("display", set.displayType) : t("metadata.screenshotsNote")}>
        <div className="iap-heading-actions">
          {data && data.sets.length > 1 && (
            <select className="an-select an-select-small" value={index} aria-label={t("metadata.displayType")} onChange={(event) => setIndex(Number(event.target.value))}>
              {data.sets.map((item, i) => (
                <option key={item.id} value={i}>
                  {enumLabel("display", item.displayType)}
                </option>
              ))}
            </select>
          )}
          <ExternalButton className="add-button" href={ascLink(`/apps/${appId}/distribution`)}>
            {t("metadata.manageScreenshots")}
          </ExternalButton>
        </div>
      </CardHeading>
      {!data ? (
        <p className="builds-empty">{error ? t("metadata.screenshotsError") : loading ? t("state.loading") : t("metadata.screenshotsNone")}</p>
      ) : !set || set.screenshots.length === 0 ? (
        <p className="builds-empty">{t("metadata.screenshotsNone")}</p>
      ) : (
        <>
          <div className="screenshot-list">
            {set.screenshots.map((shot) => (
              <a key={shot.id} className="shot shot-image" href={shot.url} target="_blank" rel="noreferrer noopener" title={shot.fileName}>
                {shot.url ? <img src={shot.url} alt={shot.fileName} loading="lazy" /> : <span>{shot.fileName}</span>}
              </a>
            ))}
          </div>
          <div className="screenshot-footer">
            <span>{t("metadata.screenshotCount", { count: set.screenshots.length })}</span>
            <span>{t("metadata.screenshotsReadOnly")}</span>
          </div>
        </>
      )}
    </article>
  )
}
