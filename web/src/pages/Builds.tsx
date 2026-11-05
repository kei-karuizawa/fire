import { useEffect, useRef, useState } from "react"
import Icon from "../components/Icon"
import { CardHeading, Confirm, Empty, LoadState, Modal, PageHeading, useAction, useErrorText } from "../components/ui"
import { useI18n, type MessageKey } from "../i18n"
import { api } from "../lib/api"
import { setParam, useRoute } from "../lib/router"
import { buildTone, platformLabel } from "../lib/status"
import type { App, Build, BuildDetail, BuildsPage } from "../lib/types"
import { useApi } from "../lib/useApi"

const filters = ["all", "testing", "issues", "expired"] as const
type Filter = (typeof filters)[number]
const platforms = ["IOS", "MAC_OS"] as const

const matches = (build: Build, filter: Filter) =>
  filter === "all" ||
  (filter === "testing" && ["processing", "review", "testing", "ready"].includes(build.status)) ||
  (filter === "issues" && build.status === "rejected") ||
  (filter === "expired" && build.status === "expired")

export default function Builds({ app }: { app: App }) {
  const { t, enumLabel, date, number } = useI18n()
  const route = useRoute()
  const platform = platforms.find((item) => item === route.params.get("platform")) ?? "IOS"
  const [filter, setFilter] = useState<Filter>("all")
  const [inviting, setInviting] = useState(false)
  const { data, error, loading, reload } = useApi<BuildsPage>(`/apps/${app.id}/builds?platform=${platform}`)
  const visible = (data?.builds ?? []).filter((item) => matches(item, filter))
  const versions = [...new Set(visible.map((item) => item.version))]
  const selectedId = route.params.get("build")
  const selected = visible.find((item) => item.id === selectedId) ?? visible[0]
  const latest = data?.builds[0]
  const internal = data?.groups.filter((item) => item.internal) ?? []
  const external = data?.groups.filter((item) => !item.internal) ?? []
  const active = data?.builds.filter((item) => !item.expired).length ?? 0

  return (
    <div className="review-workspace builds-workspace">
      <PageHeading icon="cloud" title={t("nav.builds")}>
        <div className="platform-switch" role="group" aria-label={t("builds.platform")}>
          {platforms.map((item) => (
            <button
              key={item}
              className={platform === item ? "active" : ""}
              aria-pressed={platform === item}
              onClick={() => {
                setParam("build", null)
                setParam("platform", item)
              }}
            >
              {platformLabel(item)}
            </button>
          ))}
        </div>
        <button className="quiet-button" disabled={loading} onClick={() => void reload()}>
          <Icon name="refresh" size={14} />
          {t("builds.sync")}
        </button>
        <button className="accent-button" disabled={!data?.groups.length} onClick={() => setInviting(true)}>
          <Icon name="team" size={14} />
          {t("builds.invite")}
        </button>
      </PageHeading>
      {!data ? (
        <LoadState loading={loading} error={error} onRetry={reload} />
      ) : (
        <>
          <div className="builds-summary">
            <div>
              <span>{t("builds.latest")}</span>
              <strong>{latest ? `${latest.version} (${latest.number})` : "—"}</strong>
              <small>{latest ? enumLabel("buildStatus", latest.status) : t("builds.none")}</small>
            </div>
            <div>
              <span>{t("builds.testers")}</span>
              <strong>{number(data.testers)}</strong>
              <small>{t("builds.testersNote")}</small>
            </div>
            <div>
              <span>{t("builds.groups")}</span>
              <strong>{number(data.groups.length)}</strong>
              <small>{t("builds.groupsNote", { internal: internal.length, external: external.length })}</small>
            </div>
            <div>
              <span>{t("builds.available")}</span>
              <strong>{number(active)}</strong>
              <small>{t("builds.availableNote", { count: data.builds.length })}</small>
            </div>
          </div>
          <div className="review-split builds-split">
            <aside className="submission-pane">
              <div className="builds-filter" role="group">
                {filters.map((item) => (
                  <button key={item} className={filter === item ? "active" : ""} aria-pressed={filter === item} onClick={() => setFilter(item)}>
                    {t(`builds.filter.${item}` as MessageKey)}
                  </button>
                ))}
              </div>
              <div className="submission-list builds-list">
                {versions.map((version) => {
                  const items = visible.filter((item) => item.version === version)
                  return (
                    <section key={version}>
                      <h3>
                        {t("common.version", { version })}
                        <small>{t("builds.count", { count: items.length })}</small>
                      </h3>
                      {items.map((item) => (
                        <button key={item.id} className={selected?.id === item.id ? "selected" : ""} aria-current={selected?.id === item.id} onClick={() => setParam("build", item.id)}>
                          <span className={`build-dot ${buildTone(item)}`} />
                          <span className="submission-copy">
                            <strong>{t("builds.buildNumber", { number: item.number })}</strong>
                            <small>{date(item.uploadedDate)}</small>
                          </span>
                          <span className={`build-state ${buildTone(item)}`}>{enumLabel("buildStatus", item.status)}</span>
                          <Icon name="chevron" size={13} />
                        </button>
                      ))}
                    </section>
                  )
                })}
                {visible.length === 0 && <p className="builds-empty">{data.builds.length ? t("builds.noMatch") : t("builds.none")}</p>}
              </div>
            </aside>
            {selected ? (
              <BuildPanel key={selected.id} build={selected} groups={data.groups} onChanged={() => void reload()} />
            ) : (
              <section className="submission-detail build-detail">
                <Empty icon="cloud" title={t("builds.noneSelected")}>
                  <p>{t("builds.noneBody")}</p>
                </Empty>
              </section>
            )}
          </div>
        </>
      )}
      {inviting && data && <InviteTesters appId={app.id} groups={data.groups} onClose={() => setInviting(false)} onDone={() => void reload()} />}
    </div>
  )
}

