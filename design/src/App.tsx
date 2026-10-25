import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type FocusEvent as ReactFocusEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react"

type IconName = "apps" | "bell" | "chart" | "check" | "chevron" | "cloud" | "dashboard" | "database" | "download" | "key" | "metadata" | "more" | "plus" | "search" | "settings" | "store" | "tag" | "team" | "upload"

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
  ["Sales & Trends", "database"],
  ["Users & Access", "team"],
  ["API Keys", "key"],
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

type MetricKey =
  | "impressions"
  | "pageViews"
  | "conversion"
  | "downloads"
  | "proceeds"
  | "sessions"
  | "crashes"

const analyticsLength = 180

// Data runs through yesterday
const analyticsDates = Array.from({ length: analyticsLength }, (_, index) => {
  const date = new Date(2025, 5, 23)
  date.setDate(date.getDate() - (analyticsLength - 1 - index))
  return date
})

const featureIndex = analyticsLength - 23

function analyticsSeries(
  base: number,
  growth: number,
  seed: number,
  feature = 0,
) {
  return Array.from({ length: analyticsLength }, (_, index) => {
    const trend = 1 + growth * (index / (analyticsLength - 1))
    const weekly = 1 + 0.08 * Math.sin(((index + seed) / 7) * Math.PI * 2)
    const noise =
      1 +
      0.06 * Math.sin(index * 1.7 + seed * 3.1) * Math.cos(index * 0.37 + seed)
    const spike = 1 + feature * Math.exp(-((index - featureIndex) ** 2) / 10)
    return base * trend * weekly * noise * spike
  })
}

const analyticsRaw = {
  impressions: analyticsSeries(38000, 0.28, 1, 0.9),
  pageViews: analyticsSeries(5200, 0.3, 2, 0.7),
  downloads: analyticsSeries(1550, 0.34, 3, 0.55),
  proceeds: analyticsSeries(980, 0.36, 4, 0.3),
  sessions: analyticsSeries(24000, 0.22, 5),
  crashes: analyticsSeries(52, -0.35, 6),
}

const analyticsEvents = [
  { index: analyticsLength - 29, label: "Version 3.1.4 released" },
  { index: featureIndex, label: "Featured in Apps We Love" },
]

const analyticsMetrics: {
  key: MetricKey
  label: string
  upIsGood: boolean
}[] = [
  { key: "impressions", label: "Impressions", upIsGood: true },
  { key: "pageViews", label: "Product Page Views", upIsGood: true },
  { key: "conversion", label: "Conversion Rate", upIsGood: true },
  { key: "downloads", label: "Downloads", upIsGood: true },
  { key: "proceeds", label: "Proceeds", upIsGood: true },
  { key: "sessions", label: "Sessions", upIsGood: true },
  { key: "crashes", label: "Crashes", upIsGood: false },
]

const analyticsRanges = [
  [7, "Last 7 days"],
  [30, "Last 30 days"],
  [90, "Last 90 days"],
] as const

const analyticsTerritories = [
  { name: "United States", share: 0.34, conversion: 1.05, retention: 1.04 },
  { name: "China mainland", share: 0.17, conversion: 0.92, retention: 0.95 },
  { name: "Japan", share: 0.11, conversion: 1.1, retention: 1.08 },
  { name: "United Kingdom", share: 0.07, conversion: 1, retention: 1.02 },
  { name: "Germany", share: 0.06, conversion: 0.97, retention: 1.03 },
  { name: "Taiwan", share: 0.05, conversion: 1.08, retention: 1 },
  { name: "Canada", share: 0.04, conversion: 1.02, retention: 1.01 },
  { name: "France", share: 0.04, conversion: 0.95, retention: 0.98 },
  { name: "Other territories", share: 0.12, conversion: 0.9, retention: 0.94 },
]

// Keeps territory conversion rates averaging to the overall rate
const conversionNorm = analyticsTerritories.reduce(
  (total, item) => total + item.share * item.conversion,
  0,
)

