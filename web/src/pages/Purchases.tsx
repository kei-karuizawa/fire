import { useEffect, useRef, useState } from "react"
import Icon from "../components/Icon"
import { CardHeading, Confirm, Empty, ExternalButton, LoadState, PageHeading, ascLink, useAction, useToast } from "../components/ui"
import { useI18n, type MessageKey } from "../i18n"
import { api } from "../lib/api"
import { setParam, useRoute } from "../lib/router"
import { productTone } from "../lib/status"
import type { App, Product, ProductDetail, Purchases as PurchasesDoc } from "../lib/types"
import { useApi } from "../lib/useApi"
import { localeBadge } from "./Metadata"

const filters = ["all", "subscriptions", "oneTime", "issues"] as const
type Filter = (typeof filters)[number]
const productLocales = ["en-US", "en-GB", "zh-Hans", "zh-Hant", "ja", "ko", "de-DE", "fr-FR", "es-ES", "es-MX", "it", "pt-BR", "ru", "nl-NL", "sv", "da", "no", "fi", "tr", "th", "vi", "id", "ms", "pl", "uk", "ar-SA", "he", "hi"]

const matches = (product: Product, filter: Filter) =>
  filter === "all" ||
  (filter === "subscriptions" && product.kind === "subscription") ||
  (filter === "oneTime" && product.kind === "iap") ||
  (filter === "issues" && ["missing", "rejected"].includes(productTone(product)))

