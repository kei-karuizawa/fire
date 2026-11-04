import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react"
import {
  aggregate,
  analyticsEvents,
  benchmarkMetrics,
  breakdown,
  bucketsFor,
  dataEnd,
  dataLength,
  dateAt,
  dimensions,
  dimensionValues,
  firstSelectable,
  indexOfDate,
  metric,
  metricGroups,
  peerGroupFactor,
  peerGroups,
  perfMetrics,
  perfVersions,
  reportCatalog,
  seriesFor,
  subscriptionEventTree,
  visibleMetrics,
  type Bucket,
  type DimensionDef,
  type DimensionKey,
  type Granularity,
  type PerfDevice,
  type Platform,
  type Scope,
  type Unit,
} from "./analyticsData"

type IconName = "apps" | "bell" | "calendar" | "chart" | "check" | "chevron" | "cloud" | "dashboard" | "database" | "download" | "globe" | "key" | "metadata" | "more" | "plus" | "search" | "settings" | "store" | "tag" | "team" | "upload"

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    apps: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M3 10h18" />
        <path d="M8 3v4" />
        <path d="M16 3v4" />
      </>
    ),
    chart: (
      <>
        <path d="M4 19V10" />
        <path d="M10 19V5" />
        <path d="M16 19v-7" />
        <path d="M22 19H2" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    cloud: (
      <path d="M17.5 19H6a4 4 0 0 1-.5-7.97A6.5 6.5 0 0 1 18 9.5a4.75 4.75 0 0 1-.5 9.5Z" />
    ),
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="9" rx="2" />
        <rect x="14" y="3" width="7" height="5" rx="2" />
        <rect x="14" y="12" width="7" height="9" rx="2" />
        <rect x="3" y="16" width="7" height="5" rx="2" />
      </>
    ),
    database: (
      <>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
        <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18Z" />
      </>
    ),
    key: (
      <>
        <circle cx="8" cy="15" r="4" />
        <path d="m11 12 8-8" />
        <path d="m17 6 2 2" />
      </>
    ),
    metadata: (
      <>
        <path d="M4 5h16" />
        <path d="M4 12h10" />
        <path d="M4 19h7" />
        <circle cx="18" cy="12" r="2" />
        <circle cx="15" cy="19" r="2" />
      </>
    ),
    more: (
      <>
        <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1 1.55V21h-4v-.08a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3v-4h.08a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3h4v.08a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.55 1H21v4h-.08a1.7 1.7 0 0 0-1.52 1Z" />
      </>
    ),
    tag: (
      <>
        <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 12V3h9l8.6 7.6a2 2 0 0 1 0 2.8Z" />
        <circle cx="7.5" cy="7.5" r="1.5" />
      </>
    ),
    store: (
      <>
        <path d="M4 10v10h16V10" />
        <path d="M3 4h18l-2 6a3 3 0 0 1-4 0 3 3 0 0 1-6 0 3 3 0 0 1-4 0Z" />
        <path d="M9 20v-6h6v6" />
      </>
    ),
    team: (
      <>
        <circle cx="9" cy="8" r="3" />
        <circle cx="17" cy="9" r="2" />
        <path d="M3 20a6 6 0 0 1 12 0" />
        <path d="M15 15a5 5 0 0 1 6 5" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4" />
        <path d="m7 9 5-5 5 5" />
        <path d="M5 20h14" />
      </>
    ),
  }
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

const navigation = [
  ["Dashboard", "dashboard"],
  ["Metadata", "metadata"],
  ["App Review", "check"],
  ["Builds", "cloud"],
  ["In-App Purchases", "tag"],
  ["Analytics", "chart"],
  ["Users & Access", "team"],
] as const

const languages = [
  ["English", "United States", "100%"],
  ["Simplified Chinese", "Mainland China", "100%"],
  ["Japanese", "Japan", "82%"],
  ["Traditional Chinese", "Taiwan", "100%"],
]

function MetadataPage({ notify }: { notify: (message: string) => void }) {
  const [name, setName] = useState("Fire")
  const [subtitle, setSubtitle] = useState("Focused, efficient task management")
  const [releaseMode, setReleaseMode] = useState("manual")
  const [collectsData, setCollectsData] = useState("yes")
  const [description, setDescription] = useState(
    "Fire helps you plan what matters, stay focused, and track every goal with ease. Simple, fast, and thoughtfully designed for Apple platforms.",
  )

  return (
    <div className="page">
      <section className="content-grid">
        <div className="metadata-section-heading release-section-heading">
          <span>
            <Icon name="upload" size={15} />
          </span>
          <div>
            <h2>Release & Rating</h2>
          </div>
        </div>
        <div className="metadata-section-heading compliance-section-heading">
          <span>
            <Icon name="key" size={15} />
          </span>
          <div>
            <h2>Compliance & Contact</h2>
          </div>
        </div>
        <article className="card form-card">
          <div className="card-heading">
            <div>
              <span className="card-icon warm">
                <Icon name="metadata" />
              </span>
              <h2>App Information</h2>
              <p>Core information shown on your App Store product page</p>
            </div>
            <button>
              <Icon name="more" />
            </button>
          </div>
          <div className="form-fields">
            <label>
              <span>
                Name <small>Up to 30 characters</small>
              </span>
              <div>
                <input
                  value={name}
                  maxLength={30}
                  onChange={(event) => setName(event.target.value)}
                />
                <small>{name.length}/30</small>
              </div>
            </label>
            <label>
              <span>
                Subtitle <small>Up to 30 characters</small>
              </span>
              <div>
                <input
                  value={subtitle}
                  maxLength={30}
                  onChange={(event) => setSubtitle(event.target.value)}
                />
                <small>{subtitle.length}/30</small>
              </div>
            </label>
            <label className="description-field">
              <span>
                Description <small>Up to 4,000 characters</small>
              </span>
              <div>
                <textarea
                  value={description}
                  maxLength={4000}
                  onChange={(event) => setDescription(event.target.value)}
                />
                <small>{description.length}/4,000</small>
              </div>
            </label>
          </div>
        </article>

        <article className="card promo-card">
          <div className="card-heading">
            <div>
              <span className="card-icon orange">
                <Icon name="upload" />
              </span>
              <h2>Promotional Text</h2>
              <p>Update anytime without submitting a new version</p>
            </div>
            <span className="live-tag">Publish anytime</span>
          </div>
          <textarea defaultValue="Make every day clearer with smart lists and a focus timer that help you get important things done." />
          <div className="promo-footer">
            <span>42 / 170</span>
            <button onClick={() => notify("Promotional text saved")}>
              Save Text
            </button>
          </div>
        </article>

        <article className="card keywords-card">
          <div className="card-heading">
            <div>
              <span className="card-icon pale">
                <Icon name="search" />
              </span>
              <h2>Keywords</h2>
              <p>Help customers discover Fire on the App Store</p>
            </div>
            <span className="keyword-count">68 / 100</span>
          </div>
          <textarea
            className="keyword-input"
            defaultValue="task manager, focus, to-do, productivity, schedule, checklist"
            maxLength={100}
          />
          <p className="field-hint">
            Separate keywords with commas. Do not include other app names.
          </p>
        </article>

        <article className="card screenshots-card">
          <div className="card-heading">
            <div>
              <span className="card-icon orange">
                <Icon name="upload" />
              </span>
              <h2>Screenshots & Previews</h2>
              <p>6.9-inch iPhone display</p>
            </div>
            <button
              className="add-button"
              onClick={() => notify("Screenshot uploader opened")}
            >
              <Icon name="plus" size={14} />
              Upload
            </button>
          </div>
          <div className="screenshot-list">
            {[
              "Own Your Day",
              "Focus on What Matters",
              "See Progress Clearly",
            ].map((title, index) => (
              <button
                key={title}
                className={`shot shot-${index + 1}`}
                onClick={() => notify(`Previewing: ${title}`)}
              >
                <span className="shot-camera" />
                <strong>{title}</strong>
                <i />
                <i />
                <i />
              </button>
            ))}
            <button
              className="shot-add"
              onClick={() => notify("Screenshot uploader opened")}
            >
              <Icon name="plus" size={20} />
              <span>Add Screenshot</span>
            </button>
          </div>
          <div className="screenshot-footer">
            <span>3 of 10 screenshots</span>
            <span>Drag to reorder</span>
          </div>
        </article>

        <article className="card feature-card">
          <div className="card-heading">
            <div>
              <span className="card-icon warm">
                <Icon name="store" />
              </span>
              <h2>Title & Search Hero Image</h2>
              <p>
                Configure the latest content shown in App Store search results
              </p>
            </div>
            <span className="new-badge">NEW</span>
          </div>
          <div className="feature-fields">
            <label>
              <span>
                Display Title <small>Up to 30 characters</small>
              </span>
              <input defaultValue="Bring Order to Every Day" maxLength={30} />
            </label>
            <label>
              <span>Search Hero Image</span>
              <button
                className="image-upload"
                onClick={() => notify("Hero image uploader opened")}
              >
                <Icon name="upload" size={17} />
                <strong>Upload Search Hero Image</strong>
                <small>Use Apple’s required dimensions and file format</small>
              </button>
            </label>
          </div>
        </article>

        <article className="card whats-new-card">
          <div className="card-heading">
            <div>
              <span className="card-icon orange">
                <Icon name="cloud" />
              </span>
              <h2>What’s New</h2>
              <p>Tell customers what changed in this version</p>
            </div>
            <span className="keyword-count">72 / 4,000</span>
          </div>
          <textarea
            defaultValue={
              "• Added smart task breakdowns\n• Improved the focus timer experience\n• Fixed known issues and improved stability"
            }
          />
        </article>

        <article className="card urls-card">
          <div className="card-heading">
            <div>
              <span className="card-icon pale">
                <Icon name="cloud" />
              </span>
              <h2>Websites & Support</h2>
              <p>Give customers access to product and technical support</p>
            </div>
          </div>
          <div className="stacked-fields">
            <label>
              <span>Support URL</span>
              <input type="url" defaultValue="https://fire.app/support" />
            </label>
            <label>
              <span>
                Marketing URL <small>Optional</small>
              </span>
              <input type="url" defaultValue="https://fire.app" />
            </label>
          </div>
        </article>

        <article className="card contact-card">
          <div className="card-heading">
            <div>
              <span className="card-icon sand">
                <Icon name="team" />
              </span>
              <h2>Contact Information</h2>
              <p>A contact Apple can reach</p>
            </div>
          </div>
          <div className="compact-field-grid">
            <label>
              <span>Last Name</span>
              <input defaultValue="Lin" />
            </label>
            <label>
              <span>First Name</span>
              <input defaultValue="Alex" />
            </label>
            <label>
              <span>Phone</span>
              <input defaultValue="+86 138 0000 0000" />
            </label>
            <label>
              <span>Email</span>
              <input type="email" defaultValue="alex@acme.studio" />
            </label>
          </div>
        </article>

        <article className="card category-card">
          <div className="card-heading">
            <div>
              <span className="card-icon warm">
                <Icon name="apps" />
              </span>
              <h2>Categories</h2>
              <p>Choose the App Store categories that best describe Fire</p>
            </div>
          </div>
          <div className="stacked-fields">
            <label>
              <span>Primary Category</span>
              <select defaultValue="Productivity">
                <option>Productivity</option>
                <option>Business</option>
                <option>Lifestyle</option>
              </select>
            </label>
            <label>
              <span>
                Secondary Category <small>Optional</small>
              </span>
              <select defaultValue="Lifestyle">
                <option>Lifestyle</option>
                <option>Business</option>
                <option>Utilities</option>
              </select>
            </label>
          </div>
        </article>

        <article className="card release-card">
          <div className="card-heading">
            <div>
              <span className="card-icon orange">
                <Icon name="upload" />
              </span>
              <h2>Version Release</h2>
              <p>Choose when to release the app after approval</p>
            </div>
          </div>
          <div className="release-options">
            {[
              [
                "manual",
                "Manually release this version",
                "Release this version yourself after approval",
              ],
              [
                "automatic",
                "Automatically release this version",
                "Release automatically after approval",
              ],
              [
                "scheduled",
                "Automatically release after App Review, no earlier than",
                "Set the earliest automatic release date",
              ],
            ].map(([value, title, detail]) => (
              <label
                key={value}
                className={releaseMode === value ? "selected" : ""}
              >
                <input
                  type="radio"
                  name="release"
                  checked={releaseMode === value}
                  onChange={() => setReleaseMode(value)}
                />
                <span>
                  <strong>{title}</strong>
                  <small>{detail}</small>
                </span>
                {value === "scheduled" && (
                  <input
                    className="release-date"
                    type="datetime-local"
                    disabled={releaseMode !== "scheduled"}
                    defaultValue="2025-07-01T09:00"
                  />
                )}
              </label>
            ))}
          </div>
        </article>

        <article className="card age-card">
          <div className="card-heading">
            <div>
              <span className="card-icon sand">
                <Icon name="team" />
              </span>
              <h2>Age Rating</h2>
              <p>Calculated from the content description questionnaire</p>
            </div>
            <span className="age-badge">4+</span>
          </div>
          <div className="setting-summary">
            <div>
              <strong>Current rating: 4+</strong>
              <span>No restricted content or sensitive features</span>
            </div>
            <button onClick={() => notify("Age rating questionnaire opened")}>
              Edit Questionnaire <Icon name="chevron" size={13} />
            </button>
          </div>
        </article>

        <article className="card icp-card">
          <div className="card-heading">
            <div>
              <span className="card-icon pale">
                <Icon name="database" />
              </span>
              <h2>ICP Filing</h2>
              <p>Required when offering services in China Mainland</p>
            </div>
            <span className="api-uncertain">API support unconfirmed</span>
          </div>
          <div className="stacked-fields">
            <label>
              <span>Filing Number</span>
              <input placeholder="Example: Jing ICP XXXXXXXX" />
            </label>
          </div>
          <p className="notice-text">
            If the App Store Connect API does not support this field, Fire will
            guide you to complete it on the web.
          </p>
        </article>

        <article className="card privacy-card">
          <div className="card-heading">
            <div>
              <span className="card-icon warm">
                <Icon name="key" />
              </span>
              <h2>Privacy & Data Collection</h2>
              <p>Configure privacy policy links and app data declarations</p>
            </div>
          </div>
          <div className="privacy-grid">
            <div className="stacked-fields">
              <label>
                <span>Privacy Policy URL</span>
                <input type="url" defaultValue="https://fire.app/privacy" />
              </label>
              <label>
                <span>
                  User Privacy Choices URL <small>Optional</small>
                </span>
                <input
                  type="url"
                  defaultValue="https://fire.app/privacy/choices"
                />
              </label>
            </div>
            <div className="data-collection">
              <strong>
                Do you or your third-party partners collect data from this app?
              </strong>
              <div>
                <button
                  className={collectsData === "yes" ? "selected" : ""}
                  onClick={() => setCollectsData("yes")}
                >
                  <span>
                    {collectsData === "yes" && <Icon name="check" size={12} />}
                  </span>
                  Yes, data is collected
                </button>
                <button
                  className={collectsData === "no" ? "selected" : ""}
                  onClick={() => setCollectsData("no")}
                >
                  <span>
                    {collectsData === "no" && <Icon name="check" size={12} />}
                  </span>
                  No, data is not collected
                </button>
              </div>
              <button
                className="data-details"
                onClick={() => notify("Data type configuration opened")}
              >
                Configure Collected Data <Icon name="chevron" size={13} />
              </button>
            </div>
          </div>
        </article>

        <article className="card metadata-review-notes">
          <div className="card-heading">
            <div>
              <span className="card-icon orange">
                <Icon name="metadata" />
              </span>
              <h2>Review Notes</h2>
              <p>
                Explain test steps, special configurations, or important notes
                to App Review
              </p>
            </div>
            <span className="keyword-count">108 / 4,000</span>
          </div>
          <textarea
            defaultValue={
              "Please sign in with the review account. Open Today to try smart task breakdowns and the focus timer. To test notifications, allow notification access in Settings first."
            }
            maxLength={4000}
          />
        </article>
      </section>
    </div>
  )
}