const downloadSources = [
  ["App Store Search", 0.46],
  ["App Store Browse", 0.21],
  ["App Referrer", 0.14],
  ["Web Referrer", 0.11],
  ["Other", 0.08],
] as const

const proceedsByProduct = [
  ["Fire Pro Monthly", 0.38],
  ["Fire Pro Yearly", 0.34],
  ["Fire Pro Lifetime", 0.19],
  ["Fire Team Yearly", 0.05],
  ["Fire Team Monthly", 0.04],
] as const

const retentionDays = [1, 3, 7, 14, 28]
const retentionBase = [0.44, 0.33, 0.25, 0.19, 0.14]
const retentionCohorts = [
  ["May 12", 0.97],
  ["May 19", 1],
  ["May 26", 1.03],
  ["Jun 2", 0.92],
  ["Jun 9", 1.02],
  ["Jun 16", 1.05],
] as const

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

const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
})

const shortDate = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "short", day: "numeric" })

function formatMetric(key: MetricKey, value: number, full = false) {
  if (key === "conversion") return `${(value * 100).toFixed(1)}%`
  if (key === "proceeds")
    return full
      ? `$${Math.round(value).toLocaleString("en-US")}`
      : `$${compactNumber.format(value)}`
  return full
    ? Math.round(value).toLocaleString("en-US")
    : compactNumber.format(value)
}

function niceScale(value: number) {
  const raw = value / 4 || 1
  const power = 10 ** Math.floor(Math.log10(raw))
  const step =
    [1, 2, 2.5, 5, 10].map((item) => item * power).find((item) => item >= raw) ??
    raw
  return [0, 1, 2, 3, 4].map((index) => index * step)
}