export default function Purchases({ app }: { app: App }) {
  const { t, enumLabel } = useI18n()
  const route = useRoute()
  const [filter, setFilter] = useState<Filter>("all")
  const { data, error, loading, reload, setData } = useApi<PurchasesDoc>(`/apps/${app.id}/purchases`)
  const sections = data
    ? [
        ...data.groups.map((group) => ({ key: group.id, title: group.name, note: t("purchases.group"), items: group.products.filter((item) => matches(item, filter)) })),
        { key: "one-time", title: t("purchases.oneTime"), note: "", items: data.oneTime.filter((item) => matches(item, filter)) },
      ].filter((section) => section.items.length > 0)
    : []
  const visible = sections.flatMap((section) => section.items)
  const selectedId = route.params.get("product")
  const selected = visible.find((item) => item.id === selectedId) ?? visible[0]
  const groupName = (product: Product) => data?.groups.find((group) => group.id === product.groupId)?.name

  return (
    <div className="review-workspace builds-workspace">
      <PageHeading icon="tag" title={t("nav.purchases")}>
        <button className="quiet-button" disabled={loading} onClick={() => void reload()}>
          <Icon name="refresh" size={14} />
          {t("purchases.sync")}
        </button>
        <ExternalButton className="accent-button" href={ascLink(`/apps/${app.id}/distribution/iaps`)}>
          <Icon name="plus" size={14} />
          {t("purchases.create")}
        </ExternalButton>
      </PageHeading>
      {!data ? (
        <LoadState loading={loading} error={error} onRetry={reload} />
      ) : data.groups.length === 0 && data.oneTime.length === 0 ? (
        <Empty icon="tag" title={t("purchases.none")}>
          <p>{t("purchases.noneBody")}</p>
        </Empty>
      ) : (
        <div className="review-split builds-split">
          <aside className="submission-pane">
            <div className="builds-filter" role="group">
              {filters.map((item) => (
                <button key={item} className={filter === item ? "active" : ""} aria-pressed={filter === item} onClick={() => setFilter(item)}>
                  {t(`purchases.filter.${item}` as MessageKey)}
                </button>
              ))}
            </div>
            <div className="submission-list builds-list">
              {sections.map((section) => (
                <section key={section.key}>
                  <h3>
                    {section.title}
                    <small>
                      {section.note ? `${section.note} · ` : ""}
                      {t("purchases.count", { count: section.items.length })}
                    </small>
                  </h3>
                  {section.items.map((item) => (
                    <button key={item.id} className={selected?.id === item.id ? "selected" : ""} aria-current={selected?.id === item.id} onClick={() => setParam("product", item.id)}>
                      <span className={`iap-dot ${productTone(item)}`} />
                      <span className="submission-copy">
                        <strong>{item.name}</strong>
                        <small>
                          {item.period ? `${enumLabel("period", item.period)} · ` : ""}
                          {enumLabel("productType", item.type)}
                        </small>
                      </span>
                      <span className={`iap-state ${productTone(item)}`}>{enumLabel("productState", item.state)}</span>
                      <Icon name="chevron" size={13} />
                    </button>
                  ))}
                </section>
              ))}
              {visible.length === 0 && <p className="builds-empty">{t("purchases.noMatch")}</p>}
            </div>
          </aside>
          {selected ? (
            <ProductPanel
              key={selected.id}
              product={selected}
              group={groupName(selected)}
              groupSize={data.groups.find((group) => group.id === selected.groupId)?.products.length ?? 0}
              appId={app.id}
              onProduct={(product) =>
                setData({
                  groups: data.groups.map((group) => ({ ...group, products: group.products.map((item) => (item.id === product.id ? product : item)) })),
                  oneTime: data.oneTime.map((item) => (item.id === product.id ? product : item)),
                })
              }
            />
          ) : (
            <section className="submission-detail build-detail">
              <p className="builds-empty">{t("purchases.noneSelected")}</p>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

type Draft = { name: string; description: string }

function ProductPanel({ product, group, groupSize, appId, onProduct }: { product: Product; group?: string; groupSize: number; appId: string; onProduct: (product: Product) => void }) {
  const { t, enumLabel, localeName, regionName, date, number } = useI18n()
  const notify = useToast()
  const { busy, run } = useAction()
  const base = `/purchases/${product.kind}/${product.id}`
  const { data, error, loading, reload, setData } = useApi<ProductDetail>(base)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [newLocales, setNewLocales] = useState<string[]>([])
  const [localeMenu, setLocaleMenu] = useState(false)
  const [removing, setRemoving] = useState<{ id: string; locale: string } | null>(null)
  const [notes, setNotes] = useState<string | null>(null)
  const menuRoot = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!localeMenu) return
    const dismiss = (event: PointerEvent) => !menuRoot.current?.contains(event.target as Node) && setLocaleMenu(false)
    document.addEventListener("pointerdown", dismiss)
    return () => document.removeEventListener("pointerdown", dismiss)
  }, [localeMenu])

  const current = data?.product ?? product
  const tone = productTone(current)
  const apply = (detail: ProductDetail) => {
    setData(detail)
    onProduct(detail.product)
  }
  const existing = data?.localizations ?? []
  const available = productLocales.filter((code) => !existing.some((item) => item.locale === code) && !newLocales.includes(code))
  const rows = [...existing.map((item) => ({ ...item, isNew: false })), ...newLocales.map((code) => ({ id: `new-${code}`, locale: code, name: "", description: "", state: "", isNew: true }))]
  const note = notes ?? current.reviewNote
  const prices = data?.prices.filter((price) => !price.scheduled) ?? []
  const scheduled = data?.prices.filter((price) => price.scheduled) ?? []
  const nameMax = 30
  const descriptionMax = product.kind === "subscription" ? 45 : 45

  const saveRow = (row: (typeof rows)[number]) => {
    const draft = drafts[row.id] ?? { name: row.name, description: row.description }
    return run(
      `row-${row.id}`,
      async () => {
        const body = { locale: row.locale, name: draft.name, description: draft.description }
        apply(await api<ProductDetail>(row.isNew ? `${base}/localizations` : `${base}/localizations/${row.id}`, { method: row.isNew ? "POST" : "PATCH", body }))
        setDrafts(({ [row.id]: _, ...rest }) => rest)
        if (row.isNew) setNewLocales((list) => list.filter((code) => code !== row.locale))
      },
      t("purchases.localizationSaved", { locale: localeName(row.locale) }),
    )
  }

  return (
    <section className="submission-detail build-detail iap-detail">
      <div className="detail-head">
        <div>
          <span>
            {enumLabel("productType", current.type)}
            {group && ` · ${group}`}
          </span>
          <h2>
            {current.name}
            <em className={`iap-state ${tone}`}>{enumLabel("productState", current.state)}</em>
          </h2>
          <p>
            {t("purchases.productId")}{" "}
            <button
              className="iap-copy"
              title={t("action.copy")}
              onClick={() => {
                void navigator.clipboard?.writeText(current.productId)
                notify(t("purchases.copied"))
              }}
            >
              {current.productId}
            </button>{" "}
            · {t("purchases.appleId", { id: current.id })}
          </p>
        </div>
        <div className="build-actions">
          <ExternalButton href={ascLink(`/apps/${appId}/distribution/${product.kind === "subscription" ? `subscriptions/${product.id}` : `iaps/${product.id}`}`)}>{t("action.openAsc")}</ExternalButton>
        </div>
      </div>
      {tone === "rejected" && (
        <div className="rejection-card">
          <span className="rejection-icon">!</span>
          <div>
            <span>{t("review.resolutionCenter")}</span>
            <h3>{t("purchases.actionNeeded")}</h3>
            <p>{t("purchases.actionNeededBody")}</p>
          </div>
        </div>
      )}
      {current.state === "MISSING_METADATA" && (
        <div className="iap-notice">
          <strong>{t("purchases.missingTitle")}</strong>
          <ul>
            {existing.length === 0 && <li>{t("purchases.missingLocalization")}</li>}
            <li>{t("purchases.missingPrice")}</li>
            {!current.reviewNote && <li>{t("purchases.missingNotes")}</li>}
            <li>{t("purchases.missingScreenshot")}</li>
          </ul>
        </div>
      )}
      {(current.state === "WAITING_FOR_REVIEW" || current.state === "IN_REVIEW") && (
        <div className="iap-notice info">
          <strong>{t("purchases.inReview")}</strong>
          <span>{t("purchases.inReviewBody")}</span>
        </div>
      )}
      {!data ? (
        <LoadState loading={loading} error={error} onRetry={reload} />
      ) : (
        <div className="iap-sections">
          <div className="card">
            <CardHeading icon="metadata" tone="warm" title={t("purchases.localization")} note={t("purchases.localizationNote")}>
              <div className="iap-heading-actions">
                <span className="keyword-count">{t("metadata.languages", { count: existing.length })}</span>
                <div className="locale-picker" ref={menuRoot}>
                  <button className="add-button" disabled={available.length === 0} aria-haspopup="menu" aria-expanded={localeMenu} onClick={() => setLocaleMenu(!localeMenu)}>
                    <Icon name="plus" size={13} />
                    {t("purchases.addLanguage")}
                  </button>
                  {localeMenu && (
                    <div className="locale-menu iap-locale-menu" role="menu">
                      <div className="locale-menu-head">
                        <strong>{t("purchases.addLanguage")}</strong>
                        <span>{t("purchases.available", { count: available.length })}</span>
                      </div>
                      <div className="menu-scroll">
                        {available.map((code) => (
                          <button
                            key={code}
                            role="menuitem"
                            onClick={() => {
                              setNewLocales([...newLocales, code])
                              setLocaleMenu(false)
                            }}
                          >
                            <span className="locale-symbol">{localeBadge(code)}</span>
                            <span>
                              <strong>{localeName(code)}</strong>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardHeading>
            {rows.length === 0 ? (
              <p className="builds-empty">{t("purchases.noLocalizations")}</p>
            ) : (
              <div className="iap-table iap-local-table">
                <div className="iap-row iap-row-head">
                  <span>{t("purchases.language")}</span>
                  <span>{t("purchases.displayName")}</span>
                  <span>{t("purchases.description")}</span>
                  <span />
                </div>
                {rows.map((row) => {
                  const draft = drafts[row.id] ?? { name: row.name, description: row.description }
                  const changed = row.isNew || draft.name !== row.name || draft.description !== row.description
                  return (
                    <div className="iap-row" key={row.id}>
                      <span className="iap-lang">
                        <span className="locale-symbol">{localeBadge(row.locale)}</span>
                        <span>
                          <strong>{localeName(row.locale)}</strong>
                          <small>{row.isNew ? t("purchases.draft") : enumLabel("localizationState", row.state)}</small>
                        </span>
                      </span>
                      {(["name", "description"] as const).map((field) => (
                        <label className="iap-input" key={field}>
                          <input
                            aria-label={`${localeName(row.locale)} ${t(field === "name" ? "purchases.displayName" : "purchases.description")}`}
                            placeholder={field === "name" ? t("purchases.required") : t("purchases.optionalDescription")}
                            value={draft[field]}
                            maxLength={field === "name" ? nameMax : descriptionMax}
                            autoFocus={row.isNew && field === "name"}
                            onChange={(event) => setDrafts({ ...drafts, [row.id]: { ...draft, [field]: event.target.value } })}
                            onKeyDown={(event) => event.key === "Enter" && changed && draft.name.trim() && void saveRow(row)}
                          />
                          <small>
                            {[...draft[field]].length}/{field === "name" ? nameMax : descriptionMax}
                          </small>
                        </label>
                      ))}
                      <span className="iap-row-actions">
                        {changed && (
                          <button className="row-save" disabled={!draft.name.trim() || busy !== null} onClick={() => void saveRow(row)}>
                            {busy === `row-${row.id}` ? "…" : t("action.save")}
                          </button>
                        )}
                        <button
                          className="iap-remove"
                          aria-label={t("purchases.removeLanguage", { locale: localeName(row.locale) })}
                          title={t("purchases.removeLanguage", { locale: localeName(row.locale) })}
                          onClick={() => (row.isNew ? setNewLocales(newLocales.filter((code) => code !== row.locale)) : setRemoving({ id: row.id, locale: row.locale }))}
                        >
                          ×
                        </button>
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <div className="card">
            <CardHeading icon="database" tone="pale" title={t("purchases.pricing")} note={prices.length ? t("purchases.pricingNote") : t("purchases.noPrices")}>
              <ExternalButton className="add-button" href={ascLink(`/apps/${appId}/distribution/${product.kind === "subscription" ? `subscriptions/${product.id}` : `iaps/${product.id}`}`)}>
                {t("purchases.editPrices")}
              </ExternalButton>
            </CardHeading>
            {scheduled.map((price) => (
              <p className="notice-text iap-scheduled" key={`${price.territory}-${price.startDate}`}>
                {t("purchases.scheduled", { territory: regionName(price.territory), price: `${price.customerPrice} ${price.currency}`, date: date(price.startDate) })}
              </p>
            ))}
            {prices.length > 0 && (
              <div className="iap-table iap-price-table">
                <div className="iap-row iap-row-head">
                  <span>{t("purchases.territory")}</span>
                  <span>{t("purchases.currency")}</span>
                  <span>{t("purchases.customerPrice")}</span>
                  <span>{t("purchases.proceeds")}</span>
                </div>
                {prices.map((price) => (
                  <div className="iap-row" key={price.territory}>
                    <span>
                      {regionName(price.territory)}
                      {price.manual && product.kind === "iap" && <em className="iap-custom-tag">{t("purchases.base")}</em>}
                    </span>
                    <span>{price.currency}</span>
                    <strong>{money(price.customerPrice, price.currency, number)}</strong>
                    <span>{money(price.proceeds, price.currency, number)}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="field-hint">{t("purchases.pricingHint")}</p>
          </div>
          <div className="card">
            <CardHeading icon="settings" tone="sand" title={product.kind === "subscription" ? t("purchases.subscription") : t("purchases.availability")} note={product.kind === "subscription" ? t("purchases.subscriptionNote") : t("purchases.availabilityNote")} />
            <div className="iap-config">
              {(product.kind === "subscription"
                ? [
                    [t("purchases.duration"), enumLabel("period", current.period)],
                    [t("purchases.subscriptionGroup"), group ? t("purchases.groupProducts", { group, count: groupSize }) : "—"],
                    [t("purchases.level"), t("purchases.levelValue", { level: current.groupLevel ?? "—" })],
                  ]
                : [[t("purchases.type"), enumLabel("productType", current.type)]]
              ).map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
              <div className="iap-sharing">
                <div>
                  <span>{t("purchases.familySharing")}</span>
                  <p>{current.type === "CONSUMABLE" ? t("purchases.familyConsumable") : current.familySharable ? t("purchases.familyOn") : t("purchases.familyOff")}</p>
                </div>
                {current.type !== "CONSUMABLE" && (
                  <button
                    className={`iap-toggle ${current.familySharable ? "on" : ""}`}
                    role="switch"
                    aria-checked={current.familySharable}
                    aria-label={t("purchases.familySharing")}
                    disabled={busy !== null}
                    onClick={() => void run("family", async () => apply(await api<ProductDetail>(base, { method: "PATCH", body: { familySharable: !current.familySharable } })), t("purchases.saved"))}
                  >
                    <span />
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="card">
            <CardHeading icon="search" tone="orange" title={t("purchases.reviewInfo")} note={t("purchases.reviewInfoNote")} />
            <label className="iap-review-notes">
              <span className="iap-label">{t("metadata.reviewNotes")}</span>
              <textarea value={note} maxLength={4000} placeholder={t("purchases.notesPlaceholder")} onChange={(event) => setNotes(event.target.value)} />
              <div className="promo-footer">
                <span>
                  {number([...note].length)} / {number(4000)}
                </span>
                <button
                  disabled={notes === null || busy !== null}
                  onClick={() =>
                    void run(
                      "notes",
                      async () => {
                        apply(await api<ProductDetail>(base, { method: "PATCH", body: { reviewNote: note } }))
                        setNotes(null)
                      },
                      t("purchases.saved"),
                    )
                  }
                >
                  {busy === "notes" ? t("state.saving") : t("action.save")}
                </button>
              </div>
            </label>
          </div>
        </div>
      )}
      {removing && (
        <Confirm
          title={t("purchases.removeLanguage", { locale: localeName(removing.locale) })}
          body={t("purchases.removeLanguageBody")}
          confirmLabel={t("action.remove")}
          danger
          onClose={() => setRemoving(null)}
          onConfirm={async () => apply(await api<ProductDetail>(`${base}/localizations/${removing.id}`, { method: "DELETE" }))}
        />
      )}
    </section>
  )
}

function money(value: string, currency: string, fallback: (n: number) => string) {
  const amount = Number(value)
  if (!value || Number.isNaN(amount)) return "—"
  try {
    return new Intl.NumberFormat(document.documentElement.lang || undefined, { style: "currency", currency }).format(amount)
  } catch {
    return `${fallback(amount)} ${currency}`
  }
}