function ReviewPage({ notify }: { notify: (message: string) => void }) {
  const submissions = [
    {
      id: "3.2.0",
      build: "184",
      date: "Jun 18, 2025",
      status: "Rejected",
      duration: "1 day 6 hours",
      reason: "",
      issues: [
        {
          round: 1,
          roundStatus: "Resolved",
          roundDate: "Jun 19, 2025",
          guideline: "2.1 - App Completeness",
          title: "Unable to Sign In to the Demo Account",
          date: "Jun 19, 2025 at 10:24",
          description:
            "We were unable to sign in with the demo account provided. A network error persisted after sign-in, preventing us from reviewing the app’s primary functionality.",
          replies: [
            [
              "Developer Response · Jun 19 at 11:08",
              "We reset the demo account and confirmed that sign-in works. Please use the original username and the updated password: FireReview2025.",
            ],
            [
              "Apple Response · Jun 20 at 09:42",
              "Thank you for your response. Please resubmit this version after resolving the issue and we will continue our review.",
            ],
          ],
        },
        {
          round: 2,
          roundStatus: "Responded",
          roundDate: "Jun 20, 2025",
          guideline: "5.1.1 - Data Collection and Storage",
          title: "Privacy Disclosure Does Not Match App Behavior",
          date: "Jun 19, 2025 at 10:26",
          description:
            "The app collects diagnostics, but the App Privacy response does not include Crash Data and Performance Data. Update the privacy details to accurately reflect the app’s data practices.",
          replies: [
            [
              "Developer Response · Jun 19 at 12:15",
              "We updated App Privacy to include Crash Data and Performance Data and clarified that this data is not linked to the user.",
            ],
          ],
        },
        {
          round: 3,
          roundStatus: "Waiting for Developer Response",
          roundDate: "Jun 22, 2025",
          guideline: "4.0 - Design",
          title: "iPad Screenshots Do Not Show the App in Use",
          date: "Jun 19, 2025 at 10:31",
          description:
            "Some iPad screenshots contain excessive marketing material and do not clearly show the app experience. Upload screenshots that accurately reflect the interface and core features.",
          replies: [],
        },
        {
          round: 3,
          roundStatus: "Waiting for Developer Response",
          roundDate: "Jun 22, 2025",
          guideline: "2.3 - Accurate Metadata",
          title: "Subtitle Contains an Unverifiable Claim",
          date: "Jun 22, 2025 at 14:17",
          description:
            "The subtitle uses the claim “best task management tool,” which we cannot verify. Remove this claim or use copy that accurately describes the app’s functionality.",
          replies: [],
        },
      ],
    },
    {
      id: "3.1.4",
      build: "176",
      date: "May 26, 2025",
      status: "Approved",
      duration: "19 hours",
      reason: "",
      issues: [],
    },
    {
      id: "3.1.3",
      build: "171",
      date: "May 12, 2025",
      status: "Withdrawn by Developer",
      duration: "3 hours",
      reason: "The developer withdrew this submission before review began.",
      issues: [],
    },
    {
      id: "3.1.2",
      build: "168",
      date: "Apr 30, 2025",
      status: "Approved",
      duration: "22 hours",
      reason: "",
      issues: [],
    },
    {
      id: "3.1.0",
      build: "160",
      date: "Apr 8, 2025",
      status: "Rejected",
      duration: "2 days 4 hours",
      reason: "",
      issues: [
        {
          round: 1,
          roundStatus: "Responded",
          roundDate: "Apr 9, 2025",
          guideline: "5.1.1 - Data Collection and Storage",
          title: "Privacy Policy Information Is Incomplete",
          date: "Apr 9, 2025 at 16:14",
          description:
            "The privacy policy does not adequately explain how diagnostic data is collected and used. Clearly describe the data types, purpose, and retention period.",
          replies: [
            [
              "Developer Response · Apr 10 at 10:05",
              "The privacy policy has been updated. The relevant details appear in the Diagnostic Data section.",
            ],
          ],
        },
      ],
    },
  ]
  const [selectedId, setSelectedId] = useState("3.2.0")
  const [attachmentRound, setAttachmentRound] = useState<number | null>(null)
  const [previewAttachment, setPreviewAttachment] = useState("")
  const selected =
    submissions.find((item) => item.id === selectedId) ?? submissions[0]
  const selectedIssues = selected?.issues ?? []
  const roundNumbers = [
    ...new Set(selectedIssues.map((issue) => issue.round)),
  ].sort((a, b) => b - a)
  const attachmentsByRound: Record<number, {
    name: string
    type: string
    size: string
    date: string
  }[]> = {
    1: [
      {
        name: "Login_Error.png",
        type: "PNG",
        size: "1.2 MB",
        date: "Jun 19 at 10:24",
      },
    ],
    2: [
      {
        name: "Privacy_Details.pdf",
        type: "PDF",
        size: "684 KB",
        date: "Jun 20 at 09:18",
      },
    ],
    3: [
      {
        name: "iPad_Screenshot_Issue.png",
        type: "PNG",
        size: "1.8 MB",
        date: "Jun 22 at 14:16",
      },
      {
        name: "Metadata_Review.pdf",
        type: "PDF",
        size: "412 KB",
        date: "Jun 22 at 14:17",
      },
    ],
  }
  const activeAttachments =
    attachmentRound === null ? [] : (attachmentsByRound[attachmentRound] ?? [])
  const previewFile =
    activeAttachments.find((file) => file.name === previewAttachment) ??
    activeAttachments[0]

  return (
    <div className="review-workspace">
      <div className="review-heading">
        <div>
          <span className="card-icon warm">
            <Icon name="search" size={20} />
          </span>
          <div>
            <h1>App Review</h1>
          </div>
        </div>
        <button
          className="quiet-button"
          onClick={() => notify("Review history synced")}
        >
          Sync Review History
        </button>
      </div>
      <div className="review-split">
        <aside className="submission-pane">
          <div className="submission-pane-head">
            <span>Submission History</span>
            <strong>{submissions.length}</strong>
          </div>
          <div className="submission-list">
            {submissions.map((item) => (
              <button
                key={item.id}
                className={selectedId === item.id ? "selected" : ""}
                onClick={() => setSelectedId(item.id)}
              >
                <span
                  className={`submission-dot ${
                    item.status === "Approved"
                      ? "approved"
                      : item.status === "Withdrawn by Developer"
                        ? "withdrawn"
                        : "rejected"
                  }`}
                />
                <span className="submission-copy">
                  <strong>Version {item.id}</strong>
                  <small>
                    Build {item.build} · {item.date}
                  </small>
                </span>
                <span
                  className={`submission-status ${
                    item.status === "Approved"
                      ? "approved"
                      : item.status === "Withdrawn by Developer"
                        ? "withdrawn"
                        : "rejected"
                  }`}
                >
                  {item.status}
                </span>
                <Icon name="chevron" size={13} />
              </button>
            ))}
          </div>
        </aside>

        <section className="submission-detail">
          <div className="detail-head">
            <div>
              <h2>{selected.status}</h2>
            </div>
          </div>

          {selected.status === "Rejected" && (
            <div className="review-issues">
              <div className="issues-summary">
                <h3>Review History</h3>
              </div>
              {roundNumbers.map((roundNumber) => {
                const roundIssues = selectedIssues.filter(
                  (issue) => issue.round === roundNumber,
                )
                const round = roundIssues[0]
                return (
                  <section className="review-round" key={roundNumber}>
                    <div className="round-heading">
                      <div className="round-number">Round {roundNumber}</div>
                      <div>
                        <strong>{round.roundDate}</strong>
                        <span>
                          Version {selected.id} · Build {selected.build} ·
                          Submitted {selected.date} · Review duration{" "}
                          {selected.duration}
                        </span>
                      </div>
                    </div>
                    <div className="round-issues">
                      {roundIssues.map((issue, index) => (
                        <article
                          className="review-issue"
                          key={`${roundNumber}-${issue.guideline}`}
                        >
                          <div className="issue-titlebar">
                            <span>{index + 1}</span>
                            <div>
                              <h3>{issue.title}</h3>
                              <button
                                onClick={() =>
                                  notify("Review Guidelines opened")
                                }
                              >
                                {issue.guideline}
                                <Icon name="chevron" size={12} />
                              </button>
                            </div>
                            <small>{issue.date}</small>
                          </div>
                          <div className="apple-response">
                            <div className="apple-review-mark">A</div>
                            <div>
                              <strong>App Review</strong>
                              <p>{issue.description}</p>
                            </div>
                          </div>
                          {(issue.replies ?? []).length > 0 && (
                            <div className="issue-followups">
                              {(issue.replies ?? []).map(([meta, content]) => (
                                <div key={meta}>
                                  <strong>{meta}</strong>
                                  <p>{content}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                    <div className="round-actions">
                      <button
                        onClick={() => {
                          const files = attachmentsByRound[roundNumber] ?? []
                          setAttachmentRound(roundNumber)
                          setPreviewAttachment(files[0]?.name ?? "")
                        }}
                      >
                        <Icon name="download" size={13} />
                        Review Attachments ({roundNumber === 3 ? "2" : "1"})
                      </button>
                      <button
                        onClick={() =>
                          notify(`Replying to review round ${roundNumber}`)
                        }
                      >
                        Reply to This Round
                      </button>
                    </div>
                  </section>
                )
              })}
            </div>
          )}
          {selected.status === "Approved" && (
            <div className="approval-card">
              <span>
                <Icon name="check" size={16} />
              </span>
              <div>
                <strong>This version passed App Review</strong>
                <p>There are no review issues for this version.</p>
              </div>
            </div>
          )}
          {selected.status === "Withdrawn by Developer" && (
            <div className="withdrawn-card">
              <span>
                <Icon name="download" size={16} />
              </span>
              <div>
                <strong>This submission was withdrawn by the developer</strong>
                <p>{selected.reason}</p>
              </div>
            </div>
          )}
        </section>
      </div>
      {attachmentRound !== null && (
        <div
          className="attachment-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setAttachmentRound(null)
            }
          }}
        >
          <div className="attachment-modal">
            <div className="attachment-modal-head">
              <div>
                <h2>Round {attachmentRound} Review Attachments</h2>
                <p>
                  Version {selected.id} · {activeAttachments.length} files
                </p>
              </div>
              <button
                className="modal-close"
                onClick={() => setAttachmentRound(null)}
                aria-label="Close attachment panel"
              >
                ×
              </button>
            </div>
            <div className="attachment-modal-body">
              <aside className="attachment-list">
                <div className="attachment-list-head">Attachments</div>
                {activeAttachments.map((file) => (
                  <button
                    key={file.name}
                    className={
                      previewFile?.name === file.name ? "selected" : ""
                    }
                    onClick={() => setPreviewAttachment(file.name)}
                  >
                    <span className={`file-icon ${file.type.toLowerCase()}`}>
                      {file.type}
                    </span>
                    <span>
                      <strong>{file.name}</strong>
                      <small>
                        {file.size} · {file.date}
                      </small>
                    </span>
                    <Icon name="chevron" size={13} />
                  </button>
                ))}
              </aside>
              <section className="attachment-preview">
                <div className="preview-toolbar">
                  <div>
                    <strong>{previewFile?.name}</strong>
                    <span>
                      {previewFile?.type} · {previewFile?.size}
                    </span>
                  </div>
                  <button
                    onClick={() => notify(`${previewFile?.name} downloaded`)}
                  >
                    <Icon name="download" size={13} />
                    Download
                  </button>
                </div>
                <div className="preview-canvas">
                  {previewFile?.type === "PNG" ? (
                    <div className="image-preview-document">
                      <div className="preview-app-bar">
                        <i />
                        <span>Fire</span>
                      </div>
                      <div className="preview-error-box">
                        <span>!</span>
                        <strong>Unable to Continue</strong>
                        <p>
                          The requested content could not be loaded. Please try
                          again.
                        </p>
                        <button>Try Again</button>
                      </div>
                      <div className="annotation-mark">1</div>
                    </div>
                  ) : (
                    <div className="pdf-preview-document">
                      <span>APP REVIEW</span>
                      <h3>Review Attachment</h3>
                      <p>
                        Version {selected.id} · Build {selected.build}
                      </p>
                      <hr />
                      <strong>Review Notes</strong>
                      <i />
                      <i />
                      <i className="short" />
                      <strong>Required Changes</strong>
                      <i />
                      <i />
                      <i className="short" />
                      <small>1</small>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

type BuildState =
  | "processing"
  | "review"
  | "testing"
  | "rejected"
  | "live"
  | "expired"

type Build = {
  platform: "iOS" | "macOS"
  version: string
  number: string
  uploaded: string
  source: string
  state: BuildState
  label: string
  size: string
  minOS: string
  sdk: string
  expiry: string
  daysLeft: number
  installs: number
  sessions: number
  crashes: number
  steps: string[]
  whatToTest: string
  groups: {
    name: string
    kind: "Internal" | "External"
    testers: number
    installs: number
    status: string
    link?: string
  }[]
  feedback: {
    name: string
    device: string
    date: string
    kind: "Screenshot" | "Crash"
    text: string
  }[]
}

const buildSteps = [
  "Uploaded",
  "Processed",
  "Internal Testing",
  "Beta App Review",
  "External Testing",
]

const buildFilters = ["All", "TestFlight", "App Store", "Expired"] as const

const builds: Build[] = [
  {
    platform: "iOS",
    version: "3.3.0",
    number: "192",
    uploaded: "Jun 24, 2025 at 09:12",
    source: "Xcode Cloud · main",
    state: "processing",
    label: "Processing",
    size: "—",
    minOS: "iOS 17.0",
    sdk: "iOS 18.5",
    expiry: "Starts after processing",
    daysLeft: 90,
    installs: 0,
    sessions: 0,
    crashes: 0,
    steps: ["Jun 24, 09:12", "", "", "", ""],
    whatToTest: "",
    groups: [],
    feedback: [],
  },
  {
    platform: "iOS",
    version: "3.3.0",
    number: "191",
    uploaded: "Jun 23, 2025 at 18:40",
    source: "Xcode Cloud · main",
    state: "review",
    label: "Waiting for Review",
    size: "48.2 MB",
    minOS: "iOS 17.0",
    sdk: "iOS 18.5",
    expiry: "Expires in 89 days",
    daysLeft: 89,
    installs: 11,
    sessions: 63,
    crashes: 0,
    steps: ["Jun 23, 18:40", "Jun 23, 19:05", "Jun 23, 19:06", "", ""],
    whatToTest:
      "New: Focus timer widgets on the Lock Screen. Start and pause a timer from the widget, then open the app and check that the timer stays in sync.",
    groups: [
      {
        name: "Acme Team",
        kind: "Internal",
        testers: 12,
        installs: 11,
        status: "Testing",
      },
      {
        name: "Public Beta",
        kind: "External",
        testers: 1272,
        installs: 0,
        status: "Waiting for Review",
        link: "testflight.apple.com/join/Fx3k9Qa2",
      },
    ],
    feedback: [
      {
        name: "Jordan Park",
        device: "iPhone 16 Pro · iOS 18.5",
        date: "Jun 24 at 08:02",
        kind: "Screenshot",
        text: "The Lock Screen widget shows 00:00 for a second before the timer appears.",
      },
    ],
  },
  {
    platform: "iOS",
    version: "3.2.0",
    number: "186",
    uploaded: "Jun 21, 2025 at 14:02",
    source: "Xcode 16.4",
    state: "testing",
    label: "Testing",
    size: "47.9 MB",
    minOS: "iOS 17.0",
    sdk: "iOS 18.5",
    expiry: "Expires in 87 days",
    daysLeft: 87,
    installs: 1222,
    sessions: 9860,
    crashes: 23,
    steps: [
      "Jun 21, 14:02",
      "Jun 21, 14:31",
      "Jun 21, 14:32",
      "Jun 22, 10:15",
      "Jun 22, 10:20",
    ],
    whatToTest:
      "Fixes the sign-in network error and updates the iPad screenshots flow. Please sign in with your own account and try exporting a task list to PDF.",
    groups: [
      {
        name: "Acme Team",
        kind: "Internal",
        testers: 12,
        installs: 12,
        status: "Testing",
      },
      {
        name: "Public Beta",
        kind: "External",
        testers: 1272,
        installs: 1169,
        status: "Testing",
        link: "testflight.apple.com/join/Fx3k9Qa2",
      },
      {
        name: "Design Partners",
        kind: "External",
        testers: 48,
        installs: 41,
        status: "Testing",
      },
    ],
    feedback: [
      {
        name: "Mia Chen",
        device: "iPhone 15 Pro · iOS 18.5",
        date: "Jun 23 at 21:14",
        kind: "Crash",
        text: "App closed when I exported a list with more than 200 tasks to PDF.",
      },
      {
        name: "Leo Martins",
        device: "iPad Air · iPadOS 18.4",
        date: "Jun 23 at 16:40",
        kind: "Screenshot",
        text: "In Split View the sidebar covers the first column of the board.",
      },
      {
        name: "Priya Shah",
        device: "iPhone 13 · iOS 17.6",
        date: "Jun 22 at 11:05",
        kind: "Screenshot",
        text: "Sign-in works now. The keyboard hides the password field on smaller screens.",
      },
    ],
  },
  {
    platform: "iOS",
    version: "3.2.0",
    number: "185",
    uploaded: "Jun 17, 2025 at 10:48",
    source: "Xcode 16.4",
    state: "expired",
    label: "Expired",
    size: "47.8 MB",
    minOS: "iOS 17.0",
    sdk: "iOS 18.5",
    expiry: "Expired manually on Jun 21",
    daysLeft: 0,
    installs: 810,
    sessions: 4120,
    crashes: 41,
    steps: [
      "Jun 17, 10:48",
      "Jun 17, 11:20",
      "Jun 17, 11:21",
      "Jun 18, 09:02",
      "Jun 18, 09:10",
    ],
    whatToTest: "First build of 3.2.0 with the redesigned board view.",
    groups: [
      {
        name: "Acme Team",
        kind: "Internal",
        testers: 12,
        installs: 12,
        status: "Expired",
      },
      {
        name: "Public Beta",
        kind: "External",
        testers: 1180,
        installs: 798,
        status: "Expired",
      },
    ],
    feedback: [],
  },
  {
    platform: "iOS",
    version: "3.2.0",
    number: "184",
    uploaded: "Jun 16, 2025 at 17:30",
    source: "Xcode 16.4",
    state: "rejected",
    label: "Rejected in Review",
    size: "47.8 MB",
    minOS: "iOS 17.0",
    sdk: "iOS 18.5",
    expiry: "Expires in 82 days",
    daysLeft: 82,
    installs: 12,
    sessions: 140,
    crashes: 1,
    steps: ["Jun 16, 17:30", "Jun 16, 18:02", "Jun 16, 18:03", "", ""],
    whatToTest: "Release candidate for App Store submission.",
    groups: [
      {
        name: "Acme Team",
        kind: "Internal",
        testers: 12,
        installs: 12,
        status: "Testing",
      },
    ],
    feedback: [],
  },
  {
    platform: "iOS",
    version: "3.1.4",
    number: "176",
    uploaded: "May 22, 2025 at 15:16",
    source: "Xcode 16.3",
    state: "live",
    label: "Ready for Distribution",
    size: "46.1 MB",
    minOS: "iOS 17.0",
    sdk: "iOS 18.4",
    expiry: "Expires in 57 days",
    daysLeft: 57,
    installs: 1094,
    sessions: 15320,
    crashes: 12,
    steps: [
      "May 22, 15:16",
      "May 22, 15:40",
      "May 22, 15:41",
      "May 23, 08:44",
      "May 23, 08:50",
    ],
    whatToTest: "Bug fixes for reminders and iCloud sync.",
    groups: [
      {
        name: "Acme Team",
        kind: "Internal",
        testers: 12,
        installs: 12,
        status: "Testing",
      },
      {
        name: "Public Beta",
        kind: "External",
        testers: 1104,
        installs: 1082,
        status: "Testing",
      },
    ],
    feedback: [],
  },
  {
    platform: "iOS",
    version: "3.1.3",
    number: "171",
    uploaded: "May 9, 2025 at 11:02",
    source: "Xcode 16.3",
    state: "expired",
    label: "Expired",
    size: "45.9 MB",
    minOS: "iOS 17.0",
    sdk: "iOS 18.4",
    expiry: "Expired on May 26",
    daysLeft: 0,
    installs: 640,
    sessions: 5210,
    crashes: 9,
    steps: [
      "May 9, 11:02",
      "May 9, 11:30",
      "May 9, 11:31",
      "May 10, 09:12",
      "May 10, 09:20",
    ],
    whatToTest: "Calendar integration preview.",
    groups: [
      {
        name: "Public Beta",
        kind: "External",
        testers: 1040,
        installs: 628,
        status: "Expired",
      },
    ],
    feedback: [],
  },
  {
    platform: "macOS",
    version: "3.2.0",
    number: "88",
    uploaded: "Jun 21, 2025 at 15:10",
    source: "Xcode 16.4",
    state: "testing",
    label: "Testing",
    size: "31.4 MB",
    minOS: "macOS 14.0",
    sdk: "macOS 15.5",
    expiry: "Expires in 87 days",
    daysLeft: 87,
    installs: 9,
    sessions: 74,
    crashes: 0,
    steps: ["Jun 21, 15:10", "Jun 21, 15:38", "Jun 21, 15:39", "", ""],
    whatToTest: "Menu bar timer and keyboard shortcuts for quick add.",
    groups: [
      {
        name: "Acme Team",
        kind: "Internal",
        testers: 12,
        installs: 9,
        status: "Testing",
      },
    ],
    feedback: [],
  },
  {
    platform: "macOS",
    version: "3.1.4",
    number: "82",
    uploaded: "May 22, 2025 at 16:02",
    source: "Xcode 16.3",
    state: "live",
    label: "Ready for Distribution",
    size: "30.8 MB",
    minOS: "macOS 14.0",
    sdk: "macOS 15.4",
    expiry: "Expires in 57 days",
    daysLeft: 57,
    installs: 29,
    sessions: 412,
    crashes: 0,
    steps: ["May 22, 16:02", "May 22, 16:30", "May 22, 16:31", "", ""],
    whatToTest: "Bug fixes for reminders and iCloud sync.",
    groups: [
      {
        name: "Acme Team",
        kind: "Internal",
        testers: 12,
        installs: 12,
        status: "Testing",
      },
    ],
    feedback: [],
  },
]

const buildSummary = {
  iOS: [
    ["Latest Build", "3.3.0 (192)", "Processing"],
    ["Active Testers", "1,332", "12 internal · 1,320 external"],
    ["Installs", "3,214", "Last 30 days"],
    ["Crash-free Sessions", "99.6%", "Last 30 days"],
  ],
  macOS: [
    ["Latest Build", "3.2.0 (88)", "Testing"],
    ["Active Testers", "12", "12 internal · 0 external"],
    ["Installs", "38", "Last 30 days"],
    ["Crash-free Sessions", "100%", "Last 30 days"],
  ],
}

function BuildsPage({ notify }: { notify: (message: string) => void }) {
  const [platform, setPlatform] = useState<Build["platform"]>("iOS")
  const [filter, setFilter] =
    useState<(typeof buildFilters)[number]>("All")
  const [selectedId, setSelectedId] = useState("186")
  const [notes, setNotes] = useState<Record<string, string>>({})
  const visible = builds.filter(
    (item) =>
      item.platform === platform &&
      (filter === "All" ||
        (filter === "TestFlight" &&
          ["processing", "review", "testing"].includes(item.state)) ||
        (filter === "App Store" &&
          ["rejected", "live"].includes(item.state)) ||
        (filter === "Expired" && item.state === "expired")),
  )
  const versions = [...new Set(visible.map((item) => item.version))]
  const selected =
    visible.find((item) => item.number === selectedId) ?? visible[0]
  const active =
    selected && ["processing", "review", "testing"].includes(selected.state)
  const currentStep = selected
    ? selected.steps.findIndex((step) => !step)
    : -1
  const note = selected ? (notes[selected.number] ?? selected.whatToTest) : ""
  const invited = selected
    ? selected.groups.reduce((sum, group) => sum + group.testers, 0)
    : 0

  return (
    <div className="review-workspace builds-workspace">
      <div className="review-heading">
        <div>
          <span className="card-icon warm">
            <Icon name="cloud" size={20} />
          </span>
          <div>
            <h1>Builds</h1>
          </div>
        </div>
        <div className="builds-toolbar">
          <div className="platform-switch">
            {(["iOS", "macOS"] as const).map((item) => (
              <button
                key={item}
                className={platform === item ? "active" : ""}
                onClick={() => setPlatform(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <button
            className="quiet-button"
            onClick={() => notify("Builds synced with App Store Connect")}
          >
            <Icon name="cloud" size={14} />
            Sync Builds
          </button>
          <button
            className="accent-button"
            onClick={() => notify("Tester invitations sent")}
          >
            <Icon name="team" size={14} />
            Invite Testers
          </button>
        </div>
      </div>

      <div className="builds-summary">
        {buildSummary[platform].map(([label, value, detail]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{detail}</small>
          </div>
        ))}
      </div>

      <div className="review-split builds-split">
        <aside className="submission-pane">
          <div className="builds-filter">
            {buildFilters.map((item) => (
              <button
                key={item}
                className={filter === item ? "active" : ""}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="submission-list builds-list">
            {versions.map((version) => (
              <section key={version}>
                <h3>
                  Version {version}
                  <small>
                    {visible.filter((item) => item.version === version).length}{" "}
                    builds
                  </small>
                </h3>
                {visible
                  .filter((item) => item.version === version)
                  .map((item) => (
                    <button
                      key={item.number}
                      className={
                        selected?.number === item.number ? "selected" : ""
                      }
                      onClick={() => setSelectedId(item.number)}
                    >
                      <span className={`build-dot ${item.state}`} />
                      <span className="submission-copy">
                        <strong>Build {item.number}</strong>
                        <small>{item.uploaded.split(" at ")[0]}</small>
                      </span>
                      <span className={`build-state ${item.state}`}>
                        {item.label}
                      </span>
                      <Icon name="chevron" size={13} />
                    </button>
                  ))}
              </section>
            ))}
            {visible.length === 0 && (
              <p className="builds-empty">No builds match this filter.</p>
            )}
          </div>
        </aside>

        {selected ? (
          <section
            className="submission-detail build-detail"
            key={selected.number}
          >
            <div className="detail-head">
              <div>
                <span>
                  {selected.platform} · Version {selected.version}
                </span>
                <h2>
                  Build {selected.number}
                  <em className={`build-state ${selected.state}`}>
                    {selected.label}
                  </em>
                </h2>
                <p>
                  Uploaded {selected.uploaded} · {selected.source}
                </p>
              </div>
              <div className="build-actions">
                {selected.state !== "processing" && (
                  <button
                    className="quiet-button"
                    onClick={() => notify("dSYMs downloaded")}
                  >
                    <Icon name="download" size={14} />
                    dSYMs
                  </button>
                )}
                {(selected.state === "review" ||
                  selected.state === "testing") && (
                  <button
                    className="quiet-button"
                    onClick={() => notify(`Build ${selected.number} expired`)}
                  >
                    Expire Build
                  </button>
                )}
                {selected.state === "testing" && (
                  <button
                    className="accent-button"
                    onClick={() =>
                      notify(`Build ${selected.number} added to App Review`)
                    }
                  >
                    <Icon name="upload" size={14} />
                    Submit for Review
                  </button>
                )}
              </div>
            </div>

            <ol className="build-timeline">
              {buildSteps.map((step, index) => {
                const done = Boolean(selected.steps[index])
                const current = active && index === currentStep
                return (
                  <li
                    key={step}
                    className={done ? "done" : current ? "current" : ""}
                  >
                    <i>{done ? <Icon name="check" size={12} /> : index + 1}</i>
                    <strong>{step}</strong>
                    <small>
                      {selected.steps[index] ||
                        (current ? "In progress" : "Not started")}
                    </small>
                  </li>
                )
              })}
            </ol>

            <div className="build-metrics">
              <div>
                <span>Installs</span>
                <strong>{selected.installs.toLocaleString("en-US")}</strong>
                <small>{invited.toLocaleString("en-US")} testers invited</small>
              </div>
              <div>
                <span>Sessions</span>
                <strong>{selected.sessions.toLocaleString("en-US")}</strong>
                <small>Since upload</small>
              </div>
              <div>
                <span>Crashes</span>
                <strong>{selected.crashes.toLocaleString("en-US")}</strong>
                <small>
                  {selected.sessions
                    ? `${((selected.crashes / selected.sessions) * 100).toFixed(2)}% of sessions`
                    : "No sessions yet"}
                </small>
              </div>
              <div>
                <span>Feedback</span>
                <strong>{selected.feedback.length}</strong>
                <small>From testers</small>
              </div>
            </div>

            <div className="build-columns">
              <div className="card build-test-card">
                <div className="card-heading">
                  <div>
                    <span className="card-icon warm">
                      <Icon name="metadata" size={17} />
                    </span>
                    <h2>What to Test</h2>
                    <p>Shown to testers in the TestFlight app</p>
                  </div>
                </div>
                <textarea
                  value={note}
                  disabled={selected.state === "expired"}
                  placeholder={
                    selected.state === "processing"
                      ? "Available after processing finishes"
                      : "Tell testers what to focus on"
                  }
                  onChange={(event) =>
                    setNotes({
                      ...notes,
                      [selected.number]: event.target.value,
                    })
                  }
                />
                <div className="promo-footer">
                  <span>{note.length} / 4,000</span>
                  {selected.state !== "expired" &&
                    selected.state !== "processing" && (
                      <button onClick={() => notify("Test notes saved")}>
                        Save Notes
                      </button>
                    )}
                </div>
              </div>

              <div className="card build-info-card">
                <div className="card-heading">
                  <div>
                    <span className="card-icon pale">
                      <Icon name="settings" size={17} />
                    </span>
                    <h2>Build Details</h2>
                    <p>From the uploaded binary</p>
                  </div>
                </div>
                <dl>
                  <div>
                    <dt>Bundle ID</dt>
                    <dd>com.acme.fire</dd>
                  </div>
                  <div>
                    <dt>Minimum OS</dt>
                    <dd>{selected.minOS}</dd>
                  </div>
                  <div>
                    <dt>SDK</dt>
                    <dd>{selected.sdk}</dd>
                  </div>
                  <div>
                    <dt>Install Size</dt>
                    <dd>{selected.size}</dd>
                  </div>
                  <div>
                    <dt>Encryption</dt>
                    <dd>Exempt</dd>
                  </div>
                </dl>
                <div className="build-expiry">
                  <span>
                    TestFlight availability
                    <strong>{selected.expiry}</strong>
                  </span>
                  <i>
                    <b style={{ width: `${(selected.daysLeft / 90) * 100}%` }} />
                  </i>
                </div>
              </div>
            </div>

            <div className="card build-groups-card">
              <div className="card-heading">
                <div>
                  <span className="card-icon warm">
                    <Icon name="team" size={17} />
                  </span>
                  <h2>Tester Groups</h2>
                  <p>Groups that can install this build</p>
                </div>
                {selected.state !== "expired" &&
                  selected.state !== "processing" && (
                    <button
                      className="add-button"
                      onClick={() => notify("Group added to this build")}
                    >
                      <Icon name="plus" size={13} />
                      Add Group
                    </button>
                  )}
              </div>
              {selected.groups.length > 0 ? (
                <div className="group-table">
                  <div className="group-row group-row-head">
                    <span>Group</span>
                    <span>Testers</span>
                    <span>Installs</span>
                    <span>Status</span>
                  </div>
                  {selected.groups.map((group) => (
                    <div className="group-row" key={group.name}>
                      <span className="group-name">
                        <strong>{group.name}</strong>
                        <small>
                          {group.kind}
                          {group.link && (
                            <button
                              onClick={() => notify("Public link copied")}
                            >
                              {group.link}
                            </button>
                          )}
                        </small>
                      </span>
                      <span>{group.testers.toLocaleString("en-US")}</span>
                      <span>{group.installs.toLocaleString("en-US")}</span>
                      <span
                        className={`group-status ${group.status
                          .toLowerCase()
                          .replace(/ /g, "-")}`}
                      >
                        {group.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="builds-empty">
                  Groups can be added after processing finishes.
                </p>
              )}
            </div>

            <div className="card build-feedback-card">
              <div className="card-heading">
                <div>
                  <span className="card-icon sand">
                    <Icon name="bell" size={17} />
                  </span>
                  <h2>Tester Feedback</h2>
                  <p>Screenshots and crash reports sent from TestFlight</p>
                </div>
              </div>
              {selected.feedback.length > 0 ? (
                <div className="feedback-list">
                  {selected.feedback.map((item) => (
                    <article key={`${item.name}-${item.date}`}>
                      <span className="message-avatar">
                        {item.name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")}
                      </span>
                      <div>
                        <div>
                          <strong>{item.name}</strong>
                          <em className={item.kind === "Crash" ? "crash" : ""}>
                            {item.kind}
                          </em>
                          <small>{item.date}</small>
                        </div>
                        <p>{item.text}</p>
                        <small>{item.device}</small>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="builds-empty">No feedback for this build yet.</p>
              )}
            </div>
          </section>
        ) : (
          <section className="submission-detail build-detail">
            <p className="builds-empty">No build selected.</p>
          </section>
        )}
      </div>
    </div>
  )
}

type PurchaseState = "approved" | "review" | "missing" | "rejected" | "removed"

const purchaseStateShort: Record<PurchaseState, string> = {
  approved: "Approved",
  review: "In Review",
  missing: "Incomplete",
  rejected: "Action Needed",
  removed: "Removed",
}

type Purchase = {
  id: string
  appleId: string
  name: string
  type: "Auto-Renewable Subscription" | "Non-Consumable" | "Consumable"
  group?: string
  state: PurchaseState
  label: string
  price: number
  scheduledPrice?: string
  duration?: string
  level?: number
  introOffer?: string
  promoOffers?: number
  familySharing: boolean
  screenshot: boolean
  reviewNotes: string
  issue?: { guideline: string; title: string; text: string }
  localizations: Record<string, { name: string; description: string } | null>
}

const storeLocales = [
  ["EN", "English (U.S.)"],
  ["ZH", "Simplified Chinese"],
  ["JP", "Japanese"],
  ["ZH-TW", "Traditional Chinese"],
  ["EN-GB", "English (U.K.)"],
  ["FR", "French"],
  ["DE", "German"],
  ["ES", "Spanish (Spain)"],
  ["ES-MX", "Spanish (Mexico)"],
  ["PT-BR", "Portuguese (Brazil)"],
  ["IT", "Italian"],
  ["KO", "Korean"],
  ["NL", "Dutch"],
  ["TR", "Turkish"],
  ["TH", "Thai"],
  ["VI", "Vietnamese"],
  ["ID", "Indonesian"],
  ["AR", "Arabic"],
] as const

const localeTitle = (code: string) =>
  storeLocales.find(([item]) => item === code)?.[1] ?? code

const purchaseFilters = ["All", "Subscriptions", "One-Time", "Issues"] as const

const pricePoints = [
  0.29, 0.49, 0.99, 1.49, 1.99, 2.49, 2.99, 3.99, 4.99, 5.99, 6.99, 7.99,
  8.99, 9.99, 12.99, 14.99, 19.99, 24.99, 29.99, 39.99, 49.99, 59.99, 79.99,
  99.99, 149.99, 199.99, 299.99, 499.99, 999.99,
]

// Approximate exchange and VAT rates. "nine" prices end in .99, "whole" prices
// are whole units, and "round" prices are rounded to two significant digits.
const currencies: Record<
  string,
  { rate: number; vat: number; style: "exact" | "nine" | "whole" | "round" }
> = {
  USD: { rate: 1, vat: 0, style: "exact" },
  CAD: { rate: 1.38, vat: 0.05, style: "nine" },
  MXN: { rate: 18.5, vat: 0.16, style: "whole" },
  BRL: { rate: 5.6, vat: 0, style: "nine" },
  CLP: { rate: 950, vat: 0.19, style: "round" },
  COP: { rate: 4100, vat: 0.19, style: "round" },
  PEN: { rate: 3.75, vat: 0.18, style: "nine" },
  EUR: { rate: 0.93, vat: 0.2, style: "nine" },
  GBP: { rate: 0.79, vat: 0.2, style: "nine" },
  CHF: { rate: 0.88, vat: 0.081, style: "whole" },
  NOK: { rate: 10.8, vat: 0.25, style: "whole" },
  SEK: { rate: 10.6, vat: 0.25, style: "whole" },
  DKK: { rate: 6.9, vat: 0.25, style: "whole" },
  PLN: { rate: 4, vat: 0.23, style: "nine" },
  CZK: { rate: 23, vat: 0.21, style: "round" },
  HUF: { rate: 360, vat: 0.27, style: "round" },
  RON: { rate: 4.6, vat: 0.19, style: "nine" },
  BGN: { rate: 1.8, vat: 0.2, style: "nine" },
  TRY: { rate: 34, vat: 0.2, style: "round" },
  CNY: { rate: 6.2, vat: 0.06, style: "whole" },
  JPY: { rate: 160, vat: 0.1, style: "round" },
  KRW: { rate: 1400, vat: 0.1, style: "round" },
  TWD: { rate: 31, vat: 0.05, style: "round" },
  HKD: { rate: 7.8, vat: 0, style: "whole" },
  SGD: { rate: 1.35, vat: 0.09, style: "nine" },
  INR: { rate: 85, vat: 0.18, style: "round" },
  IDR: { rate: 16000, vat: 0.11, style: "round" },
  THB: { rate: 35, vat: 0.07, style: "round" },
  VND: { rate: 25000, vat: 0.1, style: "round" },
  PHP: { rate: 57, vat: 0.12, style: "round" },
  MYR: { rate: 4.5, vat: 0.08, style: "nine" },
  AUD: { rate: 1.55, vat: 0.1, style: "nine" },
  NZD: { rate: 1.7, vat: 0.15, style: "nine" },
  PKR: { rate: 280, vat: 0, style: "round" },
  KZT: { rate: 500, vat: 0.12, style: "round" },
  SAR: { rate: 3.75, vat: 0.15, style: "nine" },
  AED: { rate: 3.67, vat: 0.05, style: "nine" },
  ILS: { rate: 3.7, vat: 0.17, style: "nine" },
  EGP: { rate: 49, vat: 0.14, style: "round" },
  NGN: { rate: 1500, vat: 0.075, style: "round" },
  ZAR: { rate: 18.5, vat: 0.15, style: "nine" },
  TZS: { rate: 2600, vat: 0.18, style: "round" },
  QAR: { rate: 3.64, vat: 0, style: "nine" },
}

const territoryRegions = [
  "Americas",
  "Europe",
  "Asia Pacific",
  "Africa & Middle East",
] as const

type Territory = {
  name: string
  region: (typeof territoryRegions)[number]
  currency: string
}

const localTerritories: [string, Territory["region"], string][] = [
  ["United States", "Americas", "USD"],
  ["Canada", "Americas", "CAD"],
  ["Mexico", "Americas", "MXN"],
  ["Brazil", "Americas", "BRL"],
  ["Chile", "Americas", "CLP"],
  ["Colombia", "Americas", "COP"],
  ["Peru", "Americas", "PEN"],
  ...[
    "Austria", "Belgium", "Croatia", "Cyprus", "Estonia", "Finland", "France",
    "Germany", "Greece", "Ireland", "Italy", "Latvia", "Lithuania",
    "Luxembourg", "Malta", "Netherlands", "Portugal", "Slovakia", "Slovenia",
    "Spain",
  ].map((name): [string, Territory["region"], string] => [
    name,
    "Europe",
    "EUR",
  ]),
  ["United Kingdom", "Europe", "GBP"],
  ["Switzerland", "Europe", "CHF"],
  ["Norway", "Europe", "NOK"],
  ["Sweden", "Europe", "SEK"],
  ["Denmark", "Europe", "DKK"],
  ["Poland", "Europe", "PLN"],
  ["Czechia", "Europe", "CZK"],
  ["Hungary", "Europe", "HUF"],
  ["Romania", "Europe", "RON"],
  ["Bulgaria", "Europe", "BGN"],
  ["Türkiye", "Europe", "TRY"],
  ["China mainland", "Asia Pacific", "CNY"],
  ["Japan", "Asia Pacific", "JPY"],
  ["South Korea", "Asia Pacific", "KRW"],
  ["Taiwan", "Asia Pacific", "TWD"],
  ["Hong Kong", "Asia Pacific", "HKD"],
  ["Singapore", "Asia Pacific", "SGD"],
  ["India", "Asia Pacific", "INR"],
  ["Indonesia", "Asia Pacific", "IDR"],
  ["Thailand", "Asia Pacific", "THB"],
  ["Vietnam", "Asia Pacific", "VND"],
  ["Philippines", "Asia Pacific", "PHP"],
  ["Malaysia", "Asia Pacific", "MYR"],
  ["Australia", "Asia Pacific", "AUD"],
  ["New Zealand", "Asia Pacific", "NZD"],
  ["Pakistan", "Asia Pacific", "PKR"],
  ["Kazakhstan", "Asia Pacific", "KZT"],
  ["Saudi Arabia", "Africa & Middle East", "SAR"],
  ["United Arab Emirates", "Africa & Middle East", "AED"],
  ["Israel", "Africa & Middle East", "ILS"],
  ["Egypt", "Africa & Middle East", "EGP"],
  ["Nigeria", "Africa & Middle East", "NGN"],
  ["South Africa", "Africa & Middle East", "ZAR"],
  ["Tanzania", "Africa & Middle East", "TZS"],
  ["Qatar", "Africa & Middle East", "QAR"],
]

// Storefronts that sell in U.S. dollars
const usdTerritories: Record<Territory["region"], string[]> = {
  Americas: [
    "Anguilla", "Antigua and Barbuda", "Argentina", "Bahamas", "Barbados",
    "Belize", "Bermuda", "Bolivia", "British Virgin Islands", "Cayman Islands",
    "Costa Rica", "Dominica", "Dominican Republic", "Ecuador", "El Salvador",
    "Grenada", "Guatemala", "Guyana", "Honduras", "Jamaica", "Montserrat",
    "Nicaragua", "Panama", "Paraguay", "St. Kitts and Nevis", "St. Lucia",
    "St. Vincent and the Grenadines", "Suriname", "Trinidad and Tobago",
    "Turks and Caicos Islands", "Uruguay", "Venezuela",
  ],
  Europe: [
    "Albania", "Armenia", "Azerbaijan", "Belarus", "Bosnia and Herzegovina",
    "Georgia", "Iceland", "Kosovo", "Moldova", "Montenegro", "North Macedonia",
    "Serbia", "Ukraine",
  ],
  "Asia Pacific": [
    "Afghanistan", "Bangladesh", "Bhutan", "Brunei", "Cambodia", "Fiji",
    "Kyrgyzstan", "Laos", "Macao", "Maldives", "Micronesia", "Mongolia",
    "Myanmar", "Nauru", "Nepal", "Palau", "Papua New Guinea",
    "Solomon Islands", "Sri Lanka", "Tajikistan", "Tonga", "Turkmenistan",
    "Uzbekistan", "Vanuatu",
  ],
  "Africa & Middle East": [
    "Algeria", "Angola", "Bahrain", "Benin", "Botswana", "Burkina Faso",
    "Cameroon", "Cape Verde", "Chad", "Côte d’Ivoire",
    "Democratic Republic of the Congo", "Eswatini", "Gabon", "Gambia", "Ghana",
    "Guinea-Bissau", "Iraq", "Jordan", "Kenya", "Kuwait", "Lebanon", "Liberia",
    "Libya", "Madagascar", "Malawi", "Mali", "Mauritania", "Mauritius",
    "Morocco", "Mozambique", "Namibia", "Niger", "Oman",
    "Republic of the Congo", "Rwanda", "São Tomé and Príncipe", "Senegal",
    "Seychelles", "Sierra Leone", "Tunisia", "Uganda", "Yemen", "Zambia",
    "Zimbabwe",
  ],
}

const baseTerritory = "United States"

const territories: Territory[] = [
  ...localTerritories.map(([name, region, currency]) => ({
    name,
    region,
    currency,
  })),
  ...territoryRegions.flatMap((region) =>
    usdTerritories[region].map((name) => ({ name, region, currency: "USD" })),
  ),
].sort((a, b) =>
  a.name === baseTerritory
    ? -1
    : b.name === baseTerritory
      ? 1
      : a.name.localeCompare(b.name),
)

const featuredTerritories = [
  "United States",
  "China mainland",
  "Japan",
  "Taiwan",
  "United Kingdom",
  "Germany",
]

function equalizedPrice(base: number, currency: string) {
  const { rate, style } = currencies[currency]
  const value = base * rate
  if (style === "exact") return base
  if (style === "nine") return Math.max(Math.round(value), 1) - 0.01
  if (style === "whole") return Math.max(Math.round(value), 1)
  const step = 10 ** Math.max(Math.floor(Math.log10(value)) - 1, 0)
  return Math.max(Math.round(value / step) * step, step)
}

function money(value: number, currency: string) {
  const whole = currencies[currency].style === "round"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    ...(whole ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : {}),
  }).format(value)
}

// Proceeds at the 85% Small Business Program rate, after VAT
const proceedsOf = (price: number, currency: string) =>
  (price / (1 + currencies[currency].vat)) * 0.85

const usd = (value: number) => money(value, "USD")

const perPeriod = (duration?: string) =>
  duration ? ` / ${duration.replace("1 ", "").toLowerCase()}` : ""

const formatDate = (value: string) =>
  new Date(`${value}T00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

// Languages every product starts with
const purchaseLocales: string[] = ["EN", "ZH", "JP", "ZH-TW"]

const purchases: Purchase[] = [
  {
    id: "com.acme.fire.pro.yearly",
    appleId: "6502918841",
    name: "Fire Pro Yearly",
    type: "Auto-Renewable Subscription",
    group: "Fire Pro",
    state: "approved",
    label: "Approved",
    price: 39.99,
    duration: "1 Year",
    level: 1,
    introOffer: "1-week free trial · New subscribers",
    promoOffers: 1,
    familySharing: true,
    screenshot: true,
    reviewNotes:
      "Open Settings › Fire Pro and choose Yearly. Use the sandbox account in the App Review notes.",
    localizations: {
      EN: {
        name: "Fire Pro Yearly",
        description: "Unlock every Pro feature for a year",
      },
      ZH: { name: "Fire Pro 年度会员", description: "一年内解锁全部 Pro 功能" },
      JP: {
        name: "Fire Pro 年間プラン",
        description: "1年間すべてのPro機能を利用できます",
      },
      "ZH-TW": {
        name: "Fire Pro 年度會員",
        description: "一年內解鎖全部 Pro 功能",
      },
    },
  },
  {
    id: "com.acme.fire.pro.monthly",
    appleId: "6502918842",
    name: "Fire Pro Monthly",
    type: "Auto-Renewable Subscription",
    group: "Fire Pro",
    state: "approved",
    label: "Approved",
    price: 4.99,
    scheduledPrice:
      "Changes to $5.99 on Jul 15, 2025 · Existing subscribers keep $4.99",
    duration: "1 Month",
    level: 1,
    introOffer: "First month for $0.99 · New subscribers",
    promoOffers: 2,
    familySharing: true,
    screenshot: true,
    reviewNotes:
      "Open Settings › Fire Pro and choose Monthly. Use the sandbox account in the App Review notes.",
    localizations: {
      EN: {
        name: "Fire Pro Monthly",
        description: "Unlock every Pro feature, billed monthly",
      },
      ZH: {
        name: "Fire Pro 月度会员",
        description: "按月订阅，解锁全部 Pro 功能",
      },
      JP: {
        name: "Fire Pro 月間プラン",
        description: "毎月の請求ですべてのPro機能を利用",
      },
      "ZH-TW": {
        name: "Fire Pro 月度會員",
        description: "按月訂閱，解鎖全部 Pro 功能",
      },
    },
  },
  {
    id: "com.acme.fire.pro.weekly",
    appleId: "6502918849",
    name: "Fire Pro Weekly",
    type: "Auto-Renewable Subscription",
    group: "Fire Pro",
    state: "review",
    label: "Waiting for Review",
    price: 1.99,
    duration: "1 Week",
    level: 1,
    promoOffers: 0,
    familySharing: false,
    screenshot: true,
    reviewNotes:
      "New weekly plan. Shown on the paywall below the Monthly option.",
    localizations: {
      EN: {
        name: "Fire Pro Weekly",
        description: "Try every Pro feature, billed weekly",
      },
      ZH: {
        name: "Fire Pro 周会员",
        description: "按周订阅，体验全部 Pro 功能",
      },
      JP: {
        name: "Fire Pro 週間プラン",
        description: "毎週の請求ですべてのPro機能を利用",
      },
      "ZH-TW": {
        name: "Fire Pro 週會員",
        description: "按週訂閱，體驗全部 Pro 功能",
      },
    },
  },
  {
    id: "com.acme.fire.team.yearly",
    appleId: "6502918851",
    name: "Fire Team Yearly",
    type: "Auto-Renewable Subscription",
    group: "Fire Team",
    state: "approved",
    label: "Approved",
    price: 99.99,
    duration: "1 Year",
    level: 1,
    introOffer: "2-week free trial · New subscribers",
    promoOffers: 0,
    familySharing: false,
    screenshot: true,
    reviewNotes:
      "Open Settings › Team and choose Yearly. Team plans add shared lists for up to 10 members.",
    localizations: {
      EN: {
        name: "Fire Team Yearly",
        description: "Shared lists for up to 10 members",
      },
      ZH: { name: "Fire 团队年度版", description: "最多 10 人共享清单" },
      JP: { name: "Fire チーム年間", description: "最大10人でリストを共有" },
      "ZH-TW": { name: "Fire 團隊年度版", description: "最多 10 人共享清單" },
    },
  },
  {
    id: "com.acme.fire.team.monthly",
    appleId: "6502918852",
    name: "Fire Team Monthly",
    type: "Auto-Renewable Subscription",
    group: "Fire Team",
    state: "approved",
    label: "Approved",
    price: 9.99,
    duration: "1 Month",
    level: 1,
    promoOffers: 1,
    familySharing: false,
    screenshot: true,
    reviewNotes:
      "Open Settings › Team and choose Monthly. Team plans add shared lists for up to 10 members.",
    localizations: {
      EN: {
        name: "Fire Team Monthly",
        description: "Shared lists for up to 10, billed monthly",
      },
      ZH: {
        name: "Fire 团队月度版",
        description: "最多 10 人共享清单，按月计费",
      },
      JP: null,
      "ZH-TW": {
        name: "Fire 團隊月度版",
        description: "最多 10 人共享清單，按月計費",
      },
    },
  },
  {
    id: "com.acme.fire.pro.lifetime",
    appleId: "6502918860",
    name: "Fire Pro Lifetime",
    type: "Non-Consumable",
    state: "approved",
    label: "Approved",
    price: 79.99,
    familySharing: true,
    screenshot: true,
    reviewNotes:
      "Open Settings › Fire Pro and choose Lifetime. Restore Purchases is on the same screen.",
    localizations: {
      EN: {
        name: "Fire Pro Lifetime",
        description: "Pay once and keep Pro forever",
      },
      ZH: { name: "Fire Pro 永久版", description: "一次购买，永久使用 Pro" },
      JP: {
        name: "Fire Pro 買い切り",
        description: "一度の購入でProをずっと利用",
      },
      "ZH-TW": {
        name: "Fire Pro 永久版",
        description: "一次購買，永久使用 Pro",
      },
    },
  },
  {
    id: "com.acme.fire.sounds.focus",
    appleId: "6502918871",
    name: "Focus Sound Pack",
    type: "Non-Consumable",
    state: "rejected",
    label: "Developer Action Needed",
    price: 2.99,
    familySharing: true,
    screenshot: true,
    reviewNotes: "Open the focus timer and tap the sound icon.",
    issue: {
      guideline: "Guideline 2.1 · Jun 20, 2025",
      title: "The review screenshot does not show the purchase",
      text: "The screenshot shows the focus timer, but not where the Focus Sound Pack is offered. Upload a screenshot of the purchase screen and explain how to reach it.",
    },
    localizations: {
      EN: {
        name: "Focus Sound Pack",
        description: "Twelve ambient sounds for the focus timer",
      },
      ZH: { name: "专注音效包", description: "为专注计时器提供十二种环境音" },
      JP: null,
      "ZH-TW": {
        name: "專注音效包",
        description: "為專注計時器提供十二種環境音",
      },
    },
  },
  {
    id: "com.acme.fire.credits.50",
    appleId: "6502918880",
    name: "50 AI Breakdown Credits",
    type: "Consumable",
    state: "missing",
    label: "Missing Metadata",
    price: 0.99,
    familySharing: false,
    screenshot: false,
    reviewNotes: "",
    localizations: {
      EN: { name: "50 AI Credits", description: "Break down 50 tasks with AI" },
      ZH: null,
      JP: null,
      "ZH-TW": null,
    },
  },
  {
    id: "com.acme.fire.theme.holiday",
    appleId: "6502918802",
    name: "Holiday Theme Pack",
    type: "Non-Consumable",
    state: "removed",
    label: "Removed from Sale",
    price: 1.99,
    familySharing: true,
    screenshot: true,
    reviewNotes: "Seasonal theme. Open Settings › Appearance.",
    localizations: {
      EN: {
        name: "Holiday Theme Pack",
        description: "Four festive themes for winter",
      },
      ZH: { name: "节日主题包", description: "四款冬季节日主题" },
      JP: { name: "ホリデーテーマ", description: "冬の4つのテーマ" },
      "ZH-TW": { name: "節日主題包", description: "四款冬季節日主題" },
    },
  },
]

type PriceChange = {
  base: number
  custom: Record<string, number>
  start: "now" | "date"
  date: string
  preserve: boolean
}

function PriceEditor({
  product,
  base,
  custom,
  onClose,
  onSave,
}: {
  product: Purchase
  base: number
  custom: Record<string, number>
  onClose: () => void
  onSave: (change: PriceChange) => void
}) {
  const [draftBase, setDraftBase] = useState(base)
  const [draft, setDraft] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(custom).map(([name, value]) => [name, String(value)]),
    ),
  )
  const [start, setStart] = useState<PriceChange["start"]>("now")
  const [date, setDate] = useState("2025-07-15")
  const [preserve, setPreserve] = useState(true)
  const [query, setQuery] = useState("")
  const [region, setRegion] = useState<
    "All" | (typeof territoryRegions)[number]
  >("All")
  const priceText = (value: number, currency: string) =>
    currencies[currency].style === "round" ? String(value) : value.toFixed(2)
  const nextPrice = (territory: Territory) =>
    territory.name in draft
      ? Number(draft[territory.name])
      : equalizedPrice(draftBase, territory.currency)
  const currentPrice = (territory: Territory) =>
    custom[territory.name] ?? equalizedPrice(base, territory.currency)
  const isCustom = (territory: Territory) =>
    territory.name in draft &&
    nextPrice(territory) !== equalizedPrice(draftBase, territory.currency)
  const invalid = territories.filter(
    (territory) => !(nextPrice(territory) > 0),
  ).length
  const changed = territories.filter(
    (territory) => nextPrice(territory) !== currentPrice(territory),
  ).length
  const customCount = territories.filter(isCustom).length
  const rows = territories.filter(
    (territory) =>
      (region === "All" || territory.region === region) &&
      territory.name.toLowerCase().includes(query.trim().toLowerCase()),
  )

  return (
    <div
      className="attachment-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="attachment-modal iap-price-modal">
        <div className="attachment-modal-head">
          <div>
            <h2>Prices</h2>
            <p>
              {product.name} · {territories.length} territories
            </p>
          </div>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close prices"
          >
            ×
          </button>
        </div>

        <div className="iap-price-editor">
          <label>
            <span>Base Territory</span>
            <select disabled>
              <option>United States (USD)</option>
            </select>
          </label>
          <label>
            <span>Base Price</span>
            <select
              value={draftBase}
              onChange={(event) => setDraftBase(Number(event.target.value))}
            >
              {pricePoints.map((point) => (
                <option key={point} value={point}>
                  {usd(point)}
                  {perPeriod(product.duration)}
                </option>
              ))}
            </select>
          </label>
          <div className="iap-start">
            <span>Starts</span>
            <div className="platform-switch">
              {(
                [
                  ["now", "Immediately"],
                  ["date", "On Date"],
                ] as const
              ).map(([value, title]) => (
                <button
                  key={value}
                  className={start === value ? "active" : ""}
                  onClick={() => setStart(value)}
                >
                  {title}
                </button>
              ))}
            </div>
          </div>
          {start === "date" && (
            <label>
              <span>Date</span>
              <input
                type="date"
                value={date}
                min="2025-06-25"
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
          )}
          {product.group && (
            <label className="iap-check">
              <input
                type="checkbox"
                checked={preserve}
                onChange={(event) => setPreserve(event.target.checked)}
              />
              Keep the current price for existing subscribers
            </label>
          )}
        </div>

        <div className="iap-price-filters">
          <label className="iap-search">
            <Icon name="search" size={14} />
            <input
              value={query}
              placeholder="Search territories"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="builds-filter">
            {(["All", ...territoryRegions] as const).map((item) => (
              <button
                key={item}
                className={region === item ? "active" : ""}
                onClick={() => setRegion(item)}
              >
                {item}
              </button>
            ))}
          </div>
          {customCount > 0 && (
            <button
              className="add-button"
              onClick={() => setDraft({})}
            >
              Reset {customCount} Custom
            </button>
          )}
        </div>

        <div className="iap-price-scroll">
          <div className="iap-table iap-all-prices">
            <div className="iap-row iap-row-head">
              <span>Territory</span>
              <span>Currency</span>
              <span>Current</span>
              <span>New Price</span>
              <span>Proceeds</span>
              <span />
            </div>
            {rows.map((territory) => {
              const next = nextPrice(territory)
              const custom = isCustom(territory)
              const base = territory.name === baseTerritory
              return (
                <div
                  key={territory.name}
                  className={`iap-row ${
                    next !== currentPrice(territory) ? "changed" : ""
                  }`}
                >
                  <span className="iap-territory">
                    <strong>{territory.name}</strong>
                    <small>{base ? "Base territory" : territory.region}</small>
                  </span>
                  <span>{territory.currency}</span>
                  <span>
                    {money(currentPrice(territory), territory.currency)}
                  </span>
                  <label
                    className={`iap-price-input ${next > 0 ? "" : "invalid"}`}
                  >
                    <input
                      aria-label={`${territory.name} price`}
                      inputMode="decimal"
                      disabled={base}
                      value={
                        draft[territory.name] ??
                        priceText(next, territory.currency)
                      }
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          [territory.name]: event.target.value,
                        })
                      }
                    />
                  </label>
                  <span>
                    {next > 0
                      ? money(
                          proceedsOf(next, territory.currency),
                          territory.currency,
                        )
                      : "—"}
                  </span>
                  <span>
                    {custom ? (
                      <button
                        className="iap-reset"
                        title="Use the equalized price"
                        onClick={() => {
                          const { [territory.name]: _, ...rest } = draft
                          setDraft(rest)
                        }}
                      >
                        Custom ×
                      </button>
                    ) : (
                      <small>{base ? "Base" : "Equalized"}</small>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
          {rows.length === 0 && (
            <p className="builds-empty">No territories match your search.</p>
          )}
        </div>

        <div className="iap-modal-footer">
          <span className={invalid ? "invalid" : ""}>
            {invalid
              ? `Enter a valid price for ${invalid} ${
                  invalid === 1 ? "territory" : "territories"
                }`
              : changed
                ? `${changed} of ${territories.length} territories will change`
                : "No price changes"}
          </span>
          <div>
            <button className="quiet-button" onClick={onClose}>
              Cancel
            </button>
            <button
              className="accent-button"
              disabled={invalid > 0 || changed === 0}
              onClick={() =>
                onSave({
                  base: draftBase,
                  custom: Object.fromEntries(
                    territories
                      .filter(isCustom)
                      .map((territory) => [
                        territory.name,
                        nextPrice(territory),
                      ]),
                  ),
                  start,
                  date,
                  preserve,
                })
              }
            >
              {start === "date" ? "Schedule Change" : "Save Prices"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PurchasesPage({ notify }: { notify: (message: string) => void }) {
  const [filter, setFilter] =
    useState<(typeof purchaseFilters)[number]>("All")
  const [selectedId, setSelectedId] = useState("com.acme.fire.pro.monthly")
  const [notesEdits, setNotesEdits] = useState<Record<string, string>>({})
  const [sharing, setSharing] = useState<Record<string, boolean>>({})
  const [localizations, setLocalizations] = useState<
    Record<string, Purchase["localizations"]>
  >({})
  const [localeMenu, setLocaleMenu] = useState(false)
  const [basePrices, setBasePrices] = useState<Record<string, number>>({})
  const [customPrices, setCustomPrices] = useState<
    Record<string, Record<string, number>>
  >({})
  const [schedules, setSchedules] = useState<Record<string, string>>({})
  const [priceEditor, setPriceEditor] = useState(false)
  const priceOf = (item: Purchase) => basePrices[item.id] ?? item.price
  const visible = purchases.filter(
    (item) =>
      filter === "All" ||
      (filter === "Subscriptions" && item.group) ||
      (filter === "One-Time" && !item.group) ||
      (filter === "Issues" && ["missing", "rejected"].includes(item.state)),
  )
  const groups = [
    ...new Set(purchases.flatMap((item) => (item.group ? [item.group] : []))),
  ]
  const sections = [
    ...groups.map(
      (group) =>
        [
          group,
          "Subscription group",
          visible.filter((item) => item.group === group),
        ] as const,
    ),
    [
      "One-Time Purchases",
      "",
      visible.filter((item) => !item.group),
    ] as const,
  ]
  const selected =
    visible.find((item) => item.id === selectedId) ?? visible[0]
  const locales = selected
    ? (localizations[selected.id] ?? selected.localizations)
    : {}
  const setLocales = (next: Purchase["localizations"]) =>
    selected && setLocalizations({ ...localizations, [selected.id]: next })
  const localeCodes = Object.keys(locales)
  const missingLocales = localeCodes.filter(
    (code) => !locales[code]?.name.trim(),
  )
  const availableLocales = storeLocales.filter(
    ([code]) => !localeCodes.includes(code),
  )
  const notes =
    notesEdits[selected?.id ?? ""] ?? selected?.reviewNotes ?? ""
  const familySharing = selected
    ? (sharing[selected.id] ?? selected.familySharing)
    : false
  const groupProducts = selected?.group
    ? purchases.filter((item) => item.group === selected.group)
    : []
  const basePrice = selected ? priceOf(selected) : 0
  const custom = selected ? (customPrices[selected.id] ?? {}) : {}
  const scheduled = selected
    ? (schedules[selected.id] ?? selected.scheduledPrice)
    : undefined

  return (
    <div className="review-workspace builds-workspace">
      <div className="review-heading">
        <div>
          <span className="card-icon warm">
            <Icon name="tag" size={20} />
          </span>
          <div>
            <h1>In-App Purchases</h1>
          </div>
        </div>
        <div className="builds-toolbar">
          <button
            className="quiet-button"
            onClick={() => notify("Products synced with App Store Connect")}
          >
            <Icon name="cloud" size={14} />
            Sync Products
          </button>
          <button
            className="quiet-button"
            onClick={() => notify("New subscription group created")}
          >
            <Icon name="apps" size={14} />
            New Group
          </button>
          <button
            className="accent-button"
            onClick={() => notify("New in-app purchase created")}
          >
            <Icon name="plus" size={14} />
            Create Product
          </button>
        </div>
      </div>

      <div className="review-split builds-split">
        <aside className="submission-pane">
          <div className="builds-filter">
            {purchaseFilters.map((item) => (
              <button
                key={item}
                className={filter === item ? "active" : ""}
                onClick={() => setFilter(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="submission-list builds-list">
            {sections
              .filter(([, , items]) => items.length > 0)
              .map(([title, detail, items]) => (
                <section key={title}>
                  <h3>
                    {title}
                    <small>
                      {detail ? `${detail} · ` : ""}
                      {items.length} products
                    </small>
                  </h3>
                  {items.map((item) => (
                    <button
                      key={item.id}
                      className={selected?.id === item.id ? "selected" : ""}
                      onClick={() => {
                        setSelectedId(item.id)
                        setLocaleMenu(false)
                      }}
                    >
                      <span className={`iap-dot ${item.state}`} />
                      <span className="submission-copy">
                        <strong>{item.name}</strong>
                        <small>
                          {usd(priceOf(item))}
                          {item.duration ? ` / ${item.duration}` : ""} ·{" "}
                          {item.type === "Auto-Renewable Subscription"
                            ? "Auto-renewable"
                            : item.type}
                        </small>
                      </span>
                      <span className={`iap-state ${item.state}`}>
                        {purchaseStateShort[item.state]}
                      </span>
                      <Icon name="chevron" size={13} />
                    </button>
                  ))}
                </section>
              ))}
            {visible.length === 0 && (
              <p className="builds-empty">No products match this filter.</p>
            )}
          </div>
        </aside>

        {selected ? (
          <section
            className="submission-detail build-detail iap-detail"
            key={selected.id}
          >
            <div className="detail-head">
              <div>
                <span>
                  {selected.type}
                  {selected.group && ` · ${selected.group}`}
                </span>
                <h2>
                  {selected.name}
                  <em className={`iap-state ${selected.state}`}>
                    {selected.label}
                  </em>
                </h2>
                <p>
                  Product ID{" "}
                  <button
                    className="iap-copy"
                    onClick={() => notify("Product ID copied")}
                  >
                    {selected.id}
                  </button>{" "}
                  · Apple ID {selected.appleId}
                </p>
              </div>
              <div className="build-actions">
                {selected.state === "approved" && (
                  <button
                    className="quiet-button"
                    onClick={() => notify(`${selected.name} removed from sale`)}
                  >
                    Remove from Sale
                  </button>
                )}
                {selected.state === "review" && (
                  <button
                    className="quiet-button"
                    onClick={() =>
                      notify(`${selected.name} withdrawn from review`)
                    }
                  >
                    Withdraw from Review
                  </button>
                )}
                {(selected.state === "rejected" ||
                  selected.state === "missing") && (
                  <button
                    className="accent-button"
                    disabled={selected.state === "missing"}
                    title={
                      selected.state === "missing"
                        ? "Complete the missing metadata first"
                        : undefined
                    }
                    onClick={() =>
                      notify(`${selected.name} submitted for review`)
                    }
                  >
                    <Icon name="upload" size={14} />
                    Submit for Review
                  </button>
                )}
                {selected.state === "removed" && (
                  <button
                    className="accent-button"
                    onClick={() => notify(`${selected.name} restored to sale`)}
                  >
                    Restore to Sale
                  </button>
                )}
              </div>
            </div>

            {selected.issue && (
              <div className="rejection-card">
                <span className="rejection-icon">!</span>
                <div>
                  <span>{selected.issue.guideline}</span>
                  <h3>{selected.issue.title}</h3>
                  <p>{selected.issue.text}</p>
                </div>
                <button onClick={() => notify("Reply to App Review opened")}>
                  Reply <Icon name="chevron" size={12} />
                </button>
              </div>
            )}
            {selected.state === "missing" && (
              <div className="iap-notice">
                <strong>Complete these before submitting</strong>
                <ul>
                  {missingLocales.length > 0 && (
                    <li>
                      Localizations for{" "}
                      {missingLocales.map(localeTitle).join(", ")}
                    </li>
                  )}
                  {!selected.screenshot && <li>App Review screenshot</li>}
                  {!selected.reviewNotes && <li>App Review notes</li>}
                </ul>
              </div>
            )}
            {selected.state === "review" && (
              <div className="iap-notice info">
                <strong>Submitted with version 3.3.0</strong>
                <span>
                  First-time subscriptions are reviewed together with an app
                  version.
                </span>
              </div>
            )}

            <div className="iap-sections">
              <div className="card">
                <div className="card-heading">
                  <div>
                    <span className="card-icon warm">
                      <Icon name="metadata" size={17} />
                    </span>
                    <h2>Localization</h2>
                    <p>
                      Display name and description for each App Store language
                    </p>
                  </div>
                  <div className="iap-heading-actions">
                    <span className="keyword-count">
                      {localeCodes.length - missingLocales.length} of{" "}
                      {localeCodes.length} languages
                    </span>
                    <div className="locale-picker">
                      <button
                        className="add-button"
                        disabled={availableLocales.length === 0}
                        onClick={() => setLocaleMenu(!localeMenu)}
                      >
                        <Icon name="plus" size={13} />
                        Add Language
                      </button>
                      {localeMenu && (
                        <div className="locale-menu iap-locale-menu">
                          <div className="locale-menu-head">
                            <strong>Add Language</strong>
                            <span>{availableLocales.length} available</span>
                          </div>
                          {availableLocales.map(([code, title]) => (
                            <button
                              key={code}
                              onClick={() => {
                                setLocales({
                                  ...locales,
                                  [code]: { name: "", description: "" },
                                })
                                setLocaleMenu(false)
                                notify(`${title} added`)
                              }}
                            >
                              <span className="locale-symbol">{code}</span>
                              <span>
                                <strong>{title}</strong>
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="iap-table iap-local-table">
                  <div className="iap-row iap-row-head">
                    <span>Language</span>
                    <span>Display Name</span>
                    <span>Description</span>
                    <span />
                  </div>
                  {localeCodes.map((code, index) => {
                    const localization = locales[code]
                    const title = localeTitle(code)
                    return (
                      <div className="iap-row" key={code}>
                        <span className="iap-lang">
                          <span className="locale-symbol">{code}</span>
                          <span>
                            <strong>{title}</strong>
                            <small>
                              {index === 0
                                ? "Primary"
                                : !localization
                                  ? "Not localized"
                                  : localization.name
                                    ? "Localized"
                                    : "Draft"}
                            </small>
                          </span>
                        </span>
                        {localization ? (
                          (["name", "description"] as const).map((key) => (
                            <label className="iap-input" key={key}>
                              <input
                                aria-label={`${title} ${key}`}
                                autoFocus={
                                  key === "name" && !localization.name
                                }
                                placeholder={
                                  key === "name"
                                    ? "Required"
                                    : "Optional description"
                                }
                                value={localization[key]}
                                maxLength={key === "name" ? 30 : 45}
                                onChange={(event) =>
                                  setLocales({
                                    ...locales,
                                    [code]: {
                                      ...localization,
                                      [key]: event.target.value,
                                    },
                                  })
                                }
                              />
                              <small>
                                {localization[key].length}/
                                {key === "name" ? 30 : 45}
                              </small>
                            </label>
                          ))
                        ) : (
                          <div className="iap-local-missing">
                            <span>No {title} localization yet</span>
                            <button
                              className="add-button"
                              onClick={() =>
                                setLocales({
                                  ...locales,
                                  [code]: { name: "", description: "" },
                                })
                              }
                            >
                              <Icon name="plus" size={13} />
                              Add Localization
                            </button>
                          </div>
                        )}
                        {index > 0 && localization ? (
                          <button
                            className="iap-remove"
                            aria-label={`Remove ${title}`}
                            title={`Remove ${title}`}
                            onClick={() => {
                              const { [code]: _, ...rest } = locales
                              setLocales(
                                purchaseLocales.includes(code)
                                  ? { ...rest, [code]: null }
                                  : rest,
                              )
                              notify(`${title} removed`)
                            }}
                          >
                            ×
                          </button>
                        ) : (
                          <span />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="card">
                <div className="card-heading">
                  <div>
                    <span className="card-icon pale">
                      <Icon name="database" size={17} />
                    </span>
                    <h2>Pricing</h2>
                    <p>
                      Base price {usd(basePrice)}
                      {perPeriod(selected.duration)} in the United States ·{" "}
                      {Object.keys(custom).length
                        ? `${Object.keys(custom).length} custom territory prices`
                        : "Other territories are equalized automatically"}
                    </p>
                  </div>
                  <button
                    className="add-button"
                    onClick={() => setPriceEditor(true)}
                  >
                    Edit Prices
                  </button>
                </div>
                {scheduled && (
                  <p className="notice-text iap-scheduled">
                    Scheduled: {scheduled}
                  </p>
                )}
                <div className="iap-table iap-price-table">
                  <div className="iap-row iap-row-head">
                    <span>Territory</span>
                    <span>Currency</span>
                    <span>Customer Price</span>
                    <span>Proceeds</span>
                  </div>
                  {featuredTerritories.map((name) => {
                    const territory = territories.find(
                      (item) => item.name === name,
                    )
                    if (!territory) return null
                    const price =
                      custom[name] ??
                      equalizedPrice(basePrice, territory.currency)
                    return (
                      <div className="iap-row" key={name}>
                        <span>
                          {name}
                          {custom[name] !== undefined && (
                            <em className="iap-custom-tag">Custom</em>
                          )}
                        </span>
                        <span>{territory.currency}</span>
                        <strong>{money(price, territory.currency)}</strong>
                        <span>
                          {money(
                            proceedsOf(price, territory.currency),
                            territory.currency,
                          )}
                        </span>
                      </div>
                    )
                  })}
                  <button
                    className="iap-table-more"
                    onClick={() => setPriceEditor(true)}
                  >
                    Show all {territories.length} territories{" "}
                    <Icon name="chevron" size={13} />
                  </button>
                </div>
                <p className="field-hint">
                  Proceeds are after VAT, at the 85% Small Business Program
                  rate.
                </p>
              </div>

              <div className="card">
                <div className="card-heading">
                  <div>
                    <span className="card-icon sand">
                      <Icon name="settings" size={17} />
                    </span>
                    <h2>{selected.group ? "Subscription" : "Availability"}</h2>
                    <p>
                      {selected.group
                        ? "Duration, group level, offers, and sharing"
                        : "Type, territories, and sharing"}
                    </p>
                  </div>
                  {selected.group && (
                    <button
                      className="add-button"
                      onClick={() => notify("Subscription offers opened")}
                    >
                      Manage Offers
                    </button>
                  )}
                </div>
                <div className="iap-config">
                  {(selected.group
                    ? [
                        ["Duration", selected.duration ?? ""],
                        [
                          "Subscription Group",
                          `${selected.group} · ${groupProducts.length} products`,
                        ],
                        ["Group Level", `Level ${selected.level}`],
                        ["Introductory Offer", selected.introOffer ?? "None"],
                        [
                          "Promotional Offers",
                          selected.promoOffers
                            ? `${selected.promoOffers} active`
                            : "None",
                        ],
                        [
                          "Territories",
                          `${territories.length} of ${territories.length}`,
                        ],
                      ]
                    : [
                        ["Type", selected.type],
                        [
                          "Territories",
                          `${territories.length} of ${territories.length}`,
                        ],
                        ["Hosted Content", "Off"],
                      ]
                  ).map(([label, value]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <strong>{value}</strong>
                    </div>
                  ))}
                  <div className="iap-sharing">
                    <div>
                      <span>Family Sharing</span>
                      <p>
                        {selected.type === "Consumable"
                          ? "Not available for consumable purchases"
                          : familySharing
                            ? "Up to five family members can use this purchase"
                            : "Only the purchaser can use this purchase"}
                      </p>
                    </div>
                    {selected.type !== "Consumable" && (
                      <button
                        className={`iap-toggle ${familySharing ? "on" : ""}`}
                        role="switch"
                        aria-checked={familySharing}
                        aria-label="Family Sharing"
                        onClick={() =>
                          setSharing({
                            ...sharing,
                            [selected.id]: !familySharing,
                          })
                        }
                      >
                        <span />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-heading">
                  <div>
                    <span className="card-icon orange">
                      <Icon name="search" size={17} />
                    </span>
                    <h2>Review Information</h2>
                    <p>Only App Review sees this</p>
                  </div>
                </div>
                <div className="iap-review">
                  <div>
                    <span className="iap-label">Screenshot</span>
                    {selected.screenshot ? (
                      <button
                        className="iap-shot"
                        onClick={() => notify("Review screenshot opened")}
                      >
                        <span className="shot-camera" />
                        <strong>{selected.group ?? "Fire Pro"}</strong>
                        <i />
                        <i />
                        <i />
                        <b>{usd(basePrice)}</b>
                      </button>
                    ) : (
                      <button
                        className="shot-add iap-shot-add"
                        onClick={() => notify("Screenshot uploader opened")}
                      >
                        <Icon name="upload" size={20} />
                        <span>Add Screenshot</span>
                      </button>
                    )}
                  </div>
                  <label>
                    <span className="iap-label">Review Notes</span>
                    <textarea
                      value={notes}
                      maxLength={4000}
                      placeholder="Explain where the purchase is offered and how to test it"
                      onChange={(event) =>
                        setNotesEdits({
                          ...notesEdits,
                          [selected.id]: event.target.value,
                        })
                      }
                    />
                    <div className="promo-footer">
                      <span>{notes.length} / 4,000</span>
                      <button
                        onClick={() => notify("Review information saved")}
                      >
                        Save
                      </button>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="submission-detail build-detail">
            <p className="builds-empty">No product selected.</p>
          </section>
        )}
      </div>
      {priceEditor && selected && (
        <PriceEditor
          product={selected}
          base={basePrice}
          custom={custom}
          onClose={() => setPriceEditor(false)}
          onSave={(change) => {
            setPriceEditor(false)
            if (change.start === "date") {
              setSchedules({
                ...schedules,
                [selected.id]: `Changes to ${usd(change.base)} on ${formatDate(
                  change.date,
                )}${
                  selected.group
                    ? change.preserve
                      ? ` · Existing subscribers keep ${usd(basePrice)}`
                      : " · Applies to existing subscribers"
                    : ""
                }`,
              })
              notify(`Price change scheduled for ${formatDate(change.date)}`)
              return
            }
            // An immediate change replaces any pending scheduled change
            setSchedules({ ...schedules, [selected.id]: "" })
            setBasePrices({ ...basePrices, [selected.id]: change.base })
            setCustomPrices({ ...customPrices, [selected.id]: change.custom })
            notify(
              selected.group && change.preserve && change.base !== basePrice
                ? `Prices updated · Existing subscribers keep ${usd(basePrice)}`
                : "Prices updated",
            )
          }}
        />
      )}
    </div>
  )
}

const analyticsTabs = [
  "Overview",
  "Acquisition",
  "App Store Features",
  "Sales",
  "Subscriptions",
  "Cohorts",
  "Engagement",
  "Performance",
  "Benchmarks",
  "Metrics",
] as const

type AnalyticsTab = (typeof analyticsTabs)[number]

// One-hue sequential ramp, light to dark, from the app's orange
const heatRamp = [
  "#fdeee6",
  "#fbd9c6",
  "#f7b896",
  "#f29466",
  "#eb6834",
  "#c94f20",
  "#a03d17",
]

// Validated categorical order. Hues follow the entity and are never cycled;
// anything past the eighth value falls back to a neutral.
const seriesPalette = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#008300",
  "#6250d6",
  "#e34948",
]
const seriesFallback = "#a39e98"

const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
})

const shortDate = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "short", day: "numeric" })

const fullDate = (date: Date) =>
  date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

const monthLabel = (ordinal: number) =>
  new Date(Math.floor(ordinal / 12), ordinal % 12, 1).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" },
  )

const monthOrdinal = (date: Date) => date.getFullYear() * 12 + date.getMonth()

// Takes a half-open day-index range
function rangeText(from: number, to: number) {
  const start = dateAt(from)
  const end = dateAt(to - 1)
  if (to - from === 1) return fullDate(start)
  return start.getFullYear() === end.getFullYear()
    ? `${shortDate(start)} – ${fullDate(end)}`
    : `${fullDate(start)} – ${fullDate(end)}`
}

const dayCount = (days: number) => `${days} ${days === 1 ? "day" : "days"}`

function formatUnit(unit: Unit, value: number, full = false) {
  switch (unit) {
    case "percent":
      return `${(value * 100).toFixed(value !== 0 && Math.abs(value) < 0.01 ? 2 : 1)}%`
    case "currency":
      if (Math.abs(value) < 100) return `$${value.toFixed(2)}`
      return full || Math.abs(value) < 1000
        ? `$${Math.round(value).toLocaleString("en-US")}`
        : `$${compactNumber.format(value)}`
    case "decimal":
      return value.toFixed(1)
    case "duration":
      return `${Math.floor(value / 60)}m ${Math.round(value % 60)}s`
    default:
      // Counts are whole numbers, even when a filter scales them down
      if (value > 0 && value < 1) return "<1"
      return full || Math.abs(value) < 1000
        ? Math.round(value).toLocaleString("en-US")
        : compactNumber.format(value)
  }
}

const formatMetric = (key: string, value: number, full = false) =>
  formatUnit(metric(key).unit, value, full)

const shortLabel = (label: string) =>
  label.replace(" (Unique Devices)", " (Unique)").replace(" (All)", "")

function niceScale(value: number) {
  const raw = value / 4 || 1
  const power = 10 ** Math.floor(Math.log10(raw))
  const step =
    [1, 2, 2.5, 5, 10].map((item) => item * power).find((item) => item >= raw) ??
    raw
  return [0, 1, 2, 3, 4].map((index) => index * step)
}

type AnalyticsContext = {
  from: number
  to: number
  days: number
  compare: boolean
  granularity: Granularity
  scope: Scope
  rangeLabel: string
  previousLabel: string
  tipProps: (
    label: string,
    value: string,
  ) => {
    tabIndex: number
    onPointerMove: (event: ReactPointerEvent) => void
    onPointerLeave: () => void
    onFocus: (event: ReactFocusEvent<HTMLElement>) => void
    onBlur: () => void
  }
  openMetric: (key: string) => void
}

type ChartSeries = {
  label: string
  values: number[]
  tone: "primary" | "previous" | "line"
  color?: string
}

function TrendChart({
  axisLabels,
  tooltipLabels,
  series,
  events = [],
  format,
  axisFormat,
  label,
}: {
  axisLabels: string[]
  tooltipLabels: string[]
  series: ChartSeries[]
  events?: { index: number; label: string }[]
  format: (value: number) => string
  axisFormat: (value: number) => string
  label: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(720)
  const [hover, setHover] = useState<number | null>(null)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const height = 290
  const pad = { top: 26, right: 58, bottom: 30, left: 50 }
  const plotWidth = Math.max(width - pad.left - pad.right, 10)
  const plotHeight = height - pad.top - pad.bottom
  const count = axisLabels.length
  const last = count - 1
  const ticks = niceScale(Math.max(...series.flatMap((item) => item.values)))
  const max = ticks[ticks.length - 1]
  const x = (index: number) =>
    pad.left + (index * plotWidth) / Math.max(last, 1)
  const y = (value: number) => pad.top + plotHeight - (value / max) * plotHeight
  const path = (values: number[]) =>
    values
      .map(
        (value, index) =>
          `${index ? "L" : "M"}${x(index).toFixed(1)},${y(value).toFixed(1)}`,
      )
      .join("")
  const labelEvery = Math.ceil(count / Math.max(plotWidth / 90, 2))
  const pointAt = (clientX: number, left: number) =>
    Math.min(
      Math.max(
        Math.round(((clientX - left - pad.left) / plotWidth) * last),
        0,
      ),
      last,
    )
  const primary = series.find((item) => item.tone === "primary")
  const toolTipSeries = [...series].sort((a, b) =>
    hover === null || a.tone !== "line" || b.tone !== "line"
      ? 0
      : b.values[hover] - a.values[hover],
  )

  return (
    <div
      ref={ref}
      className="an-chart"
      tabIndex={0}
      aria-label={`${label} chart. Use the arrow keys to read values.`}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault()
          const step = event.key === "ArrowLeft" ? -1 : 1
          setHover(Math.min(Math.max((hover ?? last) + step, 0), last))
        }
      }}
      onBlur={() => setHover(null)}
    >
      <svg width={width} height={height} role="img" aria-label={label}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              className="an-gridline"
              x1={pad.left}
              x2={pad.left + plotWidth}
              y1={y(tick)}
              y2={y(tick)}
            />
            <text className="an-axis" x={pad.left - 10} y={y(tick) + 4}>
              {axisFormat(tick)}
            </text>
          </g>
        ))}
        {axisLabels.map(
          (text, index) =>
            (last - index) % labelEvery === 0 && (
              <text
                key={index}
                className="an-axis an-axis-x"
                x={x(index)}
                y={height - 8}
              >
                {text}
              </text>
            ),
        )}
        {events.map((event, number) => (
          <g key={event.label} className="an-event">
            <line
              x1={x(event.index)}
              x2={x(event.index)}
              y1={pad.top - 6}
              y2={y(0)}
            />
            <circle cx={x(event.index)} cy={pad.top - 14} r={8} />
            <text x={x(event.index)} y={pad.top - 10}>
              {number + 1}
            </text>
          </g>
        ))}
        {primary && (
          <path
            className="an-area"
            d={`${path(primary.values)}L${x(last)},${y(0)}L${x(0)},${y(0)}Z`}
          />
        )}
        {series.map((item) => (
          <path
            key={item.label}
            className={`an-line ${item.tone === "previous" ? "previous" : ""}`}
            style={item.color ? { stroke: item.color } : undefined}
            d={path(item.values)}
          />
        ))}
        {primary && (
          <>
            <circle
              className="an-dot"
              cx={x(last)}
              cy={y(primary.values[last])}
              r={4}
            />
            <text
              className="an-end-label"
              x={x(last) + 9}
              y={y(primary.values[last]) + 4}
            >
              {axisFormat(primary.values[last])}
            </text>
          </>
        )}
        {hover !== null && (
          <g>
            <line
              className="an-crosshair"
              x1={x(hover)}
              x2={x(hover)}
              y1={pad.top}
              y2={y(0)}
            />
            {series.map((item) => (
              <circle
                key={item.label}
                className={`an-dot ${item.tone === "previous" ? "previous" : ""}`}
                style={item.color ? { fill: item.color } : undefined}
                cx={x(hover)}
                cy={y(item.values[hover])}
                r={4}
              />
            ))}
          </g>
        )}
        <rect
          className="an-hit"
          x={pad.left - 8}
          y={0}
          width={plotWidth + 16}
          height={height}
          onPointerMove={(event) =>
            setHover(
              pointAt(
                event.clientX,
                event.currentTarget.ownerSVGElement?.getBoundingClientRect()
                  .left ?? 0,
              ),
            )
          }
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {hover !== null && (
        <div
          className={`an-tooltip ${x(hover) > width - 210 ? "flip" : ""}`}
          style={{ left: x(hover), top: pad.top }}
        >
          <small>{tooltipLabels[hover]}</small>
          {toolTipSeries.map((item) => (
            <div key={item.label}>
              <i
                className={item.tone === "previous" ? "previous" : ""}
                style={item.color ? { background: item.color } : undefined}
              />
              <strong>{format(item.values[hover])}</strong>
              <span>{item.label}</span>
            </div>
          ))}
          {events
            .filter((event) => event.index === hover)
            .map((event) => (
              <em key={event.label}>{event.label}</em>
            ))}
        </div>
      )}
    </div>
  )
}

function bucketLabels(buckets: Bucket[], granularity: Granularity) {
  const multiYear =
    dateAt(buckets[0][0]).getFullYear() !==
    dateAt(buckets[buckets.length - 1][0]).getFullYear()
  return {
    axis: buckets.map(([from]) => {
      const date = dateAt(from)
      if (granularity !== "month") return shortDate(date)
      return date.toLocaleDateString("en-US", {
        month: "short",
        ...(multiYear ? { year: "2-digit" } : {}),
      })
    }),
    tooltip: buckets.map(([from, to]) => rangeText(from, to)),
  }
}

const unfilteredBy = (key: string, scope: Scope) =>
  (Object.keys(scope.filters) as DimensionKey[])
    .filter((dimension) => !metric(key).dims.includes(dimension))
    .map((dimension) => dimensions[dimension].label)

function ChangeLabel({ metricKey, now, before }: {
  metricKey: string
  now: number
  before: number
}) {
  if (!before) return <small className="an-flat">—</small>
  const change = (now - before) / before
  const good = change >= 0 === metric(metricKey).upIsGood
  return (
    <small className={good ? "good" : "bad"}>
      {change >= 0 ? "▲" : "▼"} {Math.abs(change * 100).toFixed(1)}%
    </small>
  )
}

function TrendSection({
  context,
  metrics,
}: {
  context: AnalyticsContext
  metrics: string[]
}) {
  const { from, to, days, compare, granularity, scope } = context
  const [selected, setSelected] = useState(metrics[0])
  const [view, setView] = useState<"chart" | "table">("chart")
  const buckets = bucketsFor(from, to, granularity)
  const priorBuckets = buckets.map(
    ([start, end]): Bucket => [start - days, end - days],
  )
  const values = seriesFor(selected, buckets, scope)
  const previous = seriesFor(selected, priorBuckets, scope)
  const labels = bucketLabels(buckets, granularity)
  const events = analyticsEvents
    .filter((event) => event.index >= from && event.index < to)
    .sort((a, b) => a.index - b.index)
    .map((event) => ({
      label: event.label,
      date: dateAt(event.index),
      index: buckets.findIndex(
        ([start, end]) => event.index >= start && event.index < end,
      ),
    }))

  return (
    <section className="card an-trend">
      <div
        className="an-metrics"
        role="tablist"
        style={{ "--an-cols": metrics.length } as CSSProperties}
      >
        {metrics.map((key) => {
          const note = unfilteredBy(key, scope)
          return (
            <button
              key={key}
              role="tab"
              aria-selected={selected === key}
              className={selected === key ? "active" : ""}
              title={metric(key).definition}
              onClick={() => setSelected(key)}
            >
              <span>{shortLabel(metric(key).label)}</span>
              <strong>
                {formatMetric(key, aggregate(key, from, to, scope))}
              </strong>
              <ChangeLabel
                metricKey={key}
                now={aggregate(key, from, to, scope)}
                before={aggregate(key, from - days, from, scope)}
              />
              {note.length > 0 && <em>Not split by {note.join(", ")}</em>}
            </button>
          )
        })}
      </div>
      <div className="an-trend-head">
        <div className="an-legend">
          <span>
            <i />
            {context.rangeLabel}
          </span>
          {compare && (
            <span>
              <i className="previous" />
              {context.previousLabel}
            </span>
          )}
        </div>
        <div className="platform-switch an-view-switch">
          {(["chart", "table"] as const).map((item) => (
            <button
              key={item}
              className={view === item ? "active" : ""}
              onClick={() => setView(item)}
            >
              {item === "chart" ? "Chart" : "Table"}
            </button>
          ))}
        </div>
      </div>
      {view === "chart" ? (
        <>
          <TrendChart
            axisLabels={labels.axis}
            tooltipLabels={labels.tooltip}
            series={[
              ...(compare
                ? [
                    {
                      label: context.previousLabel,
                      values: previous,
                      tone: "previous" as const,
                    },
                  ]
                : []),
              {
                label: context.rangeLabel,
                values,
                tone: "primary" as const,
              },
            ]}
            events={events}
            format={(value) => formatMetric(selected, value, true)}
            axisFormat={(value) => formatMetric(selected, value)}
            label={metric(selected).label}
          />
          {events.length > 0 && (
            <ol className="an-events">
              {events.map((event, index) => (
                <li key={event.label}>
                  <b>{index + 1}</b>
                  {shortDate(event.date)} · {event.label}
                </li>
              ))}
            </ol>
          )}
        </>
      ) : (
        <div className="an-table-view">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>{metric(selected).label}</th>
                {compare && <th>Previous Period</th>}
              </tr>
            </thead>
            <tbody>
              {[...values.keys()].reverse().map((index) => (
                <tr key={index}>
                  <td>{labels.tooltip[index]}</td>
                  <td>{formatMetric(selected, values[index], true)}</td>
                  {compare && (
                    <td>{formatMetric(selected, previous[index], true)}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function CardHeading({
  icon,
  tone,
  title,
  note,
  children,
}: {
  icon: IconName
  tone: "warm" | "pale" | "sand" | "orange"
  title: string
  note?: string
  children?: ReactNode
}) {
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

function Sparkline({ values }: { values: number[] }) {
  const width = 100
  const height = 26
  const max = Math.max(...values)
  const min = Math.min(...values)
  const points = values
    .map((value, index) => {
      const px = (index / Math.max(values.length - 1, 1)) * width
      const py = height - 2 - ((value - min) / (max - min || 1)) * (height - 4)
      return `${px.toFixed(1)},${py.toFixed(1)}`
    })
    .join(" ")
  return (
    <svg
      className="an-spark"
      aria-hidden="true"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    >
      <polyline points={points} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function StatGroup({
  context,
  icon,
  tone,
  title,
  note,
  metrics,
}: {
  context: AnalyticsContext
  icon: IconName
  tone: "warm" | "pale" | "sand" | "orange"
  title: string
  note?: string
  metrics: string[]
}) {
  const { from, to, days, scope } = context
  const sparkBuckets = bucketsFor(
    from,
    to,
    days > 180 ? "month" : days > 31 ? "week" : "day",
  )
  return (
    <section className="card an-stat-card">
      <CardHeading icon={icon} tone={tone} title={title} note={note} />
      <div className="an-stats">
        {metrics.map((key) => {
          const now = aggregate(key, from, to, scope)
          const notes = unfilteredBy(key, scope)
          return (
            <button
              key={key}
              className="an-stat"
              title={`${metric(key).definition} Open in Metrics.`}
              onClick={() => context.openMetric(key)}
            >
              <span>{shortLabel(metric(key).label)}</span>
              <strong>{formatMetric(key, now)}</strong>
              <ChangeLabel
                metricKey={key}
                now={now}
                before={aggregate(key, from - days, from, scope)}
              />
              {notes.length > 0 && <em>Not split by {notes.join(", ")}</em>}
              <Sparkline values={seriesFor(key, sparkBuckets, scope)} />
            </button>
          )
        })}
      </div>
    </section>
  )
}

function BreakdownCard({
  context,
  icon,
  tone,
  title,
  note,
  metrics,
  dimension,
}: {
  context: AnalyticsContext
  icon: IconName
  tone: "warm" | "pale" | "sand" | "orange"
  title: string
  note?: string
  metrics: string[]
  dimension: DimensionKey
}) {
  const { from, to, scope } = context
  const [selected, setSelected] = useState(metrics[0])
  const rows = breakdown(selected, dimension, from, to, scope)
  const max = Math.max(...rows.map((row) => row.value), 0)
  return (
    <section className="card">
      <CardHeading icon={icon} tone={tone} title={title} note={note}>
        {metrics.length > 1 && (
          <select
            className="an-select an-select-small"
            aria-label={`${title} metric`}
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
          >
            {metrics.map((key) => (
              <option key={key} value={key}>
                {shortLabel(metric(key).label)}
              </option>
            ))}
          </select>
        )}
      </CardHeading>
      <div className="an-bars">
        {rows.map((row) => (
          <div key={row.name} className="an-bar-row">
            <span title={row.name}>{row.name}</span>
            <div
              className="an-track"
              {...context.tipProps(
                row.name,
                `${formatMetric(selected, row.value, true)} ${shortLabel(metric(selected).label).toLowerCase()}${
                  row.share === null
                    ? ""
                    : ` · ${(row.share * 100).toFixed(1)}%`
                }`,
              )}
            >
              <b style={{ width: `${max ? (row.value / max) * 100 : 0}%` }} />
            </div>
            <strong>{formatMetric(selected, row.value)}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}

function AnalyticsTable({
  context,
  icon,
  tone,
  title,
  note,
  dimension,
  columns,
  shareOf,
}: {
  context: AnalyticsContext
  icon: IconName
  tone: "warm" | "pale" | "sand" | "orange"
  title: string
  note?: string
  dimension: DimensionKey
  columns: string[]
  shareOf?: string
}) {
  const { from, to, scope } = context
  const [sort, setSort] = useState({ key: columns[0], desc: true })
  const names = breakdown(columns[0], dimension, from, to, scope).map(
    (row) => row.name,
  )
  const supports = (key: string) => metric(key).dims.includes(dimension)
  const rows = names
    .map((name) => {
      const scoped: Scope = {
        ...scope,
        filters: { ...scope.filters, [dimension]: name },
      }
      return {
        name,
        scoped,
        values: Object.fromEntries(
          columns.map((key) => [key, aggregate(key, from, to, scoped)]),
        ),
        share: shareOf ? aggregate(shareOf, from, to, scoped) : 0,
      }
    })
    .sort((a, b) =>
      sort.desc
        ? b.values[sort.key] - a.values[sort.key]
        : a.values[sort.key] - b.values[sort.key],
    )
  const shareTotal = rows.reduce((total, row) => total + row.share, 0)
  return (
    <section className="card an-table-card">
      <CardHeading
        icon={icon}
        tone={tone}
        title={title}
        note={note ?? "Click a column to sort"}
      />
      <div className="an-table-wrap">
        <table className="an-table">
          <thead>
            <tr>
              <th>{dimensions[dimension].label}</th>
              {columns.map((key) => (
                <th key={key}>
                  <button
                    className={sort.key === key ? "active" : ""}
                    title={metric(key).definition}
                    onClick={() =>
                      setSort({
                        key,
                        desc: sort.key === key ? !sort.desc : true,
                      })
                    }
                  >
                    {shortLabel(metric(key).label)}
                    {sort.key === key && (sort.desc ? " ↓" : " ↑")}
                  </button>
                </th>
              ))}
              {shareOf && (
                <th>Share of {shortLabel(metric(shareOf).label)}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                {columns.map((key) => (
                  <td key={key}>
                    {supports(key)
                      ? formatMetric(key, row.values[key], true)
                      : "—"}
                  </td>
                ))}
                {shareOf && (
                  <td>
                    <span className="an-share">
                      <i>
                        <b
                          style={{
                            width: `${shareTotal ? (row.share / shareTotal) * 100 : 0}%`,
                          }}
                        />
                      </i>
                      {shareTotal
                        ? ((row.share / shareTotal) * 100).toFixed(1)
                        : "0.0"}
                      %
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function CohortHeatmap({
  context,
  columns,
  rows,
  cell,
  format,
  scaleMax,
}: {
  context: AnalyticsContext
  columns: string[]
  rows: { label: string; size?: string }[]
  cell: (row: number, column: number) => number | null
  format: (value: number) => string
  scaleMax: number
}) {
  const hasSize = rows.some((row) => row.size)
  return (
    <>
      <div
        className="an-heatmap"
        style={{ "--an-cols": columns.length, "--an-side": hasSize ? "130px" : "60px" } as CSSProperties}
      >
        <span className="an-heat-head an-heat-corner">
          {hasSize ? "Cohort · Size" : ""}
        </span>
        {columns.map((column) => (
          <span key={column} className="an-heat-head">
            {column}
          </span>
        ))}
        {rows.map((row, rowIndex) => (
          <Fragment key={row.label}>
            <span className="an-heat-week">
              {row.label}
              {row.size && <small>{row.size}</small>}
            </span>
            {columns.map((column, columnIndex) => {
              const value = cell(rowIndex, columnIndex)
              if (value === null) {
                return (
                  <span key={column} className="an-heat-cell empty">
                    —
                  </span>
                )
              }
              const step = Math.min(
                Math.floor((value / scaleMax) * heatRamp.length),
                heatRamp.length - 1,
              )
              return (
                <span
                  key={column}
                  className="an-heat-cell"
                  style={{
                    background: heatRamp[step],
                    color: step >= 4 ? "#fff" : "#4a3328",
                  }}
                  {...context.tipProps(`${row.label} · ${column}`, format(value))}
                >
                  {format(value)}
                </span>
              )
            })}
          </Fragment>
        ))}
      </div>
      <div className="an-heat-scale">
        <span>{format(0)}</span>
        <i>
          {heatRamp.map((color) => (
            <b key={color} style={{ background: color }} />
          ))}
        </i>
        <span>{format(scaleMax)}+</span>
      </div>
    </>
  )
}

// Stable per-cohort variation, keyed by the cohort's absolute position
const cohortFactor = (index: number) => 1 + 0.07 * Math.sin(index * 2.3)

function weeklyCohorts(to: number, count: number) {
  return Array.from({ length: count }, (_, row) => {
    const end = to - 7 * (count - 1 - row)
    const start = end - 7
    return { start, end, label: shortDate(dateAt(start)) }
  })
}

function RetentionCard({ context }: { context: AnalyticsContext }) {
  const { from, to, scope } = context
  const days = [1, 3, 7, 14, 28]
  const base = [0.44, 0.33, 0.25, 0.19, 0.14]
  const cohorts = weeklyCohorts(to, 6)
  const tilt =
    aggregate("retention1", from, to, scope) /
    aggregate("retention1", from, to, { platform: "iOS", filters: {} })
  return (
    <section className="card">
      <CardHeading
        icon="team"
        tone="sand"
        title="Retention"
        note="Share of each weekly install cohort still using Fire"
      />
      <CohortHeatmap
        context={context}
        columns={days.map((day) => `Day ${day}`)}
        rows={cohorts.map((cohort) => ({ label: cohort.label }))}
        cell={(row, column) =>
          cohorts[row].start + days[column] < dataLength
            ? Math.min(
                base[column] * cohortFactor(cohorts[row].start / 7) * tilt,
                0.99,
              )
            : null
        }
        format={(value) => `${(value * 100).toFixed(0)}%`}
        scaleMax={0.5}
      />
    </section>
  )
}

function FunnelCard({ context }: { context: AnalyticsContext }) {
  const { from, to, scope } = context
  const funnel = ["impressions", "pageViews", "downloads"].map((key) => ({
    key,
    title: metric(key).label,
    value: aggregate(key, from, to, scope),
  }))
  return (
    <section className="card">
      <CardHeading
        icon="search"
        tone="warm"
        title="Acquisition Funnel"
        note="From seeing Fire on the App Store to downloading it"
      />
      <div className="an-funnel">
        {funnel.map((step, index) => (
          <div key={step.key} className="an-funnel-step">
            <div className="an-bar-label">
              <span>{step.title}</span>
              <strong>{formatMetric(step.key, step.value, true)}</strong>
            </div>
            <div
              className="an-track"
              {...context.tipProps(
                step.title,
                formatMetric(step.key, step.value, true),
              )}
            >
              <b style={{ width: `${(step.value / funnel[0].value) * 100}%` }} />
            </div>
            {index > 0 && (
              <small>
                {((step.value / funnel[index - 1].value) * 100).toFixed(1)}% of{" "}
                {funnel[index - 1].title.toLowerCase()}
              </small>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

const territoryColumns = ["pageViews", "conversion", "downloads", "proceeds"]

function OverviewTab({ context }: { context: AnalyticsContext }) {
  return (
    <>
      <TrendSection
        context={context}
        metrics={[
          "impressions",
          "pageViews",
          "conversion",
          "downloads",
          "proceeds",
          "sessions",
          "crashes",
        ]}
      />
      <StatGroup
        context={context}
        icon="search"
        tone="warm"
        title="Acquisition"
        metrics={[
          "firstTimeDownloads",
          "redownloads",
          "conversion",
          "impressions",
          "pageViews",
          "updates",
        ]}
      />
      <StatGroup
        context={context}
        icon="tag"
        tone="orange"
        title="Sales"
        metrics={[
          "proceeds",
          "payingUsers",
          "iap",
          "downloadToPaid1",
          "downloadToPaid7",
          "downloadToPaid35",
        ]}
      />
      <StatGroup
        context={context}
        icon="database"
        tone="pale"
        title="Subscriptions"
        metrics={[
          "activePlans",
          "paidPlans",
          "mrr",
          "netPaidPlans",
          "planStarts",
          "conversionToPaid",
          "churned",
          "offersFromPaid",
        ]}
      />
      <StatGroup
        context={context}
        icon="team"
        tone="sand"
        title="App Usage"
        metrics={[
          "sessions",
          "crashes",
          "clipInstallations",
          "retention1",
          "retention7",
          "retention14",
          "retention28",
        ]}
      />
      <AnalyticsTable
        context={context}
        icon="store"
        tone="pale"
        title="Territories"
        note="Performance by App Store territory · Click a column to sort"
        dimension="territory"
        columns={territoryColumns}
        shareOf="downloads"
      />
    </>
  )
}

function AcquisitionTab({ context }: { context: AnalyticsContext }) {
  const reach = ["pageViews", "pageViewsUnique", "downloads", "conversion"]
  return (
    <>
      <TrendSection
        context={context}
        metrics={[
          "impressions",
          "impressionsUnique",
          "pageViews",
          "pageViewsUnique",
          "conversion",
          "firstTimeDownloads",
          "redownloads",
        ]}
      />
      <div className="an-grid">
        <FunnelCard context={context} />
        <BreakdownCard
          context={context}
          icon="apps"
          tone="pale"
          title="Source Type"
          note="Where people tapped through from"
          metrics={["downloads", ...reach.slice(0, 2), "impressions", "conversion"]}
          dimension="sourceType"
        />
        <BreakdownCard
          context={context}
          icon="team"
          tone="sand"
          title="App Referrers"
          note="Apps that sent people to the product page"
          metrics={reach}
          dimension="appReferrer"
        />
        <BreakdownCard
          context={context}
          icon="cloud"
          tone="warm"
          title="Web Referrers"
          note="Websites that sent people to the product page"
          metrics={reach}
          dimension="webReferrer"
        />
        <BreakdownCard
          context={context}
          icon="metadata"
          tone="pale"
          title="Page Type"
          note="Which App Store surface people saw"
          metrics={["pageViews", "downloads", "conversion"]}
          dimension="pageType"
        />
        <BreakdownCard
          context={context}
          icon="download"
          tone="orange"
          title="Download Type"
          note="First-time downloads versus redownloads"
          metrics={["downloads"]}
          dimension="downloadType"
        />
        <BreakdownCard
          context={context}
          icon="dashboard"
          tone="sand"
          title="Device"
          metrics={["downloads", "pageViews", "conversion"]}
          dimension="device"
        />
        <BreakdownCard
          context={context}
          icon="settings"
          tone="pale"
          title="Platform Version"
          metrics={["downloads", "pageViews", "conversion"]}
          dimension="platformVersion"
        />
        <BreakdownCard
          context={context}
          icon="store"
          tone="warm"
          title="Region"
          metrics={["downloads", "pageViews", "conversion"]}
          dimension="region"
        />
      </div>
      <StatGroup
        context={context}
        icon="cloud"
        tone="pale"
        title="Web Preview and Pre-Orders"
        note="App Store website engagement and pre-order activity"
        metrics={[
          "webPreviewViews",
          "webPreviewTaps",
          "preOrders",
          "preOrderCancels",
        ]}
      />
      <AnalyticsTable
        context={context}
        icon="store"
        tone="pale"
        title="Territories"
        note="Performance by App Store territory · Click a column to sort"
        dimension="territory"
        columns={territoryColumns}
        shareOf="downloads"
      />
    </>
  )
}

const productPageTests = [
  { name: "Baseline", impressions: 118400, conversion: 0.081, lift: null, confidence: null },
  { name: "Treatment A · Focus screenshots", impressions: 117900, conversion: 0.094, lift: 0.16, confidence: 0.97 },
  { name: "Treatment B · New icon", impressions: 118150, conversion: 0.084, lift: 0.037, confidence: 0.62 },
]

function FeaturesTab({ context }: { context: AnalyticsContext }) {
  const { scope } = context
  const scale = scope.platform === "iOS" ? 1 : 0.07
  return (
    <>
      <AnalyticsTable
        context={context}
        icon="metadata"
        tone="warm"
        title="Product Pages"
        note="Default and custom product pages · Click a column to sort"
        dimension="productPage"
        columns={[
          "impressions",
          "pageViews",
          "conversion",
          "downloads",
          "proceeds",
          "payingUsers",
        ]}
        shareOf="downloads"
      />
      <section className="card an-table-card">
        <CardHeading
          icon="chart"
          tone="sand"
          title="Product Page Optimization"
          note="Test “Summer listing” · Running for 21 days"
        />
        <div className="an-table-wrap">
          <table className="an-table">
            <thead>
              <tr>
                <th>Treatment</th>
                <th>Impressions</th>
                <th>Conversion Rate</th>
                <th>Improvement</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {productPageTests.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{formatUnit("count", row.impressions * scale, true)}</td>
                  <td>{formatUnit("percent", row.conversion)}</td>
                  <td>
                    {row.lift === null ? "—" : `+${(row.lift * 100).toFixed(1)}%`}
                  </td>
                  <td>
                    {row.confidence === null
                      ? "—"
                      : `${(row.confidence * 100).toFixed(0)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <AnalyticsTable
        context={context}
        icon="bell"
        tone="orange"
        title="In-App Events"
        note="Event engagement and outcomes · Click a column to sort"
        dimension="inAppEvent"
        columns={[
          "eventImpressions",
          "eventImpressionsUnique",
          "eventPageViews",
          "eventPageViewsUnique",
          "eventAppOpens",
          "eventReminders",
          "eventNotificationTaps",
        ]}
      />
      <AnalyticsTable
        context={context}
        icon="tag"
        tone="pale"
        title="Campaigns"
        note="Campaign link attribution · Click a column to sort"
        dimension="campaign"
        columns={[
          "pageViews",
          "downloads",
          "conversion",
          "sessions",
          "proceeds",
          "payingUsers",
        ]}
      />
      <StatGroup
        context={context}
        icon="apps"
        tone="warm"
        title="App Clips"
        metrics={[
          "clipCardViews",
          "clipCardViewsUnique",
          "clipInstallations",
          "clipSessions",
          "clipActiveDevices",
          "clipCrashes",
        ]}
      />
      <div className="an-grid">
        <BreakdownCard
          context={context}
          icon="apps"
          tone="sand"
          title="App Clip Sources"
          note="How the App Clip card was invoked"
          metrics={["clipCardViews", "clipInstallations", "clipSessions"]}
          dimension="clipSource"
        />
        <BreakdownCard
          context={context}
          icon="download"
          tone="pale"
          title="Standard Downloads and Pre-Orders"
          metrics={["downloads"]}
          dimension="preOrders"
        />
      </div>
    </>
  )
}

function SalesTab({ context }: { context: AnalyticsContext }) {
  const money = ["proceeds", "sales", "iap", "payingUsers"]
  return (
    <>
      <TrendSection
        context={context}
        metrics={[
          "proceeds",
          "sales",
          "payingUsers",
          "iap",
          "proceedsPerUser",
          "salesPerUser",
          "proceedsRefundRate",
        ]}
      />
      <div className="an-grid">
        <BreakdownCard
          context={context}
          icon="tag"
          tone="orange"
          title="By Product"
          note="Each in-app purchase and subscription"
          metrics={money}
          dimension="purchase"
        />
        <BreakdownCard
          context={context}
          icon="database"
          tone="pale"
          title="Purchase Type"
          metrics={money}
          dimension="purchaseType"
        />
        <BreakdownCard
          context={context}
          icon="apps"
          tone="sand"
          title="Source Type"
          note="Purchases attributed to the download source"
          metrics={money}
          dimension="sourceType"
        />
        <BreakdownCard
          context={context}
          icon="store"
          tone="warm"
          title="Region"
          metrics={money}
          dimension="region"
        />
      </div>
      <StatGroup
        context={context}
        icon="download"
        tone="warm"
        title="Download to Paid"
        note="Downloads that made a first purchase in time"
        metrics={["downloadToPaid1", "downloadToPaid7", "downloadToPaid35"]}
      />
      <StatGroup
        context={context}
        icon="upload"
        tone="sand"
        title="Refunds"
        metrics={[
          "refundedProceeds",
          "refundedSales",
          "refundedPurchases",
          "proceedsRefundRate",
          "salesRefundRate",
          "purchaseRefundRate",
        ]}
      />
      <div className="an-grid">
        <BreakdownCard
          context={context}
          icon="upload"
          tone="pale"
          title="Refund Type"
          metrics={["refundedProceeds", "refundedPurchases"]}
          dimension="refundType"
        />
        <BreakdownCard
          context={context}
          icon="tag"
          tone="orange"
          title="Refunds by Product"
          metrics={["refundedProceeds", "refundedPurchases"]}
          dimension="purchase"
        />
      </div>
      <AnalyticsTable
        context={context}
        icon="store"
        tone="pale"
        title="Sales by Territory"
        note="Click a column to sort"
        dimension="territory"
        columns={[
          "proceeds",
          "sales",
          "payingUsers",
          "iap",
          "proceedsPerUser",
          "proceedsRefundRate",
        ]}
        shareOf="proceeds"
      />
    </>
  )
}

const planStateKeys = [
  "freeTrials",
  "paidOffers",
  "fullPrice",
  "preservedPrice",
  "contingentPrice",
  "gracePeriod",
  "billingRetry",
]

function PlanStateCard({ context }: { context: AnalyticsContext }) {
  const { to, scope } = context
  const rows = planStateKeys.map((key, index) => ({
    key,
    label: metric(key).label,
    color: seriesPalette[index],
    value: aggregate(key, to - 1, to, scope),
  }))
  const total = rows.reduce((sum, row) => sum + row.value, 0)
  return (
    <section className="card">
      <CardHeading
        icon="database"
        tone="pale"
        title="Plans by State"
        note={`${formatUnit("count", total, true)} subscriptions on ${fullDate(dateAt(to - 1))}`}
      />
      <div className="an-stack" role="img" aria-label="Plans by state">
        {rows.map((row) => (
          <b
            key={row.key}
            style={{
              flexGrow: row.value,
              background: row.color,
            }}
            {...context.tipProps(
              row.label,
              `${formatUnit("count", row.value, true)} · ${((row.value / total) * 100).toFixed(1)}%`,
            )}
          />
        ))}
      </div>
      <ul className="an-stack-legend">
        {rows.map((row) => (
          <li key={row.key}>
            <i style={{ background: row.color }} />
            <span>{row.label}</span>
            <strong>{formatUnit("count", row.value, true)}</strong>
            <small>{((row.value / total) * 100).toFixed(1)}%</small>
          </li>
        ))}
      </ul>
    </section>
  )
}

function SubscriptionEventsCard({ context }: { context: AnalyticsContext }) {
  const { from, to, days, scope } = context
  const [open, setOpen] = useState<string[]>(["offerStarts"])
  const line = (key: string, child: boolean) => {
    const now = aggregate(key, from, to, scope)
    const before = aggregate(key, from - days, from, scope)
    return (
      <>
        <td>
          {formatMetric(key, now, true)}
        </td>
        <td>{formatMetric(key, before, true)}</td>
        <td className={child ? "an-child-change" : ""}>
          <ChangeLabel metricKey={key} now={now} before={before} />
        </td>
      </>
    )
  }
  return (
    <section className="card an-table-card">
      <CardHeading
        icon="chart"
        tone="warm"
        title="Subscription Events"
        note="Every lifecycle event in the Subscription Event report · Expand a row for its detail"
      />
      <div className="an-table-wrap">
        <table className="an-table an-tree">
          <thead>
            <tr>
              <th>Event</th>
              <th>Selected Period</th>
              <th>Previous Period</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            {subscriptionEventTree.map((group) => {
              const expanded = open.includes(group.key)
              return (
                <Fragment key={group.key}>
                  <tr className="an-tree-parent">
                    <td>
                      <button
                        aria-expanded={expanded}
                        title={metric(group.key).definition}
                        onClick={() =>
                          setOpen(
                            expanded
                              ? open.filter((key) => key !== group.key)
                              : [...open, group.key],
                          )
                        }
                      >
                        <span className={expanded ? "open" : ""}>
                          <Icon name="chevron" size={12} />
                        </span>
                        {metric(group.key).label}
                      </button>
                    </td>
                    {line(group.key, false)}
                  </tr>
                  {expanded &&
                    group.children.map((key) => (
                      <tr key={key} className="an-tree-child">
                        <td title={metric(key).definition}>
                          {metric(key).label}
                        </td>
                        {line(key, true)}
                      </tr>
                    ))}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function SubscriptionsTab({ context }: { context: AnalyticsContext }) {
  const activity = ["activePlans", "paidPlans", "mrr", "churned"]
  return (
    <>
      <TrendSection
        context={context}
        metrics={[
          "activePlans",
          "paidPlans",
          "mrr",
          "netPaidPlans",
          "planStarts",
          "conversionToPaid",
          "churnEvents",
        ]}
      />
      <div className="an-grid">
        <PlanStateCard context={context} />
        <BreakdownCard
          context={context}
          icon="bell"
          tone="sand"
          title="Cancellation Reason"
          note="Why subscriptions churned"
          metrics={["churnEvents", "voluntaryChurns", "involuntaryChurns"]}
          dimension="cancellationReason"
        />
      </div>
      <StatGroup
        context={context}
        icon="dashboard"
        tone="pale"
        title="Conversion and Billing"
        metrics={[
          "conversionToPaid",
          "trialToPaid",
          "paidOfferToPaid",
          "billingIssue",
          "billingRecoveries",
          "suspended",
        ]}
      />
      <AnalyticsTable
        context={context}
        icon="database"
        tone="warm"
        title="Plans"
        note="Each subscription side by side · Click a column to sort"
        dimension="subscriptionName"
        columns={[
          "activePlans",
          "paidPlans",
          "mrr",
          "planStarts",
          "churnEvents",
          "conversionToPaid",
        ]}
        shareOf="mrr"
      />
      <AnalyticsTable
        context={context}
        icon="tag"
        tone="orange"
        title="Offers"
        note="Free trials, introductory, promotional and win-back offers · Click a column to sort"
        dimension="offerType"
        columns={[
          "offerStarts",
          "offerRenewals",
          "paidFromOffers",
          "conversionToPaid",
          "subscriptionOffers",
        ]}
      />
      <div className="an-grid">
        <BreakdownCard
          context={context}
          icon="tag"
          tone="pale"
          title="Offer Pricing"
          metrics={["offerStarts", "subscriptionOffers", "paidFromOffers"]}
          dimension="offerPricing"
        />
        <BreakdownCard
          context={context}
          icon="key"
          tone="sand"
          title="Subscription Duration"
          metrics={activity}
          dimension="subscriptionDuration"
        />
        <BreakdownCard
          context={context}
          icon="check"
          tone="warm"
          title="Subscription Pricing"
          metrics={activity}
          dimension="subscriptionPricing"
        />
        <BreakdownCard
          context={context}
          icon="team"
          tone="pale"
          title="Paid Tenure"
          note="How long subscribers have been paying"
          metrics={activity}
          dimension="paidTenure"
        />
        <BreakdownCard
          context={context}
          icon="upload"
          tone="sand"
          title="Plan Change Type"
          metrics={["planChanges"]}
          dimension="planChangeType"
        />
        <BreakdownCard
          context={context}
          icon="team"
          tone="orange"
          title="Family Sharing"
          metrics={activity}
          dimension="familySharing"
        />
      </div>
      <SubscriptionEventsCard context={context} />
    </>
  )
}

const cohortViews = {
  downloadToPaid: {
    title: "Download to Paid",
    note: "Share of each download cohort that has paid by day",
    columns: [1, 7, 14, 28, 35],
    base: [0.016, 0.031, 0.038, 0.044, 0.048],
    unit: "Day",
    rowsBy: "week",
    scaleMax: 0.06,
    size: "firstTimeDownloads",
    format: (value: number) => `${(value * 100).toFixed(1)}%`,
  },
  proceedsPerDownload: {
    title: "Proceeds per Download",
    note: "Cumulative proceeds per download in each cohort",
    columns: [1, 7, 14, 28, 35],
    base: [0.14, 0.31, 0.42, 0.51, 0.58],
    unit: "Day",
    rowsBy: "week",
    scaleMax: 0.7,
    size: "firstTimeDownloads",
    format: (value: number) => `$${value.toFixed(2)}`,
  },
  paidRetention: {
    title: "Paid Subscription Retention",
    note: "Share of each paid start month still subscribed",
    columns: [1, 2, 3, 6, 12],
    base: [0.86, 0.74, 0.66, 0.52, 0.38],
    unit: "Month",
    rowsBy: "month",
    scaleMax: 1,
    size: "paidStarts",
    format: (value: number) => `${(value * 100).toFixed(0)}%`,
  },
} as const

function CohortsTab({ context }: { context: AnalyticsContext }) {
  const { to, scope } = context
  const [view, setView] = useState<keyof typeof cohortViews>("downloadToPaid")
  const config = cohortViews[view]
  const count = 8
  const lastMonth = monthOrdinal(dateAt(to - 1))
  const cohorts =
    config.rowsBy === "week"
      ? weeklyCohorts(to, count)
      : Array.from({ length: count }, (_, row) => {
          const ordinal = lastMonth - (count - 1 - row)
          const year = Math.floor(ordinal / 12)
          const month = ordinal % 12
          const start = indexOfDate(new Date(year, month, 1))
          return {
            start,
            end: Math.min(
              indexOfDate(new Date(year, month + 1, 1)),
              dataLength,
            ),
            label: monthLabel(ordinal),
          }
        })
  const dayFactor = config.unit === "Day" ? 1 : 30
  return (
    <>
      <section className="card">
        <CardHeading
          icon="chart"
          tone="warm"
          title={config.title}
          note={config.note}
        >
          <select
            className="an-select an-select-small"
            aria-label="Cohort metric"
            value={view}
            onChange={(event) =>
              setView(event.target.value as keyof typeof cohortViews)
            }
          >
            {Object.entries(cohortViews).map(([key, item]) => (
              <option key={key} value={key}>
                {item.title}
              </option>
            ))}
          </select>
        </CardHeading>
        <CohortHeatmap
          context={context}
          columns={config.columns.map((value) => `${config.unit} ${value}`)}
          rows={cohorts.map((cohort) => ({
            label: cohort.label,
            size: formatUnit(
              "count",
              aggregate(config.size, cohort.start, cohort.end, scope),
            ),
          }))}
          cell={(row, column) =>
            cohorts[row].start + config.columns[column] * dayFactor < dataLength
              ? config.base[column] * cohortFactor(cohorts[row].start / 7)
              : null
          }
          format={config.format}
          scaleMax={config.scaleMax}
        />
      </section>
      <div className="an-grid">
        <RetentionCard context={context} />
        <StatGroup
          context={context}
          icon="tag"
          tone="orange"
          title="Monetization Totals"
          note="For the selected period"
          metrics={["downloadToPaid1", "downloadToPaid7", "downloadToPaid35", "proceedsPerUser"]}
        />
      </div>
    </>
  )
}

function EngagementTab({ context }: { context: AnalyticsContext }) {
  const usage = ["sessions", "activeDevices", "installations", "deletions"]
  return (
    <>
      <TrendSection
        context={context}
        metrics={[
          "sessions",
          "activeDevices",
          "active30",
          "installations",
          "deletions",
          "crashes",
          "crashRate",
        ]}
      />
      <StatGroup
        context={context}
        icon="team"
        tone="sand"
        title="Depth and Stickiness"
        metrics={[
          "sessionsPerDevice",
          "sessionDuration",
          "optInRate",
          "retention1",
          "retention7",
          "retention28",
        ]}
      />
      <div className="an-grid">
        <RetentionCard context={context} />
        <BreakdownCard
          context={context}
          icon="upload"
          tone="warm"
          title="By App Version"
          metrics={[...usage, "crashes", "crashRate"]}
          dimension="appVersion"
        />
        <BreakdownCard
          context={context}
          icon="dashboard"
          tone="pale"
          title="By Device"
          metrics={[...usage, "crashes", "crashRate"]}
          dimension="device"
        />
        <BreakdownCard
          context={context}
          icon="settings"
          tone="sand"
          title="By Platform Version"
          metrics={[...usage, "crashes", "crashRate"]}
          dimension="platformVersion"
        />
        <BreakdownCard
          context={context}
          icon="apps"
          tone="pale"
          title="By Source Type"
          note="Where active users originally came from"
          metrics={usage}
          dimension="sourceType"
        />
        <BreakdownCard
          context={context}
          icon="store"
          tone="warm"
          title="By Region"
          metrics={usage}
          dimension="region"
        />
      </div>
    </>
  )
}

const perfDeviceFactor: Record<PerfDevice, number> = {
  "All iPhones": 1,
  "All iPads": 1.12,
  Mac: 0.72,
}

function PerformanceTab({ context }: { context: AnalyticsContext }) {
  const platform = context.scope.platform
  const devices: PerfDevice[] =
    platform === "iOS" ? ["All iPhones", "All iPads"] : ["Mac"]
  const [picked, setPicked] = useState<PerfDevice>("All iPhones")
  const device = devices.includes(picked) ? picked : devices[0]
  const [percentile, setPercentile] = useState<"p50" | "p90">("p50")
  const factor = perfDeviceFactor[device]
  const format = (value: number) =>
    value >= 100 ? value.toFixed(0) : value.toFixed(2).replace(/\.?0+$/, "")
  const rows = perfMetrics.map((item) => {
    const points = item[percentile].map((value) => value * factor)
    const latest = points[points.length - 1]
    const reference = points.slice(0, -1)
    const average =
      reference.reduce((sum, value) => sum + value, 0) / reference.length
    return { ...item, points, latest, delta: (latest - average) / average }
  })
  const regressions = rows.filter((row) => row.delta >= 0.05)
  const percentileName = percentile === "p50" ? "typical (50th percentile)" : "top (90th percentile)"
  return (
    <>
      <section className="card an-table-card">
        <CardHeading
          icon="settings"
          tone="sand"
          title="Performance by App Version"
          note="Compared with the average of the previous four versions"
        >
          <div className="an-card-controls">
            <select
              className="an-select an-select-small"
              aria-label="Device"
              value={device}
              onChange={(event) => setPicked(event.target.value as PerfDevice)}
            >
              {devices.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <div className="platform-switch an-view-switch">
              {(["p50", "p90"] as const).map((item) => (
                <button
                  key={item}
                  className={percentile === item ? "active" : ""}
                  onClick={() => setPercentile(item)}
                >
                  {item === "p50" ? "Typical" : "Top"}
                </button>
              ))}
            </div>
          </div>
        </CardHeading>
        {regressions.length > 0 && (
          <ul className="an-insights">
            {regressions.map((row) => (
              <li key={row.key}>
                <span>▲ Regression</span>
                {row.label} for {percentileName} use increased{" "}
                {(row.delta * 100).toFixed(0)}% to {format(row.latest)} {row.unit}{" "}
                in {perfVersions[perfVersions.length - 1]} on {device}.
              </li>
            ))}
          </ul>
        )}
        <div className="an-table-wrap">
          <table className="an-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Category</th>
                {perfVersions.map((version) => (
                  <th key={version}>{version}</th>
                ))}
                <th>Trend</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td>{row.label}</td>
                  <td className="an-cell-muted">{row.category}</td>
                  {row.points.map((value, index) => (
                    <td key={perfVersions[index]}>
                      {format(value)}
                      {index === row.points.length - 1 && (
                        <small className="an-unit"> {row.unit}</small>
                      )}
                    </td>
                  ))}
                  <td className="an-cell-spark">
                    <Sparkline values={row.points} />
                  </td>
                  <td>
                    <span
                      className={`an-status ${row.delta >= 0.05 ? "bad" : row.delta <= -0.05 ? "good" : ""}`}
                    >
                      {row.delta >= 0.05
                        ? "▲ Regressed"
                        : row.delta <= -0.05
                          ? "▼ Improved"
                          : "Stable"}{" "}
                      {row.delta >= 0 ? "+" : ""}
                      {(row.delta * 100).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <StatGroup
        context={context}
        icon="bell"
        tone="warm"
        title="Stability"
        metrics={["crashes", "crashRate", "clipCrashes"]}
      />
    </>
  )
}

function BenchmarksTab({ context }: { context: AnalyticsContext }) {
  const { from, to, scope } = context
  const [peer, setPeer] = useState(0)
  const factor = peerGroupFactor[peer]
  return (
    <section className="card an-table-card">
      <CardHeading
        icon="team"
        tone="sand"
        title="Peer Group Benchmarks"
        note="Where Fire sits against the 25th, 50th and 75th percentile of similar apps"
      >
        <select
          className="an-select an-select-small"
          aria-label="Peer group"
          value={peer}
          onChange={(event) => setPeer(Number(event.target.value))}
        >
          {peerGroups.map((group, index) => (
            <option key={group} value={index}>
              {group}
            </option>
          ))}
        </select>
      </CardHeading>
      <div className="an-bench-legend">
        <span>
          <i className="dot" />
          Fire
        </span>
        <span>
          <i className="band" />
          25th–75th percentile
        </span>
        <span>
          <i className="tick" />
          Median
        </span>
      </div>
      <div className="an-bench">
        {benchmarkMetrics.map((item) => {
          const def = metric(item.key)
          const mine = aggregate(item.key, from, to, scope)
          const [p25, p50, p75] = [item.p25, item.p50, item.p75].map(
            (value) => value * factor,
          )
          const max = Math.max(p75 * 1.35, mine * 1.12)
          const at = (value: number) => `${(value / max) * 100}%`
          const rank =
            mine >= p75 ? 3 : mine >= p50 ? 2 : mine >= p25 ? 1 : 0
          const score = def.upIsGood ? rank : 3 - rank
          const texts = [
            "Bottom 25% of peers",
            "Worse than peer median",
            "Better than peer median",
            "Top 25% of peers",
          ]
          return (
            <div key={item.key} className="an-bench-row">
              <div>
                <span title={def.definition}>{def.label}</span>
                <strong>{formatMetric(item.key, mine)}</strong>
              </div>
              <div
                className="an-bench-track"
                {...context.tipProps(
                  def.label,
                  `Fire ${formatMetric(item.key, mine)} · 25th ${formatMetric(item.key, p25)} · Median ${formatMetric(item.key, p50)} · 75th ${formatMetric(item.key, p75)}`,
                )}
              >
                <b
                  className="band"
                  style={{ left: at(p25), width: `${((p75 - p25) / max) * 100}%` }}
                />
                <b className="tick" style={{ left: at(p50) }} />
                <b className="dot" style={{ left: at(mine) }} />
              </div>
              <span className={`an-status ${score >= 2 ? "good" : "bad"}`}>
                {score >= 2 ? "▲" : "▼"} {texts[score]}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function MetricsTab({
  context,
  initial,
}: {
  context: AnalyticsContext
  initial: string
}) {
  const { from, to, days, compare, granularity, scope } = context
  const [key, setKey] = useState(initial)
  const [groupBy, setGroupBy] = useState<DimensionKey | "">("")
  const [filterBy, setFilterBy] = useState<DimensionKey | "">("")
  const [filterValue, setFilterValue] = useState("")
  const [query, setQuery] = useState("")
  const top = useRef<HTMLElement>(null)
  const def = metric(key)
  const available = def.dims.filter(
    (dimension) =>
      !scope.filters[dimension] &&
      !(dimension === "region" && scope.filters.territory),
  )
  const group = groupBy && available.includes(groupBy) ? groupBy : null
  const filter = filterBy && available.includes(filterBy) ? filterBy : null
  const filterOptions = filter ? dimensionValues(filter, scope.platform) : []
  const activeValue =
    filter && filterOptions.includes(filterValue)
      ? filterValue
      : (filterOptions[0] ?? "")
  const scoped: Scope =
    filter && filter !== group
      ? { ...scope, filters: { ...scope.filters, [filter]: activeValue } }
      : scope
  const buckets = bucketsFor(from, to, granularity)
  const labels = bucketLabels(buckets, granularity)
  const rows = breakdown(key, group ?? "device", from, to, scoped)
  const chartRows = group ? rows.slice(0, 5) : []
  const entityColor = (name: string) => {
    if (!group) return seriesFallback
    const index = dimensionValues(group, scope.platform)
      .filter((value) => value !== (dimensions[group] as DimensionDef).unattributed)
      .indexOf(name)
    return seriesPalette[index] ?? seriesFallback
  }
  const series: ChartSeries[] = group
    ? chartRows.map((row) => ({
        label: row.name,
        tone: "line",
        color: entityColor(row.name),
        values: seriesFor(key, buckets, {
          ...scoped,
          filters: { ...scoped.filters, [group]: row.name },
        }),
      }))
    : [
        ...(compare
          ? [
              {
                label: context.previousLabel,
                tone: "previous" as const,
                values: seriesFor(
                  key,
                  buckets.map(
                    ([start, end]): Bucket => [start - days, end - days],
                  ),
                  scoped,
                ),
              },
            ]
          : []),
        {
          label: context.rangeLabel,
          tone: "primary" as const,
          values: seriesFor(key, buckets, scoped),
        },
      ]
  const matches = visibleMetrics().filter((item) =>
    `${item.label} ${item.group} ${item.report}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  )
  const counts = (report: string) =>
    visibleMetrics().filter((item) => item.report === report).length
  const now = aggregate(key, from, to, scoped)
  const before = aggregate(key, from - days, from, scoped)
  return (
    <>
      <section className="card an-explorer" ref={top}>
        <div className="an-explorer-controls">
          <label>
            <span>Metric</span>
            <select
              className="an-select"
              value={key}
              onChange={(event) => setKey(event.target.value)}
            >
              {metricGroups().map(([name, items]) => (
                <optgroup key={name} label={name}>
                  {items.map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label>
            <span>Group by</span>
            <select
              className="an-select"
              value={group ?? ""}
              onChange={(event) =>
                setGroupBy(event.target.value as DimensionKey | "")
              }
            >
              <option value="">No grouping</option>
              {available.map((dimension) => (
                <option key={dimension} value={dimension}>
                  {dimensions[dimension].label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Filter by</span>
            <select
              className="an-select"
              value={filter ?? ""}
              onChange={(event) =>
                setFilterBy(event.target.value as DimensionKey | "")
              }
            >
              <option value="">No filter</option>
              {available
                .filter((dimension) => dimension !== group)
                .map((dimension) => (
                  <option key={dimension} value={dimension}>
                    {dimensions[dimension].label}
                  </option>
                ))}
            </select>
          </label>
          {filter && filter !== group && (
            <label>
              <span>{dimensions[filter].label}</span>
              <select
                className="an-select"
                value={activeValue}
                onChange={(event) => setFilterValue(event.target.value)}
              >
                {filterOptions.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className="an-explorer-head">
          <div>
            <strong>{formatMetric(key, now)}</strong>
            <ChangeLabel metricKey={key} now={now} before={before} />
          </div>
          <p>
            {def.definition} <span>Source: {def.report === "Derived" ? "Calculated from other metrics" : `${def.report} report`}</span>
          </p>
        </div>
        <div className="an-legend an-explorer-legend">
          {series.map((item) => (
            <span key={item.label}>
              <i
                className={item.tone === "previous" ? "previous" : ""}
                style={item.color ? { background: item.color } : undefined}
              />
              {item.label}
            </span>
          ))}
        </div>
        <TrendChart
          axisLabels={labels.axis}
          tooltipLabels={labels.tooltip}
          series={series}
          format={(value) => formatMetric(key, value, true)}
          axisFormat={(value) => formatMetric(key, value)}
          label={def.label}
        />
        {group && (
          <div className="an-table-view an-explorer-table">
            <table>
              <thead>
                <tr>
                  <th>{dimensions[group].label}</th>
                  <th>{def.label}</th>
                  <th>Previous Period</th>
                  <th>Change</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.name}>
                    <td>
                      <i
                        className="an-swatch"
                        style={{ background: entityColor(row.name) }}
                      />
                      {row.name}
                    </td>
                    <td>{formatMetric(key, row.value, true)}</td>
                    <td>{formatMetric(key, row.prior, true)}</td>
                    <td>
                      <ChangeLabel
                        metricKey={key}
                        now={row.value}
                        before={row.prior}
                      />
                    </td>
                    <td>
                      {row.share === null
                        ? "—"
                        : `${(row.share * 100).toFixed(1)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="card an-table-card">
        <CardHeading
          icon="metadata"
          tone="pale"
          title="Metric Catalog"
          note={`${visibleMetrics().length} metrics · Select one to chart it`}
        >
          <input
            className="an-search"
            type="search"
            placeholder="Search metrics"
            aria-label="Search metrics"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </CardHeading>
        <div className="an-table-view an-catalog">
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Group</th>
                <th>Source</th>
                <th>Dimensions</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((item) => (
                <tr key={item.key} className={item.key === key ? "selected" : ""}>
                  <td>
                    <button
                      title={item.definition}
                      onClick={() => {
                        setKey(item.key)
                        top.current?.scrollIntoView({ behavior: "smooth" })
                      }}
                    >
                      {item.label}
                    </button>
                  </td>
                  <td>{item.group}</td>
                  <td>{item.report === "Derived" ? "Calculated" : item.report}</td>
                  <td>{item.dims.length}</td>
                </tr>
              ))}
              {matches.length === 0 && (
                <tr>
                  <td colSpan={4}>No metrics match “{query}”.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card">
        <CardHeading
          icon="key"
          tone="sand"
          title="App Store Connect API Coverage"
          note="Reports from the Analytics Reports API, available daily, weekly and monthly"
        />
        <div className="an-coverage">
          {reportCatalog.map((category) => (
            <div key={category.category}>
              <h3>{category.title}</h3>
              <code>{category.category}</code>
              <ul>
                {category.reports.map((report) => (
                  <li key={report}>
                    <span>{report}</span>
                    <small>
                      {counts(report)} {counts(report) === 1 ? "metric" : "metrics"}
                    </small>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h3>Performance</h3>
            <code>PERFORMANCE</code>
            <ul>
              <li>
                <span>perfPowerMetrics</span>
                <small>{perfMetrics.length} metrics</small>
              </li>
            </ul>
            <h3 className="an-coverage-gap">Framework Usage</h3>
            <code>FRAMEWORK_USAGE</code>
            <ul>
              <li>
                <span>Not shown yet</span>
                <small>0 metrics</small>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </>
  )
}

// ------------------------------------------------------- Custom date range

const lastIndex = dataLength - 1

const rangePresets: { title: string; range: () => [number, number] }[] = [
  { title: "Last 7 days", range: () => [dataLength - 7, dataLength] },
  { title: "Last 30 days", range: () => [dataLength - 30, dataLength] },
  { title: "Last 90 days", range: () => [dataLength - 90, dataLength] },
  { title: "Last 12 months", range: () => [dataLength - 365, dataLength] },
  {
    title: "This month",
    range: () => [
      indexOfDate(new Date(dataEnd.getFullYear(), dataEnd.getMonth(), 1)),
      dataLength,
    ],
  },
  {
    title: "Last month",
    range: () => [
      indexOfDate(new Date(dataEnd.getFullYear(), dataEnd.getMonth() - 1, 1)),
      indexOfDate(new Date(dataEnd.getFullYear(), dataEnd.getMonth(), 1)),
    ],
  },
  {
    title: "This year",
    range: () => [
      indexOfDate(new Date(dataEnd.getFullYear(), 0, 1)),
      dataLength,
    ],
  },
  {
    title: "Last year",
    range: () => [
      indexOfDate(new Date(dataEnd.getFullYear() - 1, 0, 1)),
      indexOfDate(new Date(dataEnd.getFullYear(), 0, 1)),
    ],
  },
]

const presetFor = (from: number, to: number) =>
  rangePresets.find((preset) => {
    const [start, end] = preset.range()
    return start === from && end === to
  })?.title

function parseDateInput(text: string) {
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text.trim())
  const date = iso
    ? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
    : new Date(text.trim())
  return Number.isNaN(date.getTime()) ? null : indexOfDate(date)
}

const earliestMonth = monthOrdinal(dateAt(firstSelectable))
const latestMonth = monthOrdinal(dataEnd)
const weekdayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

function DateRangePicker({
  from,
  to,
  compare,
  onApply,
  onClose,
}: {
  from: number
  to: number
  compare: boolean
  onApply: (from: number, to: number) => void
  onClose: () => void
}) {
  // Inclusive day indices; `end` is null while choosing the second date
  const [start, setStart] = useState(from)
  const [end, setEnd] = useState<number | null>(to - 1)
  const [preview, setPreview] = useState<number | null>(null)
  const [cursor, setCursor] = useState(to - 1)
  const [focusTick, setFocusTick] = useState(0)
  const [startText, setStartText] = useState<string | null>(null)
  const [endText, setEndText] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [single] = useState(() => window.innerWidth < 760)
  const span = single ? 0 : 1
  const maxView = latestMonth - span
  const [view, setView] = useState(() =>
    Math.max(
      Math.min(monthOrdinal(dateAt(to - 1)) - span, maxView),
      earliestMonth,
    ),
  )
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    panel.current
      ?.querySelector<HTMLElement>(`[data-day="${cursor}"]`)
      ?.focus()
    // Focus only follows the keyboard; the cursor alone must not steal it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusTick])

  const showMonthOf = (index: number) => {
    const ordinal = monthOrdinal(dateAt(index))
    if (ordinal < view) setView(ordinal)
    else if (ordinal > view + span) setView(ordinal - span)
  }

  const moveCursor = (index: number) => {
    const next = Math.min(Math.max(index, firstSelectable), lastIndex)
    setCursor(next)
    showMonthOf(next)
    setFocusTick((tick) => tick + 1)
    if (end === null) setPreview(next)
  }

  const shiftMonth = (months: number) => {
    const date = dateAt(cursor)
    const target = new Date(date.getFullYear(), date.getMonth() + months, 1)
    const lastDay = new Date(
      target.getFullYear(),
      target.getMonth() + 1,
      0,
    ).getDate()
    target.setDate(Math.min(date.getDate(), lastDay))
    moveCursor(indexOfDate(target))
  }

  const selectDay = (index: number) => {
    setError("")
    setStartText(null)
    setEndText(null)
    setCursor(index)
    if (end === null) {
      setStart(Math.min(start, index))
      setEnd(Math.max(start, index))
      setPreview(null)
    } else {
      setStart(index)
      setEnd(null)
      setPreview(index)
    }
  }

  const commitText = (which: "start" | "end") => {
    const text = which === "start" ? startText : endText
    if (text === null) return
    if (which === "end" && text.trim() === "" && end === null) {
      setEndText(null)
      return
    }
    const index = parseDateInput(text)
    if (index === null) {
      setError("Enter a date like Jun 23, 2025.")
      return
    }
    if (index < firstSelectable || index > lastIndex) {
      setError(
        `Data is available from ${fullDate(dateAt(firstSelectable))} through ${fullDate(dataEnd)}.`,
      )
      return
    }
    setError("")
    setStartText(null)
    setEndText(null)
    setPreview(null)
    setCursor(index)
    showMonthOf(index)
    const other = which === "start" ? end : start
    if (other === null) {
      setStart(index)
    } else {
      setStart(Math.min(index, other))
      setEnd(Math.max(index, other))
    }
  }

  const rangeEnd = end ?? preview
  const low = rangeEnd === null ? start : Math.min(start, rangeEnd)
  const high = rangeEnd === null ? start : Math.max(start, rangeEnd)
  const complete = end !== null
  const count = high - low + 1
  const activePreset = complete ? presetFor(low, high + 1) : undefined

  const renderMonth = (ordinal: number, position: number) => {
    const year = Math.floor(ordinal / 12)
    const month = ordinal % 12
    const days = new Date(year, month + 1, 0).getDate()
    const lead = new Date(year, month, 1).getDay()
    const cells: (number | null)[] = [
      ...Array.from({ length: lead }, () => null),
      ...Array.from({ length: days }, (_, day) =>
        indexOfDate(new Date(year, month, day + 1)),
      ),
    ]
    while (cells.length % 7) cells.push(null)
    const weeks = Array.from(
      { length: cells.length / 7 },
      (_, week) => cells.slice(week * 7, week * 7 + 7),
    )
    return (
      <div key={ordinal} className="an-month">
        <div className="an-month-head">
          {position === 0 && (
            <button
              className="an-month-step"
              aria-label="Previous month"
              disabled={view <= earliestMonth}
              onClick={() => setView(view - 1)}
            >
              <Icon name="chevron" size={14} />
            </button>
          )}
          <select
            aria-label={position === 0 ? "First month shown" : "Second month shown"}
            value={ordinal}
            onChange={(event) =>
              setView(
                Math.min(
                  Math.max(Number(event.target.value) - position, earliestMonth),
                  maxView,
                ),
              )
            }
          >
            {Array.from(
              { length: latestMonth - earliestMonth + 1 },
              (_, offset) => latestMonth - offset,
            ).map((value) => (
              <option key={value} value={value}>
                {monthLabel(value)}
              </option>
            ))}
          </select>
          {position === span && (
            <button
              className="an-month-step next"
              aria-label="Next month"
              disabled={view >= maxView}
              onClick={() => setView(view + 1)}
            >
              <Icon name="chevron" size={14} />
            </button>
          )}
        </div>
        <table
          role="grid"
          aria-label={monthLabel(ordinal)}
          className="an-calendar"
        >
          <thead>
            <tr>
              {weekdayNames.map((name) => (
                <th key={name} scope="col">
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week, weekIndex) => (
              <tr key={weekIndex}>
                {week.map((index, dayIndex) => {
                  if (index === null) return <td key={dayIndex} />
                  const disabled = index < firstSelectable || index > lastIndex
                  const inRange = index >= low && index <= high
                  const isStart = index === low
                  const isEnd = index === high
                  const classes = [
                    inRange ? "in-range" : "",
                    isStart ? "range-start" : "",
                    isEnd ? "range-end" : "",
                    !complete && inRange && !(isStart && index === start)
                      ? "previewing"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")
                  return (
                    <td key={index} className={classes}>
                      <button
                        data-day={index}
                        disabled={disabled}
                        tabIndex={index === cursor ? 0 : -1}
                        aria-label={fullDate(dateAt(index))}
                        aria-selected={inRange}
                        aria-current={index === lastIndex ? "date" : undefined}
                        onClick={() => selectDay(index)}
                        onPointerEnter={() => {
                          if (end === null) setPreview(index)
                        }}
                        onFocus={() => {
                          if (end === null) setPreview(index)
                        }}
                      >
                        {dateAt(index).getDate()}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div
      ref={panel}
      className="an-picker"
      role="dialog"
      aria-label="Choose a date range"
      onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Escape") {
          event.stopPropagation()
          onClose()
          return
        }
        if (
          !(event.target instanceof HTMLElement) ||
          !event.target.dataset.day
        ) {
          return
        }
        const moves: Record<string, () => void> = {
          ArrowLeft: () => moveCursor(cursor - 1),
          ArrowRight: () => moveCursor(cursor + 1),
          ArrowUp: () => moveCursor(cursor - 7),
          ArrowDown: () => moveCursor(cursor + 7),
          Home: () => moveCursor(cursor - dateAt(cursor).getDay()),
          End: () => moveCursor(cursor + 6 - dateAt(cursor).getDay()),
          PageUp: () => shiftMonth(-1),
          PageDown: () => shiftMonth(1),
        }
        const move = moves[event.key]
        if (move) {
          event.preventDefault()
          move()
        }
      }}
    >
      <div className="an-picker-body">
        <div className="an-picker-presets" role="group" aria-label="Presets">
          {rangePresets.map((preset) => (
            <button
              key={preset.title}
              className={activePreset === preset.title ? "selected" : ""}
              onClick={() => {
                const [presetFrom, presetTo] = preset.range()
                onApply(presetFrom, presetTo)
              }}
            >
              {preset.title}
              {activePreset === preset.title && (
                <Icon name="check" size={15} />
              )}
            </button>
          ))}
        </div>
        <div className="an-picker-main">
          <div className="an-picker-fields">
            <label>
              <span>Start</span>
              <input
                value={startText ?? fullDate(dateAt(complete ? low : start))}
                aria-invalid={Boolean(error) && startText !== null}
                onChange={(event) => setStartText(event.target.value)}
                onBlur={() => commitText("start")}
                onKeyDown={(event) => {
                  if (event.key === "Enter") commitText("start")
                }}
              />
            </label>
            <i aria-hidden="true">–</i>
            <label className={complete ? "" : "pending"}>
              <span>End</span>
              <input
                value={endText ?? (complete ? fullDate(dateAt(high)) : "")}
                placeholder="Select a date"
                aria-invalid={Boolean(error) && endText !== null}
                onChange={(event) => setEndText(event.target.value)}
                onBlur={() => commitText("end")}
                onKeyDown={(event) => {
                  if (event.key === "Enter") commitText("end")
                }}
              />
            </label>
          </div>
          <div
            className="an-months"
            onPointerLeave={() => {
              if (end === null) setPreview(null)
            }}
          >
            {Array.from({ length: span + 1 }, (_, position) =>
              renderMonth(view + position, position),
            )}
          </div>
        </div>
      </div>
      <div className="an-picker-footer">
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : complete ? (
          <p>
            <strong>{dayCount(count)}</strong>
            {compare && (
              <>
                {" · Compared with "}
                {rangeText(low - count, low)}
              </>
            )}
          </p>
        ) : (
          <p>Select an end date. Data runs through {shortDate(dataEnd)}.</p>
        )}
        <div className="an-picker-actions">
          <button onClick={onClose}>Cancel</button>
          <button
            className="primary"
            disabled={!complete || Boolean(error)}
            onClick={() => onApply(low, high + 1)}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}

const granularityFor = (days: number): Granularity =>
  days <= 92 ? "day" : days <= 366 ? "week" : "month"

function AnalyticsPage({ notify }: { notify: (message: string) => void }) {
  const [tab, setTab] = useState<AnalyticsTab>("Overview")
  const [explorerMetric, setExplorerMetric] = useState("downloads")
  const [platform, setPlatform] = useState<Platform>("iOS")
  const [range, setRange] = useState<[number, number]>([
    dataLength - 30,
    dataLength,
  ])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [territory, setTerritory] = useState("")
  const [device, setDevice] = useState("")
  const [compare, setCompare] = useState(true)
  const [granularity, setGranularity] = useState<Granularity>("day")
  const [tip, setTip] = useState<{
    x: number
    y: number
    value: string
    label: string
  } | null>(null)
  const pickerRoot = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!pickerOpen) return
    const dismiss = (event: PointerEvent) => {
      if (!pickerRoot.current?.contains(event.target as Node)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener("pointerdown", dismiss)
    return () => document.removeEventListener("pointerdown", dismiss)
  }, [pickerOpen])

  const [from, to] = range
  const days = to - from
  const preset = presetFor(from, to)
  const rangeLabel = preset ?? rangeText(from, to)
  const scope: Scope = {
    platform,
    filters: {
      ...(territory ? { territory } : {}),
      ...(device ? { device } : {}),
    },
  }
  const context: AnalyticsContext = {
    from,
    to,
    days,
    compare,
    granularity,
    scope,
    rangeLabel,
    previousLabel: `Previous ${dayCount(days)}`,
    openMetric: (key) => {
      setExplorerMetric(key)
      setTab("Metrics")
    },
    tipProps: (label, value) => ({
      tabIndex: 0,
      onPointerMove: (event) =>
        setTip({ x: event.clientX, y: event.clientY, label, value }),
      onPointerLeave: () => setTip(null),
      onFocus: (event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        setTip({ x: rect.left + rect.width / 2, y: rect.top, label, value })
      },
      onBlur: () => setTip(null),
    }),
  }
  const regions = [
    ...new Set(dimensions.territory.values.map((item) => item.region)),
  ]

  return (
    <div className="review-workspace builds-workspace an-workspace">
      <div className="review-heading">
        <div>
          <span className="card-icon warm">
            <Icon name="chart" size={20} />
          </span>
          <div>
            <h1>Analytics</h1>
          </div>
        </div>
        <div className="builds-toolbar">
          <div className="platform-switch">
            {(["iOS", "macOS"] as const).map((item) => (
              <button
                key={item}
                className={platform === item ? "active" : ""}
                onClick={() => {
                  setPlatform(item)
                  setDevice("")
                }}
              >
                {item}
              </button>
            ))}
          </div>
          <button
            className="quiet-button"
            onClick={() => notify(`${tab} analytics exported as CSV`)}
          >
            <Icon name="download" size={14} />
            Export
          </button>
        </div>
      </div>

      <div className="an-tabs" role="tablist" aria-label="Analytics sections">
        {analyticsTabs.map((item) => (
          <button
            key={item}
            role="tab"
            aria-selected={tab === item}
            className={tab === item ? "active" : ""}
            onClick={() => {
              setTip(null)
              setTab(item)
            }}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="an-filters">
        <div className="an-range" ref={pickerRoot}>
          <button
            ref={trigger}
            className={`an-filter-button ${pickerOpen ? "open" : ""}`}
            aria-haspopup="dialog"
            aria-expanded={pickerOpen}
            onClick={() => setPickerOpen(!pickerOpen)}
          >
            <Icon name="calendar" size={15} />
            {preset ? (
              <>
                <strong>{preset}</strong>
                <span>{rangeText(from, to)}</span>
              </>
            ) : (
              <>
                <strong>{rangeText(from, to)}</strong>
                <span>{dayCount(days)}</span>
              </>
            )}
            <Icon name="chevron" size={13} />
          </button>
          {pickerOpen && (
            <DateRangePicker
              from={from}
              to={to}
              compare={compare}
              onClose={() => {
                setPickerOpen(false)
                trigger.current?.focus()
              }}
              onApply={(nextFrom, nextTo) => {
                setRange([nextFrom, nextTo])
                setGranularity(granularityFor(nextTo - nextFrom))
                setPickerOpen(false)
                trigger.current?.focus()
              }}
            />
          )}
        </div>
        <select
          className="an-select"
          aria-label="Territory"
          value={territory}
          onChange={(event) => setTerritory(event.target.value)}
        >
          <option value="">All Territories</option>
          {regions.map((region) => (
            <optgroup key={region} label={region}>
              {dimensions.territory.values
                .filter((item) => item.region === region)
                .map((item) => (
                  <option key={item.name}>{item.name}</option>
                ))}
            </optgroup>
          ))}
        </select>
        <select
          className="an-select"
          aria-label="Device"
          value={device}
          onChange={(event) => setDevice(event.target.value)}
        >
          <option value="">All Devices</option>
          {dimensionValues("device", platform).map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <div
          className="platform-switch an-view-switch an-granularity"
          role="group"
          aria-label="Chart interval"
        >
          {(["day", "week", "month"] as const).map((item) => (
            <button
              key={item}
              className={granularity === item ? "active" : ""}
              disabled={item === "month" && days < 32}
              onClick={() => setGranularity(item)}
            >
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>
        <label className="an-compare">
          <button
            className={`iap-toggle ${compare ? "on" : ""}`}
            role="switch"
            aria-checked={compare}
            aria-label="Compare with previous period"
            onClick={() => setCompare(!compare)}
          >
            <span />
          </button>
          Compare with previous period
        </label>
        <span className="an-updated">
          Data through {shortDate(dataEnd)} · Updated 2h ago
        </span>
      </div>

      {tab === "Overview" && <OverviewTab context={context} />}
      {tab === "Acquisition" && <AcquisitionTab context={context} />}
      {tab === "App Store Features" && <FeaturesTab context={context} />}
      {tab === "Sales" && <SalesTab context={context} />}
      {tab === "Subscriptions" && <SubscriptionsTab context={context} />}
      {tab === "Cohorts" && <CohortsTab context={context} />}
      {tab === "Engagement" && <EngagementTab context={context} />}
      {tab === "Performance" && <PerformanceTab context={context} />}
      {tab === "Benchmarks" && <BenchmarksTab context={context} />}
      {tab === "Metrics" && (
        <MetricsTab
          key={explorerMetric}
          context={context}
          initial={explorerMetric}
        />
      )}

      {tip && (
        <div className="an-float-tip" style={{ left: tip.x, top: tip.y }}>
          <strong>{tip.value}</strong>
          <span>{tip.label}</span>
        </div>
      )}
    </div>
  )
}

function EmptyPage({ title }: { title: string }) {
  return (
    <div className="empty-page">
      <span className="card-icon warm">
        <Icon name={title === "Analytics" ? "chart" : "apps"} size={24} />
      </span>
      <h1>{title}</h1>
      <p>The Fire {title} workspace is ready.</p>
    </div>
  )
}

const profileTones = {
  Sand: { background: "#f1c59e", color: "#81411f" },
  Orange: { background: "#fde0d1", color: "#b7451e" },
  Blue: { background: "#d9e8fa", color: "#1f5fb0" },
  Green: { background: "#d6f0e1", color: "#1e7045" },
  Violet: { background: "#e4e0fb", color: "#4f3fc0" },
  Rose: { background: "#fbdfe9", color: "#b02a62" },
  Graphite: { background: "#e6e3df", color: "#4e4944" },
}

type ProfileTone = keyof typeof profileTones
type ProfileSymbol = "initials" | IconName
type ProfileGlyph = ProfileSymbol | "image"

const profileGlyphs: [ProfileSymbol, string][] = [
  ["initials", "Initials"],
  ["store", "Store"],
  ["apps", "Apps"],
  ["team", "Team"],
  ["tag", "Tag"],
  ["cloud", "Cloud"],
  ["chart", "Chart"],
  ["globe", "Globe"],
]

type ApiProfile = {
  id: string
  name: string
  glyph: ProfileGlyph
  tone: ProfileTone
  // Data URL of an uploaded icon, used when glyph is "image"
  image?: string
  team: string
  apps: number
  keyType: "team" | "individual"
  keyId: string
  issuerId?: string
  // Only the file name is kept; the key's contents are never read here
  keyFile: string
}

const seedProfiles: ApiProfile[] = [
  {
    id: "acme",
    name: "Alex Lin",
    glyph: "initials",
    tone: "Sand",
    team: "Acme Studio",
    apps: 8,
    keyType: "team",
    keyId: "7XK2M9QPLA",
    issuerId: "69a6de70-03db-47e3-e053-5b8c7c11a4d1",
    keyFile: "AuthKey_7XK2M9QPLA.p8",
  },
  {
    id: "northwind",
    name: "Northwind Apps",
    glyph: "store",
    tone: "Blue",
    team: "Northwind Apps",
    apps: 2,
    keyType: "individual",
    keyId: "R4T8N2WZ6C",
    keyFile: "AuthKey_R4T8N2WZ6C.p8",
  },
]

const profileInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("")

const profileImageTypes = ["image/png", "image/jpeg", "image/webp"]
const profileImageMaxBytes = 2 * 1024 * 1024

// Resolves with a data URL, or rejects with a message the dialog can show
function readProfileImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    if (!profileImageTypes.includes(file.type)) {
      reject(new Error("Choose a PNG, JPEG or WebP image."))
      return
    }
    if (file.size > profileImageMaxBytes) {
      reject(new Error("Choose an image of 2 MB or less."))
      return
    }
    const unreadable = () => reject(new Error("This image couldn't be read."))
    const reader = new FileReader()
    reader.onerror = unreadable
    reader.onload = () => {
      const url = String(reader.result)
      // Decode it now so a damaged file can't become a broken avatar
      const image = new Image()
      image.onload = () => resolve(url)
      image.onerror = unreadable
      image.src = url
    }
    reader.readAsDataURL(file)
  })
}

const profileIconStyle = (tone: ProfileTone, glyph: ProfileGlyph) =>
  glyph === "image" ? { background: "#fff" } : profileTones[tone]

function ProfileGlyphMark({
  name,
  glyph,
  image,
  size = 15,
}: {
  name: string
  glyph: ProfileGlyph
  image?: string
  size?: number
}) {
  if (glyph === "image") return <img src={image} alt="" />
  return glyph === "initials" ? (
    <>{profileInitials(name) || "?"}</>
  ) : (
    <Icon name={glyph} size={size} />
  )
}

function AddProfileDialog({
  profiles,
  onAdd,
  onClose,
}: {
  profiles: ApiProfile[]
  onAdd: (profile: ApiProfile) => void
  onClose: () => void
}) {
  const [name, setName] = useState("")
  const [glyph, setGlyph] = useState<ProfileGlyph>("initials")
  const [tone, setTone] = useState<ProfileTone>("Sand")
  const [image, setImage] = useState("")
  const [imageName, setImageName] = useState("")
  const [imageError, setImageError] = useState("")
  const [keyType, setKeyType] = useState<ApiProfile["keyType"]>("team")
  const [issuerId, setIssuerId] = useState("")
  const [keyId, setKeyId] = useState("")
  const [keyFile, setKeyFile] = useState("")
  const [fileError, setFileError] = useState("")
  const [dragging, setDragging] = useState(false)
  const [attempted, setAttempted] = useState(false)
  const nameInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameInput.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", closeOnEscape)
    return () => document.removeEventListener("keydown", closeOnEscape)
    // The dialog only needs this once, for as long as it is open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const chooseImage = async (file: File | undefined) => {
    if (!file) return
    try {
      setImage(await readProfileImage(file))
      setImageName(file.name)
      setImageError("")
      setGlyph("image")
    } catch (error) {
      setImageError((error as Error).message)
    }
  }

  const removeImage = () => {
    setImage("")
    setImageName("")
    setImageError("")
    if (glyph === "image") setGlyph("initials")
  }

  const chooseFile = (file: File | undefined) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith(".p8")) {
      setKeyFile("")
      setFileError("Choose the .p8 file you downloaded from App Store Connect.")
      return
    }
    setFileError("")
    setKeyFile(file.name)
    // Apple names the download AuthKey_<KEY ID>.p8
    const match = /^AuthKey_([A-Za-z0-9]{10})\.p8$/i.exec(file.name)
    if (match && !keyId) setKeyId(match[1].toUpperCase())
  }

  const trimmedName = name.trim()
  const trimmedIssuer = issuerId.trim()
  const errors = {
    name: !trimmedName
      ? "Enter a profile name."
      : profiles.some(
            (item) => item.name.toLowerCase() === trimmedName.toLowerCase(),
          )
        ? "A profile with this name already exists."
        : "",
    issuerId:
      keyType === "team" &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        trimmedIssuer,
      )
        ? "Enter the Issuer ID shown above your team keys."
        : "",
    keyId: !/^[A-Z0-9]{10}$/.test(keyId)
      ? "Key IDs have 10 letters and numbers."
      : profiles.some((item) => item.keyId === keyId)
        ? "This API key is already in another profile."
        : "",
    keyFile: keyFile ? "" : fileError || "Choose the private key file.",
  }
  const invalid = Object.values(errors).some(Boolean)
  const show = (error: string) =>
    attempted && error ? (
      <small className="profile-field-error">{error}</small>
    ) : null

  const submit = () => {
    setAttempted(true)
    if (invalid) return
    onAdd({
      id: `profile-${keyId}`,
      name: trimmedName,
      glyph,
      tone,
      image: glyph === "image" ? image : undefined,
      team: trimmedName,
      apps: 0,
      keyType,
      keyId,
      issuerId: keyType === "team" ? trimmedIssuer : undefined,
      keyFile,
    })
  }

  return (
    <div
      className="attachment-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <form
        className="attachment-modal profile-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-profile-title"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <div className="attachment-modal-head">
          <div>
            <h2 id="add-profile-title">Add Profile</h2>
            <p>Connect another App Store Connect API key</p>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close add profile"
          >
            ×
          </button>
        </div>

        <div className="profile-form">
          <p className="profile-form-hint">
            Create keys in App Store Connect under Users and Access, then
            Integrations. Apple lets you download a private key only once.
          </p>
          <label>
            <span>Profile Name</span>
            <input
              ref={nameInput}
              value={name}
              placeholder="Acme Studio"
              aria-invalid={attempted && Boolean(errors.name)}
              onChange={(event) => setName(event.target.value)}
            />
            {show(errors.name)}
          </label>
          <div className="profile-field">
            <span>Icon</span>
            <div className="profile-icon-setting">
              <i
                className="profile-icon-preview"
                style={profileIconStyle(tone, glyph)}
                aria-hidden="true"
              >
                <ProfileGlyphMark
                  name={name}
                  glyph={glyph}
                  image={image}
                  size={24}
                />
              </i>
              <div>
                <div
                  className="profile-glyphs"
                  role="group"
                  aria-label="Icon symbol"
                >
                  {profileGlyphs.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      title={label}
                      aria-label={label}
                      aria-pressed={glyph === value}
                      className={glyph === value ? "selected" : ""}
                      onClick={() => setGlyph(value)}
                    >
                      {value === "initials" ? (
                        "Aa"
                      ) : (
                        <Icon name={value} size={16} />
                      )}
                    </button>
                  ))}
                  {image ? (
                    <button
                      type="button"
                      title={imageName}
                      aria-label={`Uploaded image, ${imageName}`}
                      aria-pressed={glyph === "image"}
                      className={`profile-glyph-image ${glyph === "image" ? "selected" : ""}`}
                      onClick={() => setGlyph("image")}
                    >
                      <img src={image} alt="" />
                    </button>
                  ) : (
                    <label className="profile-glyph-upload" title="Upload image">
                      <input
                        type="file"
                        aria-label="Upload image"
                        accept={profileImageTypes.join(",")}
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
                  <div
                    className="profile-tones"
                    role="group"
                    aria-label="Icon color"
                  >
                    {(Object.keys(profileTones) as ProfileTone[]).map(
                      (value) => (
                        <button
                          key={value}
                          type="button"
                          title={value}
                          aria-label={value}
                          aria-pressed={tone === value}
                          className={tone === value ? "selected" : ""}
                          style={profileTones[value]}
                          onClick={() => setTone(value)}
                        >
                          {tone === value && <Icon name="check" size={13} />}
                        </button>
                      ),
                    )}
                  </div>
                )}
                {image ? (
                  <div className="profile-image-file">
                    <span title={imageName}>{imageName}</span>
                    <button type="button" onClick={removeImage}>
                      Remove
                    </button>
                  </div>
                ) : (
                  <small className="profile-image-hint">
                    Upload a PNG, JPEG or WebP of up to 2 MB. Square images
                    work best.
                  </small>
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
            <span id="profile-key-type">Key Type</span>
            <div
              className="platform-switch"
              role="group"
              aria-labelledby="profile-key-type"
            >
              {(["team", "individual"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={keyType === item ? "active" : ""}
                  aria-pressed={keyType === item}
                  onClick={() => setKeyType(item)}
                >
                  {item === "team" ? "Team" : "Individual"}
                </button>
              ))}
            </div>
          </div>
          {keyType === "team" && (
            <label>
              <span>Issuer ID</span>
              <input
                className="profile-mono"
                value={issuerId}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                spellCheck={false}
                autoComplete="off"
                aria-invalid={attempted && Boolean(errors.issuerId)}
                onChange={(event) => setIssuerId(event.target.value)}
              />
              {show(errors.issuerId)}
            </label>
          )}
          <label>
            <span>Key ID</span>
            <input
              className="profile-mono"
              value={keyId}
              placeholder="10 characters"
              maxLength={10}
              spellCheck={false}
              autoComplete="off"
              aria-invalid={attempted && Boolean(errors.keyId)}
              onChange={(event) =>
                setKeyId(event.target.value.trim().toUpperCase())
              }
            />
            {show(errors.keyId)}
          </label>
          <div className="profile-field">
            <span>Private Key</span>
            {keyFile ? (
              <div className="profile-file">
                <Icon name="key" size={16} />
                <strong>{keyFile}</strong>
                <button type="button" onClick={() => setKeyFile("")}>
                  Remove
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
                  chooseFile(event.dataTransfer.files[0])
                }}
              >
                <input
                  type="file"
                  accept=".p8"
                  onChange={(event) => {
                    chooseFile(event.target.files?.[0])
                    event.target.value = ""
                  }}
                />
                <Icon name="upload" size={17} />
                <strong>Choose a .p8 file</strong>
                <small>or drop it here</small>
              </label>
            )}
            {fileError && !attempted ? (
              <small className="profile-field-error">{fileError}</small>
            ) : (
              show(errors.keyFile)
            )}
          </div>
        </div>

        <div className="iap-modal-footer">
          <span>The new profile becomes active after you add it.</span>
          <div>
            <button type="button" className="quiet-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="accent-button">
              Add Profile
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

const uiLanguages = [
  { code: "en", name: "English" },
  { code: "zh-Hans", name: "简体中文" },
  { code: "zh-Hant", name: "繁體中文" },
  { code: "ja", name: "日本語" },
] as const

type UiLanguage = (typeof uiLanguages)[number]["code"]
type Translate = (text: string) => string

// Sidebar and profile menu text, keyed by the English source string
const shellText: Record<Exclude<UiLanguage, "en">, Record<string, string>> = {
  "zh-Hans": {
    "App Store Manager": "App Store 管理器",
    Workspace: "工作区",
    Management: "管理",
    Settings: "设置",
    Language: "语言",
    Dashboard: "仪表板",
    Metadata: "元数据",
    "App Review": "App 审核",
    Builds: "构建版本",
    "In-App Purchases": "App 内购买项目",
    Analytics: "分析",
    "Users & Access": "用户和访问",
    "API connected": "API 已连接",
    "Switch Profile": "切换配置文件",
    "Add Profile": "添加配置文件",
    "Connect another API key": "连接其他 API 密钥",
    "Team key": "团队密钥",
    "Individual key": "个人密钥",
    app: "个 App",
    apps: "个 App",
  },
  "zh-Hant": {
    "App Store Manager": "App Store 管理器",
    Workspace: "工作區",
    Management: "管理",
    Settings: "設定",
    Language: "語言",
    Dashboard: "儀表板",
    Metadata: "中繼資料",
    "App Review": "App 審查",
    Builds: "建置版本",
    "In-App Purchases": "App 內購買項目",
    Analytics: "分析",
    "Users & Access": "使用者與存取權",
    "API connected": "API 已連線",
    "Switch Profile": "切換設定檔",
    "Add Profile": "新增設定檔",
    "Connect another API key": "連接其他 API 金鑰",
    "Team key": "團隊金鑰",
    "Individual key": "個人金鑰",
    app: "個 App",
    apps: "個 App",
  },
  ja: {
    "App Store Manager": "App Store マネージャー",
    Workspace: "ワークスペース",
    Management: "管理",
    Settings: "設定",
    Language: "言語",
    Dashboard: "ダッシュボード",
    Metadata: "メタデータ",
    "App Review": "App審査",
    Builds: "ビルド",
    "In-App Purchases": "App内課金",
    Analytics: "アナリティクス",
    "Users & Access": "ユーザとアクセス",
    "API connected": "API接続済み",
    "Switch Profile": "プロファイルを切り替え",
    "Add Profile": "プロファイルを追加",
    "Connect another API key": "別のAPIキーを接続",
    "Team key": "チームキー",
    "Individual key": "個人キー",
    app: "個のアプリ",
    apps: "個のアプリ",
  },
}

const uiLanguageKey = "fire.uiLanguage"

function savedUiLanguage(): UiLanguage {
  try {
    const saved = window.localStorage.getItem(uiLanguageKey)
    return uiLanguages.find((item) => item.code === saved)?.code ?? "en"
  } catch {
    return "en"
  }
}

function moveMenuFocus(menu: HTMLElement | null, step: number) {
  const items = [...(menu?.querySelectorAll<HTMLElement>("button") ?? [])]
  const index = items.indexOf(document.activeElement as HTMLElement)
  items[(index + step + items.length) % items.length]?.focus()
}

// Renders as direct children of the nav so the row keeps the nav item styling
function LanguagePicker({
  value,
  onChange,
  t,
}: {
  value: UiLanguage
  onChange: (code: UiLanguage) => void
  t: Translate
}) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const current = uiLanguages.find((item) => item.code === value)

  useEffect(() => {
    if (!open) return
    menu.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus()
    const dismiss = (event: PointerEvent) => {
      const target = event.target as Element
      if (!target.closest('[data-menu-root="language"]')) setOpen(false)
    }
    document.addEventListener("pointerdown", dismiss)
    return () => document.removeEventListener("pointerdown", dismiss)
  }, [open])

  const closeMenu = () => {
    setOpen(false)
    trigger.current?.focus()
  }

  return (
    <>
      <button
        ref={trigger}
        data-menu-root="language"
        className={open ? "menu-open" : ""}
        aria-label={`${t("Language")}: ${current?.name}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Icon name="globe" />
        <span>{t("Language")}</span>
        <span className="nav-value">{current?.name}</span>
      </button>
      {open && (
        <div
          ref={menu}
          data-menu-root="language"
          className="language-menu"
          role="menu"
          aria-label={t("Language")}
          onKeyDown={(event) => {
            if (event.key === "Escape") closeMenu()
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault()
              moveMenuFocus(menu.current, event.key === "ArrowDown" ? 1 : -1)
            }
          }}
        >
          {uiLanguages.map((item) => (
            <button
              key={item.code}
              lang={item.code}
              role="menuitemradio"
              aria-checked={item.code === value}
              className={item.code === value ? "selected" : ""}
              onClick={() => {
                onChange(item.code)
                closeMenu()
              }}
            >
              {item.name}
              {item.code === value && <Icon name="check" size={15} />}
            </button>
          ))}
        </div>
      )}
    </>
  )
}

function ProfileSwitcher({
  profiles,
  activeId,
  onSwitch,
  onAdd,
  t,
}: {
  profiles: ApiProfile[]
  activeId: string
  onSwitch: (id: string) => void
  onAdd: (profile: ApiProfile) => void
  t: Translate
}) {
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const area = useRef<HTMLDivElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const moreButton = useRef<HTMLButtonElement>(null)
  const current = profiles.find((item) => item.id === activeId) ?? profiles[0]

  useEffect(() => {
    if (!open) return
    menu.current
      ?.querySelector<HTMLElement>('[aria-checked="true"]')
      ?.focus()
    const dismiss = (event: PointerEvent) => {
      if (!area.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", dismiss)
    return () => document.removeEventListener("pointerdown", dismiss)
  }, [open])

  const closeMenu = () => {
    setOpen(false)
    moreButton.current?.focus()
  }

  return (
    <>
      <div className="profile-area" ref={area}>
        {open && (
          <div
            ref={menu}
            className="profile-menu"
            role="menu"
            aria-label="Profiles"
            onKeyDown={(event) => {
              if (event.key === "Escape") closeMenu()
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault()
                moveMenuFocus(menu.current, event.key === "ArrowDown" ? 1 : -1)
              }
            }}
          >
            <p>{t("Switch Profile")}</p>
            <div className="profile-menu-list">
              {profiles.map((item) => (
                <button
                  key={item.id}
                  role="menuitemradio"
                  aria-checked={item.id === current.id}
                  className={item.id === current.id ? "selected" : ""}
                  onClick={() => {
                    closeMenu()
                    if (item.id !== current.id) onSwitch(item.id)
                  }}
                >
                  <i
                    className="profile-menu-avatar"
                    style={profileIconStyle(item.tone, item.glyph)}
                  >
                    <ProfileGlyphMark
                      name={item.name}
                      glyph={item.glyph}
                      image={item.image}
                    />
                  </i>
                  <span>
                    <strong>{item.name}</strong>
                    <small>
                      {t(item.keyType === "team" ? "Team key" : "Individual key")}{" "}
                      · {item.keyId}
                    </small>
                  </span>
                  {item.id === current.id && <Icon name="check" size={15} />}
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
                <strong>{t("Add Profile")}</strong>
                <small>{t("Connect another API key")}</small>
              </span>
            </button>
          </div>
        )}
        <div className="profile">
          <button
            className="profile-avatar"
            aria-label="Open profile menu"
            aria-haspopup="menu"
            aria-expanded={open}
            style={profileIconStyle(current.tone, current.glyph)}
            onClick={() => setOpen(!open)}
          >
            <ProfileGlyphMark
              name={current.name}
              glyph={current.glyph}
              image={current.image}
            />
          </button>
          <div>
            <strong title={current.name}>{current.name}</strong>
            <span>
              <i /> {t("API connected")}
            </span>
          </div>
          <button
            ref={moreButton}
            className={`profile-more ${open ? "open" : ""}`}
            aria-label="Open profile menu"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <Icon name="more" />
          </button>
        </div>
      </div>
      {adding && (
        <AddProfileDialog
          profiles={profiles}
          onClose={() => {
            setAdding(false)
            moreButton.current?.focus()
          }}
          onAdd={(profile) => {
            setAdding(false)
            moreButton.current?.focus()
            onAdd(profile)
          }}
        />
      )}
    </>
  )
}

export default function App() {
  const [active, setActive] = useState("Metadata")
  const [profiles, setProfiles] = useState(seedProfiles)
  const [profileId, setProfileId] = useState(seedProfiles[0].id)
  const [uiLanguage, setUiLanguage] = useState(savedUiLanguage)
  const [toast, setToast] = useState("")
  const [language, setLanguage] = useState("English")
  const [localeMenu, setLocaleMenu] = useState(false)
  const [build, setBuild] = useState("1.0.1")
  const [buildMenu, setBuildMenu] = useState(false)
  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(""), 2400)
  }
  const currentProfile =
    profiles.find((item) => item.id === profileId) ?? profiles[0]
  const t: Translate = (text) =>
    uiLanguage === "en" ? text : (shellText[uiLanguage][text] ?? text)

  useEffect(() => {
    document.documentElement.lang = uiLanguage
    try {
      window.localStorage.setItem(uiLanguageKey, uiLanguage)
    } catch {
      // The choice still applies for this visit when storage is unavailable
    }
  }, [uiLanguage])

  return (
    <div className="stage">
      <div className="app-window">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-symbol">F</div>
            <div>
              <strong>Fire</strong>
              <span>{t("App Store Manager")}</span>
            </div>
          </div>
          <button className="account-switch">
            <span className="account-icon">
              <Icon name="store" size={16} />
            </span>
            <span>
              <strong>{currentProfile.team}</strong>
              <small>
                {currentProfile.apps}{" "}
                {t(currentProfile.apps === 1 ? "app" : "apps")}
              </small>
            </span>
            <Icon name="chevron" size={14} />
          </button>
          <nav>
            <p>{t("Workspace")}</p>
            {navigation.slice(0, 6).map(([label, icon]) => (
              <button
                key={label}
                className={active === label ? "active" : ""}
                onClick={() => setActive(label)}
              >
                <Icon name={icon} />
                <span>{t(label)}</span>
              </button>
            ))}
            <p>{t("Management")}</p>
            {navigation.slice(6).map(([label, icon]) => (
              <button
                key={label}
                className={active === label ? "active" : ""}
                onClick={() => setActive(label)}
              >
                <Icon name={icon} />
                <span>{t(label)}</span>
              </button>
            ))}
            <p>{t("Settings")}</p>
            <LanguagePicker
              value={uiLanguage}
              onChange={setUiLanguage}
              t={t}
            />
          </nav>
          <ProfileSwitcher
            t={t}
            profiles={profiles}
            activeId={currentProfile.id}
            onSwitch={(id) => {
              setProfileId(id)
              notify(
                `Switched to ${profiles.find((item) => item.id === id)?.name}`,
              )
            }}
            onAdd={(profile) => {
              setProfiles([...profiles, profile])
              setProfileId(profile.id)
              notify(`Added ${profile.name} and switched to it`)
            }}
          />
        </aside>

        <main>
          {active === "Metadata" && (
            <div className="metadata-page-top">
              <div className="review-heading metadata-page-heading">
                <div>
                  <span className="card-icon warm">
                    <Icon name="metadata" size={20} />
                  </span>
                  <div>
                    <h1>Metadata</h1>
                  </div>
                </div>
                <div className="metadata-toolbar">
                  <div className="build-status">
                    <div className="build-picker">
                      <span>Version</span>
                      <button onClick={() => setBuildMenu(!buildMenu)}>
                        {build}
                        <Icon name="chevron" size={13} />
                      </button>
                      {buildMenu && (
                        <div className="build-menu">
                          <span>Select Version</span>
                          {["1.0.1", "1.0.0", "0.9.2"].map((item) => (
                            <button
                              key={item}
                              className={build === item ? "selected" : ""}
                              onClick={() => {
                                setBuild(item)
                                setBuildMenu(false)
                                notify(`Switched to version ${item}`)
                              }}
                            >
                              <strong>{item}</strong>
                              {build === item && (
                                <Icon name="check" size={13} />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="top-status">
                      <span>Status</span>
                      <strong>
                        <i />
                        Prepare for Submission
                      </strong>
                    </div>
                  </div>
                  <div className="top-actions">
                    {active === "Metadata" && (
                      <>
                        <div className="locale-picker">
                          <button
                            className="date-button locale-button"
                            onClick={() => setLocaleMenu(!localeMenu)}
                          >
                            <span className="locale-symbol">
                              {language === "Simplified Chinese"
                                ? "ZH"
                                : language === "English"
                                  ? "EN"
                                  : language === "Japanese"
                                    ? "JP"
                                    : "ZH-TW"}
                            </span>
                            {language}
                            <Icon name="chevron" size={13} />
                          </button>
                          {localeMenu && (
                            <div className="locale-menu">
                              <div className="locale-menu-head">
                                <strong>Localization</strong>
                                <span>4 regions</span>
                              </div>
                              {languages.map(([title, region, progress]) => (
                                <button
                                  key={title}
                                  className={
                                    language === title ? "selected" : ""
                                  }
                                  onClick={() => {
                                    setLanguage(title)
                                    setLocaleMenu(false)
                                    notify(`Switched to ${title}`)
                                  }}
                                >
                                  <span className="locale-symbol">
                                    {title === "Simplified Chinese"
                                      ? "ZH"
                                      : title === "English"
                                        ? "EN"
                                        : title === "Japanese"
                                          ? "JP"
                                          : "ZH-TW"}
                                  </span>
                                  <span>
                                    <strong>{title}</strong>
                                    <small>{region}</small>
                                  </span>
                                  <small>{progress}</small>
                                  {language === title && (
                                    <Icon name="check" size={13} />
                                  )}
                                </button>
                              ))}
                              <button
                                className="add-locale"
                                onClick={() =>
                                  notify("New localization created")
                                }
                              >
                                <Icon name="plus" size={13} />
                                Add Localization
                              </button>
                            </div>
                          )}
                        </div>
                        <button
                          className="quiet-button toolbar-quiet"
                          onClick={() =>
                            notify("Saved and synced with App Store Connect")
                          }
                        >
                          <Icon name="cloud" size={14} />
                          Save & Sync
                        </button>
                        <button
                          className="accent-button toolbar-publish"
                          onClick={() => notify("All changes published")}
                        >
                          <Icon name="upload" size={14} />
                          Publish Changes
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          {active === "Metadata" ? (
            <MetadataPage notify={notify} />
          ) : active === "App Review" ? (
            <ReviewPage notify={notify} />
          ) : active === "Builds" ? (
            <BuildsPage notify={notify} />
          ) : active === "In-App Purchases" ? (
            <PurchasesPage notify={notify} />
          ) : active === "Analytics" ? (
            <AnalyticsPage notify={notify} />
          ) : (
            <EmptyPage title={active} />
          )}
        </main>
      </div>
      {toast && (
        <div className="toast">
          <span>
            <Icon name="check" size={13} />
          </span>
          {toast}
        </div>
      )}
    </div>
  )
}