function TrendChart({
  dates,
  values,
  previous,
  events,
  format,
  axisFormat,
  label,
  previousLabel,
}: {
  dates: Date[]
  values: number[]
  previous?: number[]
  events: { index: number; label: string }[]
  format: (value: number) => string
  axisFormat: (value: number) => string
  label: string
  previousLabel: string
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
  const ticks = niceScale(Math.max(...values, ...(previous ?? [])))
  const max = ticks[ticks.length - 1]
  const x = (index: number) =>
    pad.left + (index * plotWidth) / Math.max(values.length - 1, 1)
  const y = (value: number) => pad.top + plotHeight - (value / max) * plotHeight
  const path = (series: number[]) =>
    series
      .map(
        (value, index) =>
          `${index ? "L" : "M"}${x(index).toFixed(1)},${y(value).toFixed(1)}`,
      )
      .join("")
  const last = values.length - 1
  const labelEvery = Math.ceil(values.length / Math.max(plotWidth / 90, 2))
  const pointAt = (clientX: number, left: number) =>
    Math.min(
      Math.max(
        Math.round(
          ((clientX - left - pad.left) / plotWidth) * (values.length - 1),
        ),
        0,
      ),
      last,
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
        {dates.map(
          (date, index) =>
            (last - index) % labelEvery === 0 && (
              <text
                key={index}
                className="an-axis an-axis-x"
                x={x(index)}
                y={height - 8}
              >
                {shortDate(date)}
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
        {previous && (
          <path className="an-line previous" d={path(previous)} />
        )}
        <path
          className="an-area"
          d={`${path(values)}L${x(last)},${y(0)}L${x(0)},${y(0)}Z`}
        />
        <path className="an-line" d={path(values)} />
        <circle className="an-dot" cx={x(last)} cy={y(values[last])} r={4} />
        <text
          className="an-end-label"
          x={x(last) + 9}
          y={y(values[last]) + 4}
        >
          {axisFormat(values[last])}
        </text>
        {hover !== null && (
          <g>
            <line
              className="an-crosshair"
              x1={x(hover)}
              x2={x(hover)}
              y1={pad.top}
              y2={y(0)}
            />
            {previous && (
              <circle
                className="an-dot previous"
                cx={x(hover)}
                cy={y(previous[hover])}
                r={4}
              />
            )}
            <circle
              className="an-dot"
              cx={x(hover)}
              cy={y(values[hover])}
              r={4}
            />
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
          className={`an-tooltip ${x(hover) > width - 190 ? "flip" : ""}`}
          style={{ left: x(hover), top: pad.top }}
        >
          <small>{shortDate(dates[hover])}</small>
          <div>
            <i />
            <strong>{format(values[hover])}</strong>
            <span>{label}</span>
          </div>
          {previous && (
            <div>
              <i className="previous" />
              <strong>{format(previous[hover])}</strong>
              <span>{previousLabel}</span>
            </div>
          )}
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

function AnalyticsPage({ notify }: { notify: (message: string) => void }) {
  const [platform, setPlatform] = useState<"iOS" | "macOS">("iOS")
  const [days, setDays] = useState<number>(30)
  const [rangeMenu, setRangeMenu] = useState(false)
  const [territory, setTerritory] = useState("All Territories")
  const [compare, setCompare] = useState(true)
  const [metric, setMetric] = useState<MetricKey>("downloads")
  const [view, setView] = useState<"chart" | "table">("chart")
  const [sort, setSort] = useState<{
    key: "pageViews" | "conversion" | "downloads" | "proceeds"
    desc: boolean
  }>({ key: "downloads", desc: true })
  const [tip, setTip] = useState<{
    x: number
    y: number
    value: string
    label: string
  } | null>(null)

  const region = analyticsTerritories.find((item) => item.name === territory)
  const scale = (platform === "iOS" ? 1 : 0.07) * (region?.share ?? 1)
  const conversionScale =
    (platform === "iOS" ? 1 : 0.8) *
    (region ? region.conversion / conversionNorm : 1)
  const retentionScale =
    (platform === "iOS" ? 1 : 1.12) * (region?.retention ?? 1)
  const end = analyticsLength
  const start = end - days
  const daily = (key: MetricKey, from: number, to: number) =>
    Array.from({ length: to - from }, (_, offset) => {
      const index = from + offset
      if (key === "conversion") {
        return (
          (analyticsRaw.downloads[index] / analyticsRaw.pageViews[index]) *
          conversionScale
        )
      }
      return (
        analyticsRaw[key][index] *
        scale *
        (key === "downloads" ? conversionScale : 1)
      )
    })
  const sum = (series: number[]) =>
    series.reduce((total, value) => total + value, 0)
  const total = (key: MetricKey, from: number, to: number) =>
    key === "conversion"
      ? (sum(analyticsRaw.downloads.slice(from, to)) /
          sum(analyticsRaw.pageViews.slice(from, to))) *
        conversionScale
      : sum(daily(key, from, to))
  const current = (key: MetricKey) => total(key, start, end)
  const prior = (key: MetricKey) => total(key, start - days, start)
  const selectedMetric =
    analyticsMetrics.find((item) => item.key === metric) ?? analyticsMetrics[0]
  const values = daily(metric, start, end)
  const previous = daily(metric, start - days, start)
  const dates = analyticsDates.slice(start, end)
  const events = analyticsEvents
    .filter((event) => event.index >= start)
    .map((event) => ({ ...event, index: event.index - start }))
  const rangeLabel =
    analyticsRanges.find(([value]) => value === days)?.[1] ?? ""
  const pageViews = current("pageViews")
  const downloads = current("downloads")
  const proceeds = current("proceeds")
  const funnel = [
    ["Impressions", current("impressions")],
    ["Product Page Views", pageViews],
    ["Downloads", downloads],
  ] as const
  const territoryRows = analyticsTerritories
    .filter((item) => !region || item.name === region.name)
    .map((item) => {
      const share = (platform === "iOS" ? 1 : 0.07) * item.share
      const views = sum(analyticsRaw.pageViews.slice(start, end)) * share
      const conversion =
        (sum(analyticsRaw.downloads.slice(start, end)) /
          sum(analyticsRaw.pageViews.slice(start, end))) *
        (platform === "iOS" ? 1 : 0.8) *
        (item.conversion / conversionNorm)
      return {
        name: item.name,
        pageViews: views,
        conversion,
        downloads: views * conversion,
        proceeds: sum(analyticsRaw.proceeds.slice(start, end)) * share,
      }
    })
    .sort((a, b) =>
      sort.desc ? b[sort.key] - a[sort.key] : a[sort.key] - b[sort.key],
    )
  const territoryTotal = territoryRows.reduce(
    (total, row) => total + row.downloads,
    0,
  )
  const tipProps = (label: string, value: string) => ({
    tabIndex: 0,
    onPointerMove: (event: ReactPointerEvent) =>
      setTip({ x: event.clientX, y: event.clientY, label, value }),
    onPointerLeave: () => setTip(null),
    onFocus: (event: ReactFocusEvent<HTMLElement>) => {
      const rect = event.currentTarget.getBoundingClientRect()
      setTip({ x: rect.left + rect.width / 2, y: rect.top, label, value })
    },
    onBlur: () => setTip(null),
  })

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
                onClick={() => setPlatform(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <button
            className="quiet-button"
            onClick={() => notify("Analytics exported as CSV")}
          >
            <Icon name="download" size={14} />
            Export
          </button>
        </div>
      </div>

      <div className="an-filters">
        <div className="an-range">
          <button
            className="an-filter-button"
            onClick={() => setRangeMenu(!rangeMenu)}
          >
            <strong>{rangeLabel}</strong>
            <span>
              {shortDate(dates[0])} – {shortDate(dates[dates.length - 1])},
              2025
            </span>
            <Icon name="chevron" size={13} />
          </button>
          {rangeMenu && (
            <div className="an-menu">
              {analyticsRanges.map(([value, title]) => (
                <button
                  key={value}
                  className={days === value ? "selected" : ""}
                  onClick={() => {
                    setDays(value)
                    setRangeMenu(false)
                  }}
                >
                  {title}
                  {days === value && <Icon name="check" size={16} />}
                </button>
              ))}
              <button
                className="an-menu-custom"
                onClick={() => {
                  setRangeMenu(false)
                  notify("Custom range picker opened")
                }}
              >
                Custom Range…
              </button>
            </div>
          )}
        </div>
        <select
          className="an-select"
          aria-label="Territory"
          value={territory}
          onChange={(event) => setTerritory(event.target.value)}
        >
          <option>All Territories</option>
          {analyticsTerritories
            .filter((item) => item.name !== "Other territories")
            .map((item) => (
              <option key={item.name}>{item.name}</option>
            ))}
        </select>
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
        <span className="an-updated">Data through Jun 23 · Updated 2h ago</span>
      </div>

      <section className="card an-trend">
        <div className="an-metrics" role="tablist">
          {analyticsMetrics.map((item) => {
            const now = current(item.key)
            const before = prior(item.key)
            const change = before ? (now - before) / before : 0
            const good = change >= 0 === item.upIsGood
            return (
              <button
                key={item.key}
                role="tab"
                aria-selected={metric === item.key}
                className={metric === item.key ? "active" : ""}
                onClick={() => setMetric(item.key)}
              >
                <span>{item.label}</span>
                <strong>{formatMetric(item.key, now)}</strong>
                <small className={good ? "good" : "bad"}>
                  {change >= 0 ? "▲" : "▼"} {Math.abs(change * 100).toFixed(1)}%
                </small>
              </button>
            )
          })}
        </div>
        <div className="an-trend-head">
          <div className="an-legend">
            <span>
              <i />
              {rangeLabel}
            </span>
            {compare && (
              <span>
                <i className="previous" />
                Previous {days} days
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
              dates={dates}
              values={values}
              previous={compare ? previous : undefined}
              events={events}
              format={(value) => formatMetric(metric, value, true)}
              axisFormat={(value) => formatMetric(metric, value)}
              label={rangeLabel}
              previousLabel={`Previous ${days} days`}
            />
            {events.length > 0 && (
              <ol className="an-events">
                {events.map((event) => (
                  <li key={event.label}>
                    <b>{events.indexOf(event) + 1}</b>
                    {shortDate(dates[event.index])} · {event.label}
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
                  <th>{selectedMetric.label}</th>
                  {compare && <th>Previous Period</th>}
                </tr>
              </thead>
              <tbody>
                {[...values.keys()].reverse().map((index) => (
                  <tr key={index}>
                    <td>{shortDate(dates[index])}</td>
                    <td>{formatMetric(metric, values[index], true)}</td>
                    {compare && (
                      <td>{formatMetric(metric, previous[index], true)}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="an-grid">
        <section className="card">
          <div className="card-heading">
            <div>
              <span className="card-icon warm">
                <Icon name="search" size={17} />
              </span>
              <h2>Acquisition Funnel</h2>
              <p>From seeing Fire on the App Store to downloading it</p>
            </div>
          </div>
          <div className="an-funnel">
            {funnel.map(([title, value], index) => (
              <div key={title} className="an-funnel-step">
                <div className="an-bar-label">
                  <span>{title}</span>
                  <strong>{formatMetric("downloads", value, true)}</strong>
                </div>
                <div
                  className="an-track"
                  {...tipProps(title, formatMetric("downloads", value, true))}
                >
                  <b style={{ width: `${(value / funnel[0][1]) * 100}%` }} />
                </div>
                {index > 0 && (
                  <small>
                    {((value / funnel[index - 1][1]) * 100).toFixed(1)}% of{" "}
                    {funnel[index - 1][0].toLowerCase()}
                  </small>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-heading">
            <div>
              <span className="card-icon pale">
                <Icon name="apps" size={17} />
              </span>
              <h2>Download Sources</h2>
              <p>Where first-time downloads came from</p>
            </div>
          </div>
          <div className="an-bars">
            {downloadSources.map(([title, share]) => (
              <div key={title} className="an-bar-row">
                <span>{title}</span>
                <div
                  className="an-track"
                  {...tipProps(
                    title,
                    `${formatMetric("downloads", downloads * share, true)} downloads`,
                  )}
                >
                  <b style={{ width: `${(share / 0.46) * 100}%` }} />
                </div>
                <strong>{(share * 100).toFixed(0)}%</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-heading">
            <div>
              <span className="card-icon sand">
                <Icon name="team" size={17} />
              </span>
              <h2>Retention</h2>
              <p>Share of each weekly install cohort still using Fire</p>
            </div>
          </div>
          <div className="an-heatmap">
            <span />
            {retentionDays.map((day) => (
              <span key={day} className="an-heat-head">
                Day {day}
              </span>
            ))}
            {retentionCohorts.map(([week, factor], row) => (
              <Fragment key={week}>
                <span className="an-heat-week">{week}</span>
                {retentionDays.map((day, column) => {
                  const available =
                    (retentionCohorts.length - 1 - row) * 7 + 7 >= day
                  const value = Math.min(
                    retentionBase[column] * factor * retentionScale,
                    0.99,
                  )
                  const step = Math.min(
                    Math.floor((value / 0.5) * heatRamp.length),
                    heatRamp.length - 1,
                  )
                  return available ? (
                    <span
                      key={day}
                      className="an-heat-cell"
                      style={{
                        background: heatRamp[step],
                        color: step >= 4 ? "#fff" : "#4a3328",
                      }}
                      {...tipProps(
                        `${week} cohort · Day ${day}`,
                        `${(value * 100).toFixed(1)}% retained`,
                      )}
                    >
                      {(value * 100).toFixed(0)}%
                    </span>
                  ) : (
                    <span key={day} className="an-heat-cell empty">
                      —
                    </span>
                  )
                })}
              </Fragment>
            ))}
          </div>
          <div className="an-heat-scale">
            <span>0%</span>
            <i>
              {heatRamp.map((color) => (
                <b key={color} style={{ background: color }} />
              ))}
            </i>
            <span>50%+</span>
          </div>
        </section>

        <section className="card">
          <div className="card-heading">
            <div>
              <span className="card-icon orange">
                <Icon name="tag" size={17} />
              </span>
              <h2>Proceeds by Product</h2>
              <p>
                {formatMetric("proceeds", proceeds, true)} from in-app purchases
              </p>
            </div>
          </div>
          <div className="an-bars">
            {proceedsByProduct.map(([title, share]) => (
              <div key={title} className="an-bar-row">
                <span>{title}</span>
                <div
                  className="an-track"
                  {...tipProps(title, `${(share * 100).toFixed(0)}% of proceeds`)}
                >
                  <b style={{ width: `${(share / 0.38) * 100}%` }} />
                </div>
                <strong>{formatMetric("proceeds", proceeds * share)}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card an-territories">
        <div className="card-heading">
          <div>
            <span className="card-icon pale">
              <Icon name="store" size={17} />
            </span>
            <h2>Territories</h2>
            <p>Performance by App Store territory · Click a column to sort</p>
          </div>
        </div>
        <table className="an-table">
          <thead>
            <tr>
              <th>Territory</th>
              {(
                [
                  ["pageViews", "Page Views"],
                  ["conversion", "Conversion"],
                  ["downloads", "Downloads"],
                  ["proceeds", "Proceeds"],
                ] as const
              ).map(([key, title]) => (
                <th key={key}>
                  <button
                    className={sort.key === key ? "active" : ""}
                    onClick={() =>
                      setSort({
                        key,
                        desc: sort.key === key ? !sort.desc : true,
                      })
                    }
                  >
                    {title}
                    {sort.key === key && (sort.desc ? " ↓" : " ↑")}
                  </button>
                </th>
              ))}
              <th>Share of Downloads</th>
            </tr>
          </thead>
          <tbody>
            {territoryRows.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{formatMetric("pageViews", row.pageViews, true)}</td>
                <td>{formatMetric("conversion", row.conversion)}</td>
                <td>{formatMetric("downloads", row.downloads, true)}</td>
                <td>{formatMetric("proceeds", row.proceeds, true)}</td>
                <td>
                  <span className="an-share">
                    <i>
                      <b
                        style={{
                          width: `${(row.downloads / territoryTotal) * 100}%`,
                        }}
                      />
                    </i>
                    {((row.downloads / territoryTotal) * 100).toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

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
        <Icon
          name={
            title === "Analytics"
              ? "chart"
              : title === "API Keys"
                ? "key"
                : "apps"
          }
          size={24}
        />
      </span>
      <h1>{title}</h1>
      <p>The Fire {title} workspace is ready.</p>
    </div>
  )
}

export default function App() {
  const [active, setActive] = useState("Metadata")
  const [toast, setToast] = useState("")
  const [language, setLanguage] = useState("English")
  const [localeMenu, setLocaleMenu] = useState(false)
  const [build, setBuild] = useState("1.0.1")
  const [buildMenu, setBuildMenu] = useState(false)
  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(""), 2400)
  }

  return (
    <div className="stage">
      <div className="app-window">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-symbol">F</div>
            <div>
              <strong>Fire</strong>
              <span>App Store Manager</span>
            </div>
          </div>
          <button className="account-switch">
            <span className="account-icon">
              <Icon name="store" size={16} />
            </span>
            <span>
              <strong>Acme Studio</strong>
              <small>8 apps</small>
            </span>
            <Icon name="chevron" size={14} />
          </button>
          <nav>
            <p>Workspace</p>
            {navigation.slice(0, 7).map(([label, icon]) => (
              <button
                key={label}
                className={active === label ? "active" : ""}
                onClick={() => setActive(label)}
              >
                <Icon name={icon} />
                <span>{label}</span>
              </button>
            ))}
            <p>Management</p>
            {navigation.slice(7).map(([label, icon]) => (
              <button
                key={label}
                className={active === label ? "active" : ""}
                onClick={() => setActive(label)}
              >
                <Icon name={icon} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
          <div className="profile">
            <div className="profile-avatar">AL</div>
            <div>
              <strong>Alex Lin</strong>
              <span>
                <i /> API connected
              </span>
            </div>
            <button>
              <Icon name="more" />
            </button>
          </div>
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
