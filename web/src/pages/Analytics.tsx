import { useEffect, useRef, useState } from "react"
import Icon from "../components/Icon"
import { CardHeading, LoadState, Modal, PageHeading } from "../components/ui"
import { useI18n, type MessageKey } from "../i18n"
import { readPrefs, writePrefs } from "../lib/profiles"
import { useSession } from "../lib/session"
import type { App, Sales } from "../lib/types"
import { useApi } from "../lib/useApi"

const ranges = [7, 30, 90] as const
type Metric = "downloads" | "redownloads" | "updates" | "purchases" | "proceeds"
const metrics: Metric[] = ["downloads", "redownloads", "updates", "purchases", "proceeds"]

const isoDay = (date: Date) => date.toISOString().slice(0, 10)

// Apple publishes a day's report the following day, so ranges end two days ago.
function rangeFor(days: number) {
  const end = new Date()
  end.setUTCDate(end.getUTCDate() - 2)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - days + 1)
  return { from: isoDay(start), to: isoDay(end) }
}

export default function Analytics({ app }: { app: App }) {
  const { t } = useI18n()
  const { active } = useSession()
  const [vendor, setVendor] = useState(() => (active ? (readPrefs(active.id).vendorNumber ?? "") : ""))
  const [editing, setEditing] = useState(false)
  const [days, setDays] = useState<(typeof ranges)[number]>(30)
  const { from, to } = rangeFor(days)
  const path = vendor ? `/apps/${app.id}/sales?vendor=${encodeURIComponent(vendor)}&from=${from}&to=${to}` : null
  const { data, error, loading, reload } = useApi<Sales>(path)
  const saveVendor = (value: string) => {
    if (active) writePrefs(active.id, { vendorNumber: value })
    setVendor(value)
    setEditing(false)
  }

  return (
    <div className="review-workspace builds-workspace an-workspace">
      <PageHeading icon="chart" title={t("nav.analytics")}>
        <div className="platform-switch" role="group" aria-label={t("analytics.range")}>
          {ranges.map((item) => (
            <button key={item} className={days === item ? "active" : ""} aria-pressed={days === item} onClick={() => setDays(item)}>
              {t("analytics.days", { count: item })}
            </button>
          ))}
        </div>
        <button className="quiet-button" onClick={() => setEditing(true)}>
          <Icon name="settings" size={14} />
          {vendor ? t("analytics.vendorShort", { vendor }) : t("analytics.setVendor")}
        </button>
        <button className="quiet-button" disabled={!data} onClick={() => data && exportCsv(data, app)}>
          <Icon name="download" size={14} />
          {t("analytics.export")}
        </button>
      </PageHeading>
      {!vendor ? (
        <section className="card vendor-card">
          <CardHeading icon="chart" tone="warm" title={t("analytics.setupTitle")} note={t("analytics.setupNote")} />
          <VendorForm initial="" onSave={saveVendor} />
        </section>
      ) : !data ? (
        <LoadState loading={loading} error={error} onRetry={reload} />
      ) : (
        <Report data={data} loading={loading} />
      )}
      {editing && (
        <Modal title={t("analytics.vendorTitle")} note={t("analytics.vendorNote")} onClose={() => setEditing(false)}>
          <VendorForm initial={vendor} onSave={saveVendor} />
        </Modal>
      )}
    </div>
  )
}

function VendorForm({ initial, onSave }: { initial: string; onSave: (value: string) => void }) {
  const { t } = useI18n()
  const [value, setValue] = useState(initial)
  const valid = /^[0-9]{6,12}$/.test(value.trim())
  return (
    <form
      className="vendor-form"
      onSubmit={(event) => {
        event.preventDefault()
        if (valid) onSave(value.trim())
      }}
    >
      <label>
        <span>{t("analytics.vendor")}</span>
        <input className="profile-mono" inputMode="numeric" value={value} placeholder="8XXXXXXX" onChange={(event) => setValue(event.target.value)} />
      </label>
      <button type="submit" className="accent-button" disabled={!valid}>
        {t("action.save")}
      </button>
      <p className="field-hint">{t("analytics.vendorHint")}</p>
    </form>
  )
}

