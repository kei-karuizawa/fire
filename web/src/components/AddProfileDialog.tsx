import { useEffect, useRef, useState } from "react"
import { useI18n, type MessageKey } from "../i18n"
import { api, ApiError } from "../lib/api"
import { canSignInBrowser, importP8, signToken, type KeyType } from "../lib/jwt"
import { profileIconStyle, profileTones, type Profile, type ProfileGlyph, type ProfileTone } from "../lib/profiles"
import Icon from "./Icon"
import { ProfileGlyphMark } from "./ProfileGlyphMark"
import { useErrorText } from "./ui"

const glyphs: [Exclude<ProfileGlyph, "image">, MessageKey][] = [
  ["initials", "profile.glyph.initials"],
  ["store", "profile.glyph.store"],
  ["apps", "profile.glyph.apps"],
  ["team", "profile.glyph.team"],
  ["tag", "profile.glyph.tag"],
  ["cloud", "profile.glyph.cloud"],
  ["chart", "profile.glyph.chart"],
  ["globe", "profile.glyph.globe"],
]

const imageTypes = ["image/png", "image/jpeg", "image/webp"]

function readImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    if (!imageTypes.includes(file.type)) return reject(new Error("type"))
    if (file.size > 2 * 1024 * 1024) return reject(new Error("size"))
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("read"))
    reader.onload = () => {
      const url = String(reader.result)
      const image = new Image()
      image.onload = () => resolve(url)
      image.onerror = () => reject(new Error("read"))
      image.src = url
    }
    reader.readAsDataURL(file)
  })
}