const steps: MessageKey[] = ["builds.step.uploaded", "builds.step.processed", "builds.step.internal", "builds.step.betaReview", "builds.step.external"]

function progress(build: BuildDetail | Build) {
  const processed = build.processingState === "VALID"
  const internal = processed && ["IN_BETA_TESTING", "EXPIRED"].includes(build.internalState)
  const reviewed = ["BETA_APPROVED", "IN_BETA_TESTING", "READY_FOR_TESTING", "EXPIRED"].includes(build.externalState) && build.externalState !== "EXPIRED"
  const external = build.externalState === "IN_BETA_TESTING"
  const done = [true, processed, internal, reviewed, external]
  const inReview = ["WAITING_FOR_BETA_REVIEW", "IN_BETA_REVIEW"].includes(build.externalState)
  const current = build.processingState === "PROCESSING" ? 1 : inReview ? 3 : -1
  return { done, current }
}

function BuildPanel({ build, groups, onChanged }: { build: Build; groups: BuildsPage["groups"]; onChanged: () => void }) {
  const { t, enumLabel, dateTime, date, number } = useI18n()
  const { data, error, loading, reload, setData } = useApi<BuildDetail>(`/builds/${build.id}`)
  const { busy, run } = useAction()
  const [notes, setNotes] = useState<string | null>(null)
  const [groupMenu, setGroupMenu] = useState(false)
  const [confirm, setConfirm] = useState<"expire" | "submit" | null>(null)
  const menuRoot = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!groupMenu) return
    const dismiss = (event: PointerEvent) => !menuRoot.current?.contains(event.target as Node) && setGroupMenu(false)
    document.addEventListener("pointerdown", dismiss)
    return () => document.removeEventListener("pointerdown", dismiss)
  }, [groupMenu])

  const detail = data ?? null
  const shown = detail ?? build
  const { done, current } = progress(shown)
  const note = notes ?? detail?.whatToTest?.text ?? ""
  const editable = !build.expired && build.processingState === "VALID"
  const assigned = new Set(detail?.groups.map((item) => item.id))
  const addable = groups.filter((item) => !assigned.has(item.id))
  const canSubmit = editable && build.externalState === "READY_FOR_BETA_SUBMISSION" && Boolean(detail?.groups.some((item) => !item.internal))
  const daysLeft = Math.max(0, Math.ceil((new Date(build.expirationDate).getTime() - Date.now()) / 86400000))
  const update = async (path: string, method: string, body?: unknown) => {
    setData(await api<BuildDetail>(path, { method, body }))
    onChanged()
  }

  return (
    <section className="submission-detail build-detail">
      <div className="detail-head">
        <div>
          <span>
            {platformLabel(build.platform)} · {t("common.version", { version: build.version })}
          </span>
          <h2>
            {t("builds.buildNumber", { number: build.number })}
            <em className={`build-state ${buildTone(build)}`}>{enumLabel("buildStatus", build.status)}</em>
          </h2>
          <p>{t("builds.uploaded", { date: dateTime(build.uploadedDate) })}</p>
        </div>
        <div className="build-actions">
          {editable && (
            <button className="quiet-button" disabled={busy !== null} onClick={() => setConfirm("expire")}>
              {t("builds.expire")}
            </button>
          )}
          {canSubmit && (
            <button className="accent-button" disabled={busy !== null} onClick={() => setConfirm("submit")}>
              <Icon name="upload" size={14} />
              {t("builds.submitBeta")}
            </button>
          )}
        </div>
      </div>
      <ol className="build-timeline">
        {steps.map((step, index) => {
          const isCurrent = !done[index] && index === current
          return (
            <li key={step} className={done[index] ? "done" : isCurrent ? "current" : ""}>
              <i>{done[index] ? <Icon name="check" size={12} /> : index + 1}</i>
              <strong>{t(step)}</strong>
              <small>{index === 0 ? date(build.uploadedDate) : done[index] ? t("builds.step.done") : isCurrent ? t("builds.step.inProgress") : t("builds.step.notStarted")}</small>
            </li>
          )
        })}
      </ol>
      {!detail ? (
        <LoadState loading={loading} error={error} onRetry={reload} />
      ) : (
        <>
          <div className="build-metrics">
            <div>
              <span>{t("builds.installs")}</span>
              <strong>{detail.usage ? number(detail.usage.installs) : "—"}</strong>
              <small>{detail.usage ? t("builds.invited", { count: number(detail.usage.invites) }) : t("builds.noUsage")}</small>
            </div>
            <div>
              <span>{t("builds.sessions")}</span>
              <strong>{detail.usage ? number(detail.usage.sessions) : "—"}</strong>
              <small>{t("builds.sinceUpload")}</small>
            </div>
            <div>
              <span>{t("builds.crashes")}</span>
              <strong>{detail.usage ? number(detail.usage.crashes) : "—"}</strong>
              <small>{detail.usage?.sessions ? t("builds.crashRate", { rate: ((detail.usage.crashes / detail.usage.sessions) * 100).toFixed(2) }) : t("builds.noSessions")}</small>
            </div>
            <div>
              <span>{t("builds.feedback")}</span>
              <strong>{number(detail.usage?.feedback ?? detail.feedback.length)}</strong>
              <small>{t("builds.fromTesters")}</small>
            </div>
          </div>
          <div className="build-columns">
            <div className="card build-test-card">
              <CardHeading icon="metadata" tone="warm" title={t("builds.whatToTest")} note={t("builds.whatToTestNote")} />
              <textarea
                value={note}
                disabled={!editable}
                aria-label={t("builds.whatToTest")}
                placeholder={build.processingState === "PROCESSING" ? t("builds.whatToTestProcessing") : t("builds.whatToTestPlaceholder")}
                onChange={(event) => setNotes(event.target.value)}
              />
              <div className="promo-footer">
                <span>{`${number([...note].length)} / ${number(4000)}`}</span>
                {editable && (
                  <button
                    disabled={notes === null || busy !== null}
                    onClick={() =>
                      void run(
                        "notes",
                        async () => {
                          await update(`/builds/${build.id}`, "PATCH", { whatToTest: note })
                          setNotes(null)
                        },
                        t("builds.notesSaved"),
                      )
                    }
                  >
                    {busy === "notes" ? t("state.saving") : t("builds.saveNotes")}
                  </button>
                )}
              </div>
            </div>
            <div className="card build-info-card">
              <CardHeading icon="settings" tone="pale" title={t("builds.details")} note={t("builds.detailsNote")} />
              <dl>
                <div>
                  <dt>{t("builds.bundleId")}</dt>
                  <dd>{detail.bundleId || "—"}</dd>
                </div>
                <div>
                  <dt>{t("builds.minOs")}</dt>
                  <dd>{detail.minOsVersion ? `${platformLabel(build.platform)} ${detail.minOsVersion}` : "—"}</dd>
                </div>
                <div>
                  <dt>{t("builds.processing")}</dt>
                  <dd>{enumLabel("processingState", detail.processingState)}</dd>
                </div>
                <div>
                  <dt>{t("builds.encryption")}</dt>
                  <dd>{detail.usesNonExemptEncryption === null ? t("builds.encryption.unknown") : detail.usesNonExemptEncryption ? t("builds.encryption.uses") : t("builds.encryption.exempt")}</dd>
                </div>
                <div>
                  <dt>{t("builds.externalState")}</dt>
                  <dd>{enumLabel("betaState", detail.externalState)}</dd>
                </div>
              </dl>
              <div className="build-expiry">
                <span>
                  {t("builds.availability")}
                  <strong>{build.expired ? t("builds.expired") : t("builds.expiresIn", { count: daysLeft })}</strong>
                </span>
                <i>
                  <b style={{ width: `${build.expired ? 0 : Math.min(100, (daysLeft / 90) * 100)}%` }} />
                </i>
              </div>
            </div>
          </div>
          <div className="card build-groups-card">
            <CardHeading icon="team" tone="warm" title={t("builds.testerGroups")} note={t("builds.testerGroupsNote")}>
              {editable && addable.length > 0 && (
                <div className="locale-picker" ref={menuRoot}>
                  <button className="add-button" aria-haspopup="menu" aria-expanded={groupMenu} onClick={() => setGroupMenu(!groupMenu)}>
                    <Icon name="plus" size={13} />
                    {t("builds.addGroup")}
                  </button>
                  {groupMenu && (
                    <div className="locale-menu iap-locale-menu" role="menu">
                      <div className="locale-menu-head">
                        <strong>{t("builds.addGroup")}</strong>
                        <span>{t("builds.groupsAvailable", { count: addable.length })}</span>
                      </div>
                      {addable.map((group) => (
                        <button
                          key={group.id}
                          role="menuitem"
                          onClick={() => {
                            setGroupMenu(false)
                            void run("group", () => update(`/builds/${build.id}/groups/${group.id}`, "PUT"), t("builds.groupAdded", { name: group.name }))
                          }}
                        >
                          <span className="locale-symbol">{group.name.charAt(0)}</span>
                          <span>
                            <strong>{group.name}</strong>
                            <small>{t(group.internal ? "builds.internal" : "builds.external")}</small>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardHeading>
            {detail.groups.length > 0 ? (
              <div className="group-table">
                <div className="group-row group-row-head">
                  <span>{t("builds.group")}</span>
                  <span>{t("builds.testers")}</span>
                  <span>{t("builds.type")}</span>
                  <span />
                </div>
                {detail.groups.map((group) => (
                  <div className="group-row" key={group.id}>
                    <span className="group-name">
                      <strong>{group.name}</strong>
                      <small>{group.publicLinkEnabled && group.publicLink ? <a href={group.publicLink} target="_blank" rel="noreferrer noopener">{group.publicLink.replace("https://", "")}</a> : t("builds.noPublicLink")}</small>
                    </span>
                    <span>{number(group.testers)}</span>
                    <span>{t(group.internal ? "builds.internal" : "builds.external")}</span>
                    <span>
                      {editable && (
                        <button
                          className="iap-remove"
                          aria-label={t("builds.removeGroup", { name: group.name })}
                          title={t("builds.removeGroup", { name: group.name })}
                          disabled={busy !== null}
                          onClick={() => void run("group", () => update(`/builds/${build.id}/groups/${group.id}`, "DELETE"), t("builds.groupRemoved", { name: group.name }))}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="builds-empty">{editable ? t("builds.noGroups") : t("builds.groupsAfterProcessing")}</p>
            )}
          </div>
          <div className="card build-feedback-card">
            <CardHeading icon="bell" tone="sand" title={t("builds.testerFeedback")} note={t("builds.testerFeedbackNote")} />
            {detail.feedback.length > 0 ? (
              <div className="feedback-list">
                {detail.feedback.map((item) => (
                  <article key={item.id}>
                    <span className="message-avatar">{(item.email || "?").charAt(0).toUpperCase()}</span>
                    <div>
                      <div>
                        <strong>{item.email || t("builds.anonymous")}</strong>
                        <em className={item.kind === "crash" ? "crash" : ""}>{t(item.kind === "crash" ? "builds.crash" : "builds.screenshot")}</em>
                        <small>{dateTime(item.createdDate)}</small>
                      </div>
                      <p>{item.comment || t("builds.noComment")}</p>
                      <small>
                        {item.device}
                        {item.osVersion ? ` · ${item.osVersion}` : ""}
                      </small>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="builds-empty">{t("builds.noFeedback")}</p>
            )}
          </div>
        </>
      )}
      {confirm === "expire" && (
        <Confirm
          title={t("builds.expireTitle", { number: build.number })}
          body={t("builds.expireBody")}
          confirmLabel={t("builds.expire")}
          danger
          onClose={() => setConfirm(null)}
          onConfirm={() => update(`/builds/${build.id}`, "PATCH", { expire: true })}
        />
      )}
      {confirm === "submit" && (
        <Confirm
          title={t("builds.submitTitle", { number: build.number })}
          body={t("builds.submitBody")}
          confirmLabel={t("builds.submitBeta")}
          onClose={() => setConfirm(null)}
          onConfirm={() => update(`/builds/${build.id}/beta-review`, "POST", {})}
        />
      )}
    </section>
  )
}

function InviteTesters({ appId, groups, onClose, onDone }: { appId: string; groups: BuildsPage["groups"]; onClose: () => void; onDone: () => void }) {
  const { t } = useI18n()
  const errorText = useErrorText()
  const { busy, run } = useAction()
  const [email, setEmail] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [chosen, setChosen] = useState<string[]>(groups.filter((item) => !item.internal).slice(0, 1).map((item) => item.id))
  const [error, setError] = useState("")
  const submit = async () => {
    setError("")
    if (!/^[^\s@]+@[^\s@]+$/.test(email.trim())) return setError(t("invite.error.email"))
    if (chosen.length === 0) return setError(t("invite.error.group"))
    const ok = await run(
      "invite",
      async () => {
        try {
          await api(`/apps/${appId}/testers`, { method: "POST", body: { email: email.trim(), firstName, lastName, groupIds: chosen } })
        } catch (caught) {
          setError(errorText(caught))
          throw caught
        }
      },
      t("invite.sent", { email: email.trim() }),
    )
    if (ok) {
      onDone()
      onClose()
    }
  }
  return (
    <Modal
      title={t("builds.invite")}
      note={t("invite.note")}
      onClose={onClose}
      footer={
        <>
          <span className={error ? "profile-field-error" : ""}>{error || t("invite.footer")}</span>
          <div>
            <button type="button" className="quiet-button" onClick={onClose}>
              {t("action.cancel")}
            </button>
            <button type="button" className="accent-button" disabled={busy !== null} onClick={() => void submit()}>
              {busy ? t("state.working") : t("invite.send")}
            </button>
          </div>
        </>
      }
    >
      <label>
        <span>{t("invite.email")}</span>
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <div className="compact-field-grid modal-grid">
        <label>
          <span>{t("metadata.firstName")}</span>
          <input value={firstName} onChange={(event) => setFirstName(event.target.value)} />
        </label>
        <label>
          <span>{t("metadata.lastName")}</span>
          <input value={lastName} onChange={(event) => setLastName(event.target.value)} />
        </label>
      </div>
      <div className="profile-field">
        <span>{t("invite.groups")}</span>
        <div className="check-list">
          {groups.map((group) => (
            <label key={group.id}>
              <input type="checkbox" checked={chosen.includes(group.id)} onChange={(event) => setChosen(event.target.checked ? [...chosen, group.id] : chosen.filter((id) => id !== group.id))} />
              <span>
                <strong>{group.name}</strong>
                <small>{t(group.internal ? "builds.internal" : "builds.external")}</small>
              </span>
            </label>
          ))}
        </div>
      </div>
    </Modal>
  )
}
