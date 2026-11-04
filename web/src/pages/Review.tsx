import { useState } from "react"
import Icon from "../components/Icon"
import { Confirm, Empty, ExternalButton, LoadState, PageHeading, ascLink } from "../components/ui"
import { useI18n } from "../i18n"
import { api } from "../lib/api"
import { navigate, setParam, useRoute } from "../lib/router"
import { platformLabel, submissionStatus, submissionTone } from "../lib/status"
import type { App, Submission } from "../lib/types"
import { useApi } from "../lib/useApi"

export default function Review({ app }: { app: App }) {
  const { t, enumLabel, date, dateTime } = useI18n()
  const route = useRoute()
  const { data, error, loading, reload, setData } = useApi<{ submissions: Submission[] }>(`/apps/${app.id}/reviews`)
  const [canceling, setCanceling] = useState<Submission | null>(null)
  const submissions = data?.submissions ?? []
  const selectedId = route.params.get("submission")
  const selected = submissions.find((item) => item.id === selectedId) ?? submissions[0]
  const status = selected ? submissionStatus(selected) : null
  const reviewLink = ascLink(`/apps/${app.id}/distribution/reviewsubmissions${selected ? `/details/${selected.id}` : ""}`)

  return (
    <div className="review-workspace">
      <PageHeading icon="search" title={t("nav.review")}>
        <button className="quiet-button" disabled={loading} onClick={() => void reload()}>
          <Icon name="refresh" size={14} />
          {loading && data ? t("state.loading") : t("review.sync")}
        </button>
      </PageHeading>
      {!data ? (
        <LoadState loading={loading} error={error} onRetry={reload} />
      ) : submissions.length === 0 ? (
        <Empty icon="check" title={t("review.none")}>
          <p>{t("review.noneBody")}</p>
          <button className="accent-button" onClick={() => navigate(`/apps/${app.id}/metadata`)}>
            {t("review.goMetadata")}
          </button>
        </Empty>
      ) : (
        <div className="review-split">
          <aside className="submission-pane">
            <div className="submission-pane-head">
              <span>{t("review.history")}</span>
              <strong>{submissions.length}</strong>
            </div>
            <div className="submission-list">
              {submissions.map((item) => {
                const itemStatus = submissionStatus(item)
                return (
                  <button key={item.id} className={selected?.id === item.id ? "selected" : ""} aria-current={selected?.id === item.id} onClick={() => setParam("submission", item.id)}>
                    <span className={`submission-dot ${submissionTone(itemStatus)}`} />
                    <span className="submission-copy">
                      <strong>{item.version ? t("common.version", { version: item.version }) : t("review.otherItems")}</strong>
                      <small>
                        {item.buildNumber ? `${t("builds.buildNumber", { number: item.buildNumber })} · ` : ""}
                        {item.submittedDate ? date(item.submittedDate) : t("review.notSubmitted")}
                      </small>
                    </span>
                    <span className={`submission-status ${submissionTone(itemStatus)}`}>{enumLabel("submissionStatus", itemStatus)}</span>
                    <Icon name="chevron" size={13} />
                  </button>
                )
              })}
            </div>
          </aside>
          {selected && status && (
            <section className="submission-detail">
              <div className="detail-head">
                <div>
                  <span>
                    {platformLabel(selected.platform)}
                    {selected.version ? ` · ${t("common.version", { version: selected.version })}` : ""}
                  </span>
                  <h2>{enumLabel("submissionStatus", status)}</h2>
                  <p>{selected.submittedDate ? t("review.submittedBy", { date: dateTime(selected.submittedDate), name: selected.submittedBy || "—" }) : t("review.notSubmittedBody")}</p>
                </div>
                <div className="build-actions">
                  {(status === "waiting" || status === "draft" || status === "rejected") && (
                    <button className="quiet-button" onClick={() => setCanceling(selected)}>
                      {t("review.cancel")}
                    </button>
                  )}
                  <ExternalButton href={reviewLink}>{t("action.openAsc")}</ExternalButton>
                </div>
              </div>
              {status === "approved" && (
                <div className="approval-card">
                  <span>
                    <Icon name="check" size={16} />
                  </span>
                  <div>
                    <strong>{t("review.approvedTitle")}</strong>
                    <p>{t("review.approvedBody")}</p>
                  </div>
                </div>
              )}
              {status === "rejected" && (
                <div className="rejection-card">
                  <span className="rejection-icon">!</span>
                  <div>
                    <span>{t("review.resolutionCenter")}</span>
                    <h3>{t("review.rejectedTitle")}</h3>
                    <p>{t("review.rejectedBody")}</p>
                  </div>
                  <a href={reviewLink} target="_blank" rel="noreferrer noopener">
                    {t("review.readMessages")} <Icon name="chevron" size={12} />
                  </a>
                </div>
              )}
              {(status === "removed" || status === "canceling") && (
                <div className="withdrawn-card">
                  <span>
                    <Icon name="download" size={16} />
                  </span>
                  <div>
                    <strong>{t(status === "canceling" ? "review.cancelingTitle" : "review.removedTitle")}</strong>
                    <p>{t("review.removedBody")}</p>
                  </div>
                </div>
              )}
              {(status === "waiting" || status === "inReview" || status === "draft") && (
                <div className="approval-card pending-card">
                  <span>
                    <Icon name="calendar" size={16} />
                  </span>
                  <div>
                    <strong>{t(status === "draft" ? "review.draftTitle" : status === "inReview" ? "review.inReviewTitle" : "review.waitingTitle")}</strong>
                    <p>{t(status === "draft" ? "review.draftBody" : "review.waitingBody")}</p>
                  </div>
                </div>
              )}
              <div className="review-issues">
                <div className="issues-summary">
                  <h3>{t("review.details")}</h3>
                </div>
                <dl className="detail-list">
                  <div>
                    <dt>{t("review.platform")}</dt>
                    <dd>{platformLabel(selected.platform)}</dd>
                  </div>
                  <div>
                    <dt>{t("review.version")}</dt>
                    <dd>{selected.version ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>{t("review.build")}</dt>
                    <dd>{selected.buildNumber ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>{t("review.versionState")}</dt>
                    <dd>{enumLabel("versionState", selected.versionState)}</dd>
                  </div>
                  <div>
                    <dt>{t("review.submitted")}</dt>
                    <dd>{dateTime(selected.submittedDate)}</dd>
                  </div>
                  <div>
                    <dt>{t("review.submitter")}</dt>
                    <dd>{selected.submittedBy || "—"}</dd>
                  </div>
                </dl>
                <div className="issues-summary">
                  <h3>{t("review.items", { count: selected.items.length })}</h3>
                </div>
                <div className="review-item-list">
                  {selected.items.map((item) => (
                    <div key={item.id}>
                      <strong>{enumLabel("itemKind", item.kind)}</strong>
                      <span className={`submission-status ${item.state === "APPROVED" || item.state === "ACCEPTED" ? "approved" : item.state === "REJECTED" ? "rejected" : "withdrawn"}`}>{enumLabel("itemState", item.state)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      )}
      {canceling && (
        <Confirm
          title={t("review.cancelTitle")}
          body={t("review.cancelBody", { version: canceling.version ?? "" })}
          confirmLabel={t("review.cancel")}
          danger
          onClose={() => setCanceling(null)}
          onConfirm={async () => {
            setData(await api<{ submissions: Submission[] }>(`/apps/${app.id}/reviews/${canceling.id}/cancel`, { method: "POST", body: {} }))
          }}
        />
      )}
    </div>
  )
}