function Report({ data, loading }: { data: Sales; loading: boolean }) {
  const { t, money, compact, number, shortDate, date, regionName, enumLabel } = useI18n()
  const [selected, setSelected] = useState<Metric>("downloads")
  const [view, setView] = useState<"chart" | "table">("chart")
  const currency = data.currencies[0] ?? "USD"
  const valueOf = (day: Sales["days"][number], metric: Metric) => (metric === "proceeds" ? (day.proceeds[currency] ?? 0) : day[metric])
  const total = (metric: Metric) => data.days.reduce((sum, day) => sum + valueOf(day, metric), 0)
  const format = (metric: Metric, value: number, full = false) => (metric === "proceeds" ? money(value, currency, !full) : full ? number(Math.round(value)) : compact(value))
  const missing = data.days.filter((day) => !day.available).length
  const series = data.days.map((day) => valueOf(day, selected))
  const label = (metric: Metric) => t(`analytics.metric.${metric}` as MessageKey)
  const territoryMax = Math.max(...data.territories.map((item) => item.downloads), 0)

  return (
    <>
      <div className="an-filters">
        <span className="an-range-label">
          <Icon name="calendar" size={15} />
          <strong>
            {date(data.from)} – {date(data.to)}
          </strong>
        </span>
        <span className="an-updated">
          {loading ? t("state.loading") : missing ? t("analytics.missingDays", { count: missing }) : t("analytics.source")}
        </span>
      </div>
      <section className="card an-trend">
        <div className="an-metrics" role="tablist" style={{ "--an-cols": metrics.length } as React.CSSProperties}>
          {metrics.map((metric) => (
            <button key={metric} role="tab" aria-selected={selected === metric} className={selected === metric ? "active" : ""} onClick={() => setSelected(metric)}>
              <span>{label(metric)}</span>
              <strong>{format(metric, total(metric))}</strong>
              {metric === "proceeds" && data.currencies.length > 1 ? <em>{t("analytics.otherCurrencies", { count: data.currencies.length - 1 })}</em> : <em>{t("analytics.days", { count: data.days.length })}</em>}
            </button>
          ))}
        </div>
        <div className="an-trend-head">
          <div className="an-legend">
            <span>
              <i />
              {label(selected)}
              {selected === "proceeds" ? ` (${currency})` : ""}
            </span>
          </div>
          <div className="platform-switch an-view-switch">
            {(["chart", "table"] as const).map((item) => (
              <button key={item} className={view === item ? "active" : ""} aria-pressed={view === item} onClick={() => setView(item)}>
                {t(item === "chart" ? "analytics.chart" : "analytics.table")}
              </button>
            ))}
          </div>
        </div>
        {view === "chart" ? (
          <TrendChart labels={data.days.map((day) => shortDate(day.date))} tooltips={data.days.map((day) => date(day.date))} values={series} format={(value) => format(selected, value, true)} axisFormat={(value) => format(selected, value)} label={label(selected)} />
        ) : (
          <div className="an-table-view">
            <table>
              <thead>
                <tr>
                  <th>{t("analytics.date")}</th>
                  {metrics.map((metric) => (
                    <th key={metric}>{label(metric)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...data.days].reverse().map((day) => (
                  <tr key={day.date}>
                    <td>{date(day.date)}</td>
                    {metrics.map((metric) => (
                      <td key={metric}>{day.available ? format(metric, valueOf(day, metric), true) : "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <div className="an-grid">
        <section className="card">
          <CardHeading icon="globe" tone="warm" title={t("analytics.territories")} note={t("analytics.territoriesNote")} />
          {data.territories.length === 0 ? (
            <p className="builds-empty">{t("analytics.noSales")}</p>
          ) : (
            <div className="an-bars">
              {data.territories.slice(0, 10).map((row) => (
                <div key={row.key} className="an-bar-row">
                  <span title={regionName(row.key)}>{regionName(row.key)}</span>
                  <div className="an-track" title={`${number(row.downloads)}`}>
                    <b style={{ width: `${territoryMax ? (row.downloads / territoryMax) * 100 : 0}%` }} />
                  </div>
                  <strong>{compact(row.downloads)}</strong>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="card">
          <CardHeading icon="tag" tone="pale" title={t("analytics.products")} note={t("analytics.productsNote")} />
          {data.products.length === 0 ? (
            <p className="builds-empty">{t("analytics.noSales")}</p>
          ) : (
            <div className="an-table-view an-products">
              <table>
                <thead>
                  <tr>
                    <th>{t("analytics.product")}</th>
                    <th>{t("analytics.units")}</th>
                    <th>{t("analytics.metric.proceeds")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.map((row) => (
                    <tr key={row.key}>
                      <td>
                        <strong>{row.title || row.key}</strong>
                        <small>{enumLabel("salesKind", row.kind)}</small>
                      </td>
                      <td>{number(Math.round(row.units))}</td>
                      <td>{row.proceeds[currency] ? money(row.proceeds[currency], currency) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      <p className="page-footnote">{t("analytics.footnote")}</p>
    </>
  )
}

function niceScale(value: number) {
  const raw = value / 4 || 1
  const power = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((item) => item * power).find((item) => item >= raw) ?? raw
  return [0, 1, 2, 3, 4].map((index) => index * step)
}

function TrendChart({ labels, tooltips, values, format, axisFormat, label }: { labels: string[]; tooltips: string[]; values: number[]; format: (value: number) => string; axisFormat: (value: number) => string; label: string }) {
  const { t } = useI18n()
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(720)
  const [hover, setHover] = useState<number | null>(null)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => entry && setWidth(entry.contentRect.width))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  const height = 290
  const pad = { top: 26, right: 64, bottom: 30, left: 56 }
  const plotWidth = Math.max(width - pad.left - pad.right, 10)
  const plotHeight = height - pad.top - pad.bottom
  const last = values.length - 1
  const ticks = niceScale(Math.max(...values, 0))
  const max = ticks[ticks.length - 1] || 1
  const x = (index: number) => pad.left + (index * plotWidth) / Math.max(last, 1)
  const y = (value: number) => pad.top + plotHeight - (value / max) * plotHeight
  const path = values.map((value, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(value).toFixed(1)}`).join("")
  const labelEvery = Math.ceil(values.length / Math.max(plotWidth / 90, 2))
  if (values.length === 0) return <p className="builds-empty">{t("analytics.noSales")}</p>
  return (
    <div
      ref={ref}
      className="an-chart"
      tabIndex={0}
      aria-label={t("analytics.chartLabel", { label })}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault()
          setHover(Math.min(Math.max((hover ?? last) + (event.key === "ArrowLeft" ? -1 : 1), 0), last))
        }
      }}
      onBlur={() => setHover(null)}
    >
      <svg width={width} height={height} role="img" aria-label={label}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line className="an-gridline" x1={pad.left} x2={pad.left + plotWidth} y1={y(tick)} y2={y(tick)} />
            <text className="an-axis" x={pad.left - 10} y={y(tick) + 4}>
              {axisFormat(tick)}
            </text>
          </g>
        ))}
        {labels.map((text, index) => (last - index) % labelEvery === 0 && <text key={index} className="an-axis an-axis-x" x={x(index)} y={height - 8}>{text}</text>)}
        <path className="an-area" d={`${path}L${x(last)},${y(0)}L${x(0)},${y(0)}Z`} />
        <path className="an-line" d={path} />
        <circle className="an-dot" cx={x(last)} cy={y(values[last])} r={4} />
        <text className="an-end-label" x={x(last) + 9} y={y(values[last]) + 4}>
          {axisFormat(values[last])}
        </text>
        {hover !== null && (
          <g>
            <line className="an-crosshair" x1={x(hover)} x2={x(hover)} y1={pad.top} y2={y(0)} />
            <circle className="an-dot" cx={x(hover)} cy={y(values[hover])} r={4} />
          </g>
        )}
        <rect
          className="an-hit"
          x={pad.left - 8}
          y={0}
          width={plotWidth + 16}
          height={height}
          onPointerMove={(event) => {
            const left = event.currentTarget.ownerSVGElement?.getBoundingClientRect().left ?? 0
            setHover(Math.min(Math.max(Math.round(((event.clientX - left - pad.left) / plotWidth) * last), 0), last))
          }}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {hover !== null && (
        <div className={`an-tooltip ${x(hover) > width - 210 ? "flip" : ""}`} style={{ left: x(hover), top: pad.top }}>
          <small>{tooltips[hover]}</small>
          <div>
            <i />
            <strong>{format(values[hover])}</strong>
            <span>{label}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function exportCsv(data: Sales, app: App) {
  const currencies = data.currencies
  const header = ["date", "downloads", "redownloads", "updates", "in_app_purchases", ...currencies.map((code) => `proceeds_${code}`)]
  const rows = data.days.map((day) => [day.date, day.downloads, day.redownloads, day.updates, day.purchases, ...currencies.map((code) => (day.proceeds[code] ?? 0).toFixed(2))].join(","))
  const blob = new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv" })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = `${app.sku || app.id}-sales-${data.from}-${data.to}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}