export default function AddProfileDialog({ profiles, onAdd, onClose, closable = true }: { profiles: Profile[]; onAdd: (profile: Profile) => Promise<void>; onClose: () => void; closable?: boolean }) {
  const { t } = useI18n()
  const errorText = useErrorText()
  const [name, setName] = useState("")
  const [glyph, setGlyph] = useState<ProfileGlyph>("initials")
  const [tone, setTone] = useState<ProfileTone>("Sand")
  const [image, setImage] = useState("")
  const [imageName, setImageName] = useState("")
  const [imageError, setImageError] = useState("")
  const [keyType, setKeyType] = useState<KeyType>("team")
  const [issuerId, setIssuerId] = useState("")
  const [keyId, setKeyId] = useState("")
  const [keyFile, setKeyFile] = useState("")
  const [key, setKey] = useState<CryptoKey | null>(null)
  const [fileError, setFileError] = useState("")
  const [dragging, setDragging] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const [checking, setChecking] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const nameInput = useRef<HTMLInputElement>(null)
  const secure = canSignInBrowser()

  useEffect(() => {
    nameInput.current?.focus()
    if (!closable) return
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const chooseImage = async (file: File | undefined) => {
    if (!file) return
    try {
      setImage(await readImage(file))
      setImageName(file.name)
      setImageError("")
      setGlyph("image")
    } catch (error) {
      const reason = (error as Error).message
      setImageError(t(reason === "type" ? "profile.image.type" : reason === "size" ? "profile.image.size" : "profile.image.unreadable"))
    }
  }

  const chooseFile = async (file: File | undefined) => {
    if (!file) return
    setKey(null)
    setKeyFile("")
    if (!file.name.toLowerCase().endsWith(".p8") || file.size > 16 * 1024) {
      setFileError(t("profile.key.wrongFile"))
      return
    }
    try {
      const imported = await importP8(await file.text())
      setKey(imported)
      setKeyFile(file.name)
      setFileError("")
      // Apple names the download AuthKey_<KEY ID>.p8.
      const match = /^AuthKey_([A-Za-z0-9]{10})\.p8$/i.exec(file.name)
      if (match && !keyId) setKeyId(match[1].toUpperCase())
    } catch {
      setFileError(t("profile.key.unreadable"))
    }
  }

  const trimmedName = name.trim()
  const trimmedIssuer = issuerId.trim()
  const errors = {
    name: !trimmedName
      ? t("profile.error.name")
      : profiles.some((item) => item.name.toLowerCase() === trimmedName.toLowerCase())
        ? t("profile.error.nameTaken")
        : "",
    issuerId: keyType === "team" && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmedIssuer) ? t("profile.error.issuer") : "",
    keyId: !/^[A-Z0-9]{10}$/.test(keyId) ? t("profile.error.keyId") : profiles.some((item) => item.keyId === keyId && !item.server) ? t("profile.error.keyTaken") : "",
    keyFile: key ? "" : fileError || t("profile.error.keyFile"),
  }
  const invalid = Object.values(errors).some(Boolean)
  const show = (error: string) => (attempted && error ? <small className="profile-field-error">{error}</small> : null)

  const submit = async () => {
    setAttempted(true)
    setSubmitError("")
    if (invalid || !key) return
    setChecking(true)
    try {
      // Check the key with Apple before saving it.
      const token = await signToken(key, keyId, keyType, keyType === "team" ? trimmedIssuer : undefined)
      await api("/apps", { token })
      await onAdd({
        id: `profile-${keyId}`,
        name: trimmedName,
        glyph,
        tone,
        image: glyph === "image" ? image : undefined,
        keyType,
        keyId,
        issuerId: keyType === "team" ? trimmedIssuer : undefined,
        keyFile,
        key,
      })
    } catch (error) {
      setSubmitError(error instanceof ApiError && error.status === 401 ? t("profile.error.rejected") : errorText(error))
      setChecking(false)
    }
  }

  return (
    <div className="attachment-overlay" onMouseDown={(event) => closable && event.target === event.currentTarget && onClose()}>
      <form
        className="attachment-modal profile-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-profile-title"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <div className="attachment-modal-head">
          <div>
            <h2 id="add-profile-title">{t("profile.add")}</h2>
            <p>{t("profile.addNote")}</p>
          </div>
          {closable && (
            <button type="button" className="modal-close" onClick={onClose} aria-label={t("action.close")}>
              ×
            </button>
          )}
        </div>
        <div className="profile-form">
          <p className="profile-form-hint">{t("profile.hint")}</p>
          {!secure && <p className="profile-form-hint warning">{t("profile.insecure")}</p>}
          <label>
            <span>{t("profile.name")}</span>
            <input ref={nameInput} value={name} placeholder="Acme Studio" aria-invalid={attempted && Boolean(errors.name)} onChange={(event) => setName(event.target.value)} />
            {show(errors.name)}
          </label>
          <div className="profile-field">
            <span>{t("profile.icon")}</span>
            <div className="profile-icon-setting">
              <i className="profile-icon-preview" style={profileIconStyle(tone, glyph)} aria-hidden="true">
                <ProfileGlyphMark name={name} glyph={glyph} image={image} size={24} />
              </i>
              <div>
                <div className="profile-glyphs" role="group" aria-label={t("profile.iconSymbol")}>
                  {glyphs.map(([value, label]) => (
                    <button key={value} type="button" title={t(label)} aria-label={t(label)} aria-pressed={glyph === value} className={glyph === value ? "selected" : ""} onClick={() => setGlyph(value)}>
                      {value === "initials" ? "Aa" : <Icon name={value} size={16} />}
                    </button>
                  ))}
                  {image ? (
                    <button type="button" title={imageName} aria-pressed={glyph === "image"} className={`profile-glyph-image ${glyph === "image" ? "selected" : ""}`} onClick={() => setGlyph("image")}>
                      <img src={image} alt="" />
                    </button>
                  ) : (
                    <label className="profile-glyph-upload" title={t("profile.image.upload")}>
                      <input
                        type="file"
                        aria-label={t("profile.image.upload")}
                        accept={imageTypes.join(",")}
                        onChange={(event) => {
                          void chooseImage(event.target.files?.[0])
                          event.target.value = ""
                        }}
                      />
                      <Icon name="upload" size={16} />
                    </label>
                  )}
                </div>
                {glyph !== "image" && (
                  <div className="profile-tones" role="group" aria-label={t("profile.iconColor")}>
                    {(Object.keys(profileTones) as ProfileTone[]).map((value) => (
                      <button key={value} type="button" title={value} aria-label={value} aria-pressed={tone === value} className={tone === value ? "selected" : ""} style={profileTones[value]} onClick={() => setTone(value)}>
                        {tone === value && <Icon name="check" size={13} />}
                      </button>
                    ))}
                  </div>
                )}
                {image ? (
                  <div className="profile-image-file">
                    <span title={imageName}>{imageName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setImage("")
                        setImageName("")
                        if (glyph === "image") setGlyph("initials")
                      }}
                    >
                      {t("action.remove")}
                    </button>
                  </div>
                ) : (
                  <small className="profile-image-hint">{t("profile.image.hint")}</small>
                )}
                {imageError && (
                  <small className="profile-field-error" role="alert">
                    {imageError}
                  </small>
                )}
              </div>
            </div>
          </div>
          <div className="profile-field">
            <span id="profile-key-type">{t("profile.keyType")}</span>
            <div className="platform-switch" role="group" aria-labelledby="profile-key-type">
              {(["team", "individual"] as const).map((item) => (
                <button key={item} type="button" className={keyType === item ? "active" : ""} aria-pressed={keyType === item} onClick={() => setKeyType(item)}>
                  {t(item === "team" ? "profile.keyType.team" : "profile.keyType.individual")}
                </button>
              ))}
            </div>
          </div>
          {keyType === "team" && (
            <label>
              <span>{t("profile.issuerId")}</span>
              <input className="profile-mono" value={issuerId} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" spellCheck={false} autoComplete="off" aria-invalid={attempted && Boolean(errors.issuerId)} onChange={(event) => setIssuerId(event.target.value)} />
              {show(errors.issuerId)}
            </label>
          )}
          <label>
            <span>{t("profile.keyId")}</span>
            <input className="profile-mono" value={keyId} placeholder={t("profile.keyIdPlaceholder")} maxLength={10} spellCheck={false} autoComplete="off" aria-invalid={attempted && Boolean(errors.keyId)} onChange={(event) => setKeyId(event.target.value.trim().toUpperCase())} />
            {show(errors.keyId)}
          </label>
          <div className="profile-field">
            <span>{t("profile.privateKey")}</span>
            {keyFile ? (
              <div className="profile-file">
                <Icon name="key" size={16} />
                <strong>{keyFile}</strong>
                <button
                  type="button"
                  onClick={() => {
                    setKeyFile("")
                    setKey(null)
                  }}
                >
                  {t("action.remove")}
                </button>
              </div>
            ) : (
              <label
                className={`profile-drop ${dragging ? "dragging" : ""}`}
                onDragOver={(event) => {
                  event.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault()
                  setDragging(false)
                  void chooseFile(event.dataTransfer.files[0])
                }}
              >
                <input
                  type="file"
                  accept=".p8"
                  disabled={!secure}
                  onChange={(event) => {
                    void chooseFile(event.target.files?.[0])
                    event.target.value = ""
                  }}
                />
                <Icon name="upload" size={17} />
                <strong>{t("profile.key.choose")}</strong>
                <small>{t("profile.key.drop")}</small>
              </label>
            )}
            {fileError && !attempted ? <small className="profile-field-error">{fileError}</small> : show(errors.keyFile)}
            <small className="profile-image-hint">{t("profile.key.stays")}</small>
          </div>
        </div>
        <div className="iap-modal-footer">
          <span className={submitError ? "profile-field-error" : ""} role={submitError ? "alert" : undefined}>
            {submitError || t("profile.footer")}
          </span>
          <div>
            {closable && (
              <button type="button" className="quiet-button" onClick={onClose}>
                {t("action.cancel")}
              </button>
            )}
            <button type="submit" className="accent-button" disabled={checking || !secure}>
              {checking ? t("profile.checking") : t("profile.add")}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
