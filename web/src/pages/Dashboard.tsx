import Icon from "../components/Icon"
import { CardHeading, Empty, ExternalButton, LoadState, PageHeading, ascLink } from "../components/ui"
import { useI18n } from "../i18n"
import { navigate } from "../lib/router"
import { buildTone, platformLabel, submissionStatus, submissionTone } from "../lib/status"
import type { App, Overview } from "../lib/types"
import { useApi } from "../lib/useApi"

export default function Dashboard({ app }: { app: App }) {
  const { t, enumLabel, date, number } = useI18n()
  const { data, error, loading, reload } = useApi<Overview>(`/apps/${app.id}/overview`)
  const latest = (platform: string) => data?.versions.find((item) => item.platform === platform)
  const ios = latest("IOS")
  const mac = latest("MAC_OS")
  const build = data?.builds[0]
  const review = data?.submissions[0]
  const filled = data?.locales.reduce((sum, item) => sum + item.filled, 0) ?? 0
  const total = data?.locales.reduce((sum, item) => sum + item.total, 0) ?? 0
  const percent = total ? Math.round((filled / total) * 100) : 0
  const go = (section: string) => navigate(`/apps/${app.id}/${section}`)

  return (
    <div className="review-workspace dashboard-workspace">
      <PageHeading icon="dashboard" title={t("nav.dashboard")}>
        <button className="quiet-button" onClick={() => void reload()} disabled={loading}>
          <Icon name="refresh" size={14} />
          {t("action.refresh")}
        </button>
        <ExternalButton href={ascLink(`/apps/${app.id}/distribution`)}>{t("action.openAsc")}</ExternalButton>
      </PageHeading>
      {!data ? (
        <LoadState loading={loading} error={error} onRetry={reload} />
      ) : (
        <>
          <section className="summary-grid">
            <div className="app-summary">
              <div className="fire-app-icon">{app.name.charAt(0)}</div>
              <div className="app-title">
                <span>{t("dashboard.app")}</span>
                <h2>{app.name}</h2>
                <p>
                  {app.bundleId} · {t("dashboard.sku", { sku: app.sku })} · {t("dashboard.appleId", { id: app.id })}
                </p>
              </div>
              <button className="round-button" aria-label={t("nav.metadata")} onClick={() => go("metadata")}>
                <Icon name="chevron" size={15} />
              </button>
              <div className="version-strip">
                <div>
                  <span>{t("dashboard.iosVersion")}</span>
                  <strong className={ios?.editable ? "draft" : ""}>{ios ? `${ios.versionString} · ${enumLabel("versionState", ios.state)}` : "—"}</strong>
                </div>
                <div>
                  <span>{t("dashboard.macVersion")}</span>
                  <strong className={mac?.editable ? "draft" : ""}>{mac ? `${mac.versionString} · ${enumLabel("versionState", mac.state)}` : "—"}</strong>
                </div>
                <div>
                  <span>{t("dashboard.latestBuild")}</span>
                  <strong>{build ? `${build.version} (${build.number}) · ${enumLabel("buildStatus", build.status)}` : "—"}</strong>
                </div>
                <div>
                  <span>{t("dashboard.lastReview")}</span>
                  <strong>{review ? `${review.version ?? "—"} · ${enumLabel("submissionStatus", submissionStatus(review))}` : "—"}</strong>
                </div>
              </div>
            </div>
            <div className="readiness-card">
              <div>
                <span className="card-label">{t("dashboard.localization")}</span>
                <h2>{t("dashboard.percentComplete", { percent })}</h2>
                <p>{data.versions[0] ? t("dashboard.localizationNote", { count: data.locales.length, version: data.versions[0].versionString }) : t("dashboard.noVersion")}</p>
              </div>
              <div className="completion-ring" style={{ background: `conic-gradient(var(--orange) 0 ${percent}%, #f5cdb8 ${percent}%)` }}>
                <div>
                  <strong>{percent}</strong>
                  <span>%</span>
                </div>
              </div>
              <button onClick={() => go("metadata")}>
                {t("dashboard.editMetadata")}
                <Icon name="chevron" size={13} />
              </button>
            </div>
          </section>
          <section className="dash-grid">
            <article className="card">
              <CardHeading icon="cloud" tone="warm" title={t("dashboard.recentBuilds")} note={t("dashboard.recentBuildsNote")}>
                <button className="add-button" onClick={() => go("builds")}>
                  {t("action.viewAll")}
                </button>
              </CardHeading>
              {data.builds.length === 0 ? (
                <p className="builds-empty">{t("builds.none")}</p>
              ) : (
                <div className="dash-list">
                  {data.builds.map((item) => (
                    <button key={item.id} onClick={() => navigate(`/apps/${app.id}/builds?platform=${item.platform}&build=${item.id}`)}>
                      <span className={`build-dot ${buildTone(item)}`} />
                      <span className="submission-copy">
                        <strong>{t("builds.buildNumber", { number: item.number })}</strong>
                        <small>
                          {platformLabel(item.platform)} · {t("common.version", { version: item.version })} · {date(item.uploadedDate)}
                        </small>
                      </span>
                      <span className={`build-state ${buildTone(item)}`}>{enumLabel("buildStatus", item.status)}</span>
                      <Icon name="chevron" size={13} />
                    </button>
                  ))}
                </div>
              )}
            </article>
            <article className="card">
              <CardHeading icon="check" tone="pale" title={t("dashboard.reviewActivity")} note={t("dashboard.reviewActivityNote")}>
                <button className="add-button" onClick={() => go("review")}>
                  {t("action.viewAll")}
                </button>
              </CardHeading>
              {data.submissions.length === 0 ? (
                <Empty icon="check" title={t("review.none")} />
              ) : (
                <div className="dash-list">
                  {data.submissions.map((item) => {
                    const status = submissionStatus(item)
                    return (
                      <button key={item.id} onClick={() => navigate(`/apps/${app.id}/review?submission=${item.id}`)}>
                        <span className={`submission-dot ${submissionTone(status)}`} />
                        <span className="submission-copy">
                          <strong>{item.version ? t("common.version", { version: item.version }) : t("review.otherItems")}</strong>
                          <small>
                            {platformLabel(item.platform)} · {item.submittedDate ? date(item.submittedDate) : t("review.notSubmitted")}
                          </small>
                        </span>
                        <span className={`submission-status ${submissionTone(status)}`}>{enumLabel("submissionStatus", status)}</span>
                        <Icon name="chevron" size={13} />
                      </button>
                    )
                  })}
                </div>
              )}
            </article>
          </section>
          <p className="page-footnote">{t("dashboard.versions", { count: number(data.versions.length) })}</p>
        </>
      )}
    </div>
  )
}
