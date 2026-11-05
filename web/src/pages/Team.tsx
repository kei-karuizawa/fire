import { useState } from "react"
import Icon from "../components/Icon"
import { CardHeading, Confirm, LoadState, Modal, PageHeading, useAction, useErrorText } from "../components/ui"
import { useI18n } from "../i18n"
import { api } from "../lib/api"
import type { Invitation, Team as TeamDoc, TeamUser } from "../lib/types"
import { useApi } from "../lib/useApi"

const grantable = ["ADMIN", "APP_MANAGER", "DEVELOPER", "MARKETING", "SALES", "FINANCE", "ACCESS_TO_REPORTS", "CUSTOMER_SUPPORT", "CREATE_APPS"]

export default function Team() {
  const { t, enumLabel, date } = useI18n()
  const { data, error, loading, reload, setData } = useApi<TeamDoc>("/team")
  const [inviting, setInviting] = useState(false)
  const [removing, setRemoving] = useState<TeamUser | null>(null)
  const [canceling, setCanceling] = useState<Invitation | null>(null)
  const initials = (first: string, last: string, fallback: string) => ((first.charAt(0) + last.charAt(0)).toUpperCase() || fallback.charAt(0).toUpperCase())
  const roles = (list: string[]) => (
    <span className="role-list">
      {list.map((role) => (
        <em key={role} className={role === "ACCOUNT_HOLDER" || role === "ADMIN" ? "strong" : ""}>
          {enumLabel("role", role)}
        </em>
      ))}
    </span>
  )

  return (
    <div className="review-workspace">
      <PageHeading icon="team" title={t("nav.team")}>
        <button className="quiet-button" disabled={loading} onClick={() => void reload()}>
          <Icon name="refresh" size={14} />
          {t("action.refresh")}
        </button>
        <button className="accent-button" onClick={() => setInviting(true)}>
          <Icon name="plus" size={14} />
          {t("team.invite")}
        </button>
      </PageHeading>
      {!data ? (
        <LoadState loading={loading} error={error} onRetry={reload} />
      ) : (
        <div className="team-stack">
          <section className="card">
            <CardHeading icon="team" tone="warm" title={t("team.people")} note={t("team.peopleNote", { count: data.users.length })} />
            <div className="team-table">
              <div className="team-row team-row-head">
                <span>{t("team.name")}</span>
                <span>{t("team.roles")}</span>
                <span>{t("team.apps")}</span>
                <span />
              </div>
              {data.users.map((user) => (
                <div className="team-row" key={user.id}>
                  <span className="team-person">
                    <i className="message-avatar">{initials(user.firstName, user.lastName, user.username)}</i>
                    <span>
                      <strong>{[user.firstName, user.lastName].filter(Boolean).join(" ") || user.username}</strong>
                      <small>{user.username}</small>
                    </span>
                  </span>
                  {roles(user.roles)}
                  <span>{user.allAppsVisible ? t("team.allApps") : t("team.someApps")}</span>
                  <span>
                    {!user.roles.includes("ACCOUNT_HOLDER") && (
                      <button className="iap-remove" title={t("team.remove")} aria-label={t("team.removeName", { name: user.username })} onClick={() => setRemoving(user)}>
                        ×
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </section>
          <section className="card">
            <CardHeading icon="bell" tone="sand" title={t("team.pending")} note={t("team.pendingNote")} />
            {data.invitations.length === 0 ? (
              <p className="builds-empty">{t("team.noPending")}</p>
            ) : (
              <div className="team-table">
                {data.invitations.map((invite) => (
                  <div className="team-row" key={invite.id}>
                    <span className="team-person">
                      <i className="message-avatar pending">{initials(invite.firstName, invite.lastName, invite.email)}</i>
                      <span>
                        <strong>{[invite.firstName, invite.lastName].filter(Boolean).join(" ") || invite.email}</strong>
                        <small>{invite.email}</small>
                      </span>
                    </span>
                    {roles(invite.roles)}
                    <span>{t("team.expires", { date: date(invite.expirationDate) })}</span>
                    <span>
                      <button className="iap-remove" title={t("team.cancelInvite")} aria-label={t("team.cancelInvite")} onClick={() => setCanceling(invite)}>
                        ×
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
      {inviting && <InviteDialog onClose={() => setInviting(false)} onDone={setData} />}
      {removing && (
        <Confirm
          title={t("team.removeTitle", { name: removing.username })}
          body={t("team.removeBody")}
          confirmLabel={t("team.remove")}
          danger
          onClose={() => setRemoving(null)}
          onConfirm={async () => setData(await api<TeamDoc>(`/team/users/${removing.id}`, { method: "DELETE" }))}
        />
      )}
      {canceling && (
        <Confirm
          title={t("team.cancelInvite")}
          body={t("team.cancelBody", { email: canceling.email })}
          confirmLabel={t("team.cancelInvite")}
          danger
          onClose={() => setCanceling(null)}
          onConfirm={async () => setData(await api<TeamDoc>(`/team/invitations/${canceling.id}`, { method: "DELETE" }))}
        />
      )}
    </div>
  )
}

function InviteDialog({ onClose, onDone }: { onClose: () => void; onDone: (team: TeamDoc) => void }) {
  const { t, enumLabel } = useI18n()
  const errorText = useErrorText()
  const { busy, run } = useAction()
  const [email, setEmail] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [roles, setRoles] = useState<string[]>(["DEVELOPER"])
  const [allApps, setAllApps] = useState(true)
  const [error, setError] = useState("")
  const submit = async () => {
    setError("")
    if (!/^[^\s@]+@[^\s@]+$/.test(email.trim())) return setError(t("invite.error.email"))
    if (!firstName.trim() || !lastName.trim()) return setError(t("team.error.name"))
    if (roles.length === 0) return setError(t("team.error.role"))
    const ok = await run(
      "invite",
      async () => {
        try {
          onDone(await api<TeamDoc>("/team/invitations", { method: "POST", body: { email: email.trim(), firstName: firstName.trim(), lastName: lastName.trim(), roles, allAppsVisible: allApps } }))
        } catch (caught) {
          setError(errorText(caught))
          throw caught
        }
      },
      t("invite.sent", { email: email.trim() }),
    )
    if (ok) onClose()
  }
  return (
    <Modal
      title={t("team.invite")}
      note={t("team.inviteNote")}
      onClose={onClose}
      footer={
        <>
          <span className={error ? "profile-field-error" : ""}>{error || t("team.inviteFooter")}</span>
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
        <span>{t("team.roles")}</span>
        <div className="check-list two-columns">
          {grantable.map((role) => (
            <label key={role}>
              <input type="checkbox" checked={roles.includes(role)} onChange={(event) => setRoles(event.target.checked ? [...roles, role] : roles.filter((item) => item !== role))} />
              <span>
                <strong>{enumLabel("role", role)}</strong>
              </span>
            </label>
          ))}
        </div>
      </div>
      <label className="demo-toggle">
        <input type="checkbox" checked={allApps} onChange={(event) => setAllApps(event.target.checked)} />
        {t("team.allAppsAccess")}
      </label>
    </Modal>
  )
}
