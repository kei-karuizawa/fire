// Mock data layer for the Analytics page. Metric names, dimensions and report
// names follow App Store Connect Analytics and the Analytics Reports API, so a
// real data source can replace the generated series without changing the UI.

export type Platform = "iOS" | "macOS"
export type Granularity = "day" | "week" | "month"
export type Unit = "count" | "currency" | "percent" | "decimal" | "duration"
export type Family =
  | "store"
  | "downloads"
  | "sales"
  | "usage"
  | "events"
  | "subscriptions"
  | "clips"

export type Scope = {
  platform: Platform
  filters: Partial<Record<DimensionKey, string>>
}

// ---------------------------------------------------------------- Calendar

// Data runs through yesterday. Two years are selectable, and two more exist
// behind them so the longest range still has a complete comparison period.
export const dataEnd = new Date(2025, 5, 23)
export const selectableDays = 731
export const dataLength = selectableDays * 2
export const firstSelectable = dataLength - selectableDays

const utcDay = (date: Date) =>
  Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())

export const dateAt = (index: number) =>
  new Date(
    dataEnd.getFullYear(),
    dataEnd.getMonth(),
    dataEnd.getDate() - (dataLength - 1 - index),
  )

export const indexOfDate = (date: Date) =>
  dataLength - 1 - Math.round((utcDay(dataEnd) - utcDay(date)) / 86400000)

export type Bucket = [from: number, to: number]

// Half-open day-index buckets. Weeks count back from the range end so the
// newest bucket is always complete; months follow the calendar.
export function bucketsFor(
  from: number,
  to: number,
  granularity: Granularity,
): Bucket[] {
  const buckets: Bucket[] = []
  if (granularity === "day") {
    for (let index = from; index < to; index += 1) {
      buckets.push([index, index + 1])
    }
  } else if (granularity === "week") {
    for (let end = to; end > from; end -= 7) {
      buckets.unshift([Math.max(end - 7, from), end])
    }
  } else {
    let start = from
    while (start < to) {
      const date = dateAt(start)
      const next = indexOfDate(
        new Date(date.getFullYear(), date.getMonth() + 1, 1),
      )
      buckets.push([start, Math.min(next, to)])
      start = next
    }
  }
  return buckets
}

// ---------------------------------------------------------------- Reports

export const reportCatalog = [
  {
    category: "APP_STORE_ENGAGEMENT",
    title: "App Store Engagement",
    reports: ["App Store Discovery and Engagement", "App Store Web Preview"],
  },
  {
    category: "COMMERCE",
    title: "App Store Commerce",
    reports: [
      "App Store Downloads",
      "App Store Pre-orders",
      "App Store Purchases",
      "Subscription Event",
      "Subscription State",
    ],
  },
  {
    category: "APP_USAGE",
    title: "App Usage",
    reports: [
      "App Clip Usage",
      "App Crashes",
      "App Store Installations and Deletions",
      "App Store Opt-in",
      "App Sessions",
    ],
  },
] as const

export type ReportName =
  (typeof reportCatalog)[number]["reports"][number]

// ------------------------------------------------------------- Dimensions

type DimensionValue = {
  name: string
  share: number
  platform?: Platform
  region?: string
}

export type DimensionDef = {
  label: string
  values: DimensionValue[]
  // Value that means "not attributed"; tables and bar lists leave it out
  unattributed?: string
}

const list = (entries: [string, number][]): DimensionValue[] =>
  entries.map(([name, share]) => ({ name, share }))

const offerTypes = list([
  ["Introductory Offer", 0.62],
  ["Offer Code", 0.17],
  ["Promotional Offer", 0.13],
  ["Winback Offer", 0.08],
])

const offerPricing = list([
  ["Free Trial", 0.71],
  ["Pay As You Go", 0.18],
  ["Pay Up Front", 0.11],
])

const durations = list([
  ["1 week", 0.05],
  ["1 month", 0.46],
  ["2 months", 0.02],
  ["3 months", 0.07],
  ["6 months", 0.05],
  ["1 year", 0.35],
])

const subscriptionStates = list([
  ["Free Trial", 0.14],
  ["Paid Offer", 0.06],
  ["Full Price", 0.52],
  ["Preserved Price", 0.11],
  ["Contingent Price", 0.03],
  ["Grace Period", 0.02],
  ["Billing Retry", 0.03],
  ["Voluntary Churn", 0.07],
  ["Involuntary Churn", 0.02],
])

export const dimensions = {
  territory: {
    label: "Territory",
    values: [
      { name: "United States", share: 0.34, region: "US and Canada" },
      { name: "China mainland", share: 0.17, region: "Asia Pacific" },
      { name: "Japan", share: 0.11, region: "Asia Pacific" },
      { name: "United Kingdom", share: 0.07, region: "Europe" },
      { name: "Germany", share: 0.06, region: "Europe" },
      { name: "Taiwan", share: 0.05, region: "Asia Pacific" },
      {
        name: "India",
        share: 0.05,
        region: "Africa, the Middle East, and India",
      },
      { name: "Canada", share: 0.04, region: "US and Canada" },
      { name: "France", share: 0.04, region: "Europe" },
      {
        name: "Brazil",
        share: 0.04,
        region: "Latin America and the Caribbean",
      },
      { name: "Australia", share: 0.03, region: "Asia Pacific" },
    ],
  },
  region: {
    label: "Region",
    values: list([
      ["Asia Pacific", 0.36],
      ["US and Canada", 0.38],
      ["Europe", 0.17],
      ["Africa, the Middle East, and India", 0.05],
      ["Latin America and the Caribbean", 0.04],
    ]),
  },
  device: {
    label: "Device",
    values: [
      { name: "iPhone", share: 0.74, platform: "iOS" },
      { name: "iPad", share: 0.23, platform: "iOS" },
      { name: "Apple Vision", share: 0.025, platform: "iOS" },
      { name: "iPod", share: 0.005, platform: "iOS" },
      { name: "Desktop", share: 1, platform: "macOS" },
    ],
  },
  platformVersion: {
    label: "Platform Version",
    values: [
      { name: "iOS 18.5", share: 0.52, platform: "iOS" },
      { name: "iOS 18.4", share: 0.21, platform: "iOS" },
      { name: "iOS 18.3 and earlier", share: 0.12, platform: "iOS" },
      { name: "iOS 17", share: 0.11, platform: "iOS" },
      { name: "iOS 16 and earlier", share: 0.04, platform: "iOS" },
      { name: "macOS 15", share: 0.68, platform: "macOS" },
      { name: "macOS 14", share: 0.24, platform: "macOS" },
      { name: "macOS 13 and earlier", share: 0.08, platform: "macOS" },
    ],
  },
  appVersion: {
    label: "App Version",
    values: list([
      ["3.1.4", 0.61],
      ["3.1.3", 0.18],
      ["3.1.2", 0.09],
      ["3.1.0", 0.06],
      ["3.0.2", 0.04],
      ["3.0.1 and earlier", 0.02],
    ]),
  },
  sourceType: {
    label: "Source Type",
    values: list([
      ["App Store Search", 0.46],
      ["App Store Browse", 0.21],
      ["App Referrer", 0.14],
      ["Web Referrer", 0.11],
      ["App Clip", 0.03],
      ["Institutional Purchase", 0.01],
      ["Unavailable", 0.04],
    ]),
  },
  appReferrer: {
    label: "App Referrer",
    unattributed: "No App Referrer",
    values: list([
      ["No App Referrer", 0.86],
      ["Slack", 0.042],
      ["Notion", 0.031],
      ["Gmail", 0.024],
      ["Reddit", 0.019],
      ["Telegram", 0.014],
      ["X", 0.01],
    ]),
  },
  webReferrer: {
    label: "Web Referrer",
    unattributed: "No Web Referrer",
    values: list([
      ["No Web Referrer", 0.89],
      ["google.com", 0.041],
      ["producthunt.com", 0.023],
      ["macstories.net", 0.017],
      ["reddit.com", 0.014],
      ["fire.app", 0.015],
    ]),
  },
  productPage: {
    label: "Product Page",
    values: list([
      ["Default Product Page", 0.71],
      ["Students", 0.12],
      ["Teams", 0.1],
      ["Creators", 0.07],
    ]),
  },
  pageType: {
    label: "Page Type",
    values: list([
      ["Product Page", 0.68],
      ["App Page", 0.16],
      ["Store Sheet", 0.12],
      ["In-App Event", 0.04],
    ]),
  },
  inAppEvent: {
    label: "In-App Event",
    values: list([
      ["Summer Focus Challenge", 0.46],
      ["Plan Your Week Live", 0.31],
      ["Back to Work Sprint", 0.23],
    ]),
  },
  campaign: {
    label: "Campaign",
    unattributed: "No Campaign",
    values: list([
      ["No Campaign", 0.82],
      ["newsletter-june", 0.067],
      ["producthunt-launch", 0.052],
      ["partner-notion", 0.036],
      ["podcast-focus", 0.025],
    ]),
  },
  preOrders: {
    label: "Pre Orders",
    values: list([
      ["Standard Download", 0.994],
      ["Pre-Order", 0.006],
    ]),
  },
  downloadType: {
    label: "Download Type",
    values: list([
      ["First-Time Download", 0.82],
      ["Redownload", 0.18],
    ]),
  },
  purchase: {
    label: "Purchases",
    values: list([
      ["Fire Pro Monthly", 0.38],
      ["Fire Pro Yearly", 0.34],
      ["Fire Pro Lifetime", 0.19],
      ["Fire Team Yearly", 0.05],
      ["Fire Team Monthly", 0.04],
    ]),
  },
  purchaseType: {
    label: "Purchase Type",
    values: list([
      ["Auto-Renewable Subscription", 0.81],
      ["Non-Consumable", 0.19],
      ["Consumable", 0],
      ["Non-Renewing Subscription", 0],
    ]),
  },
  refundType: {
    label: "Refund Type",
    values: list([
      ["Full", 0.84],
      ["Partial", 0.15],
      ["Complete My Bundle", 0.01],
    ]),
  },
  subscriptionGroup: {
    label: "Subscription Group Name",
    values: list([
      ["Fire Pro", 0.89],
      ["Fire Team", 0.11],
    ]),
  },
  subscriptionName: {
    label: "Subscription Name",
    values: list([
      ["Fire Pro Monthly", 0.47],
      ["Fire Pro Yearly", 0.42],
      ["Fire Team Yearly", 0.06],
      ["Fire Team Monthly", 0.05],
    ]),
  },
  subscriptionDuration: { label: "Subscription Duration", values: durations },
  subscriptionPricing: {
    label: "Subscription Pricing",
    values: list([
      ["Full Price", 0.79],
      ["Preserved Price", 0.17],
      ["Contingent Price", 0.04],
    ]),
  },
  offerType: { label: "Offer Type", values: offerTypes },
  offerPricing: { label: "Offer Pricing", values: offerPricing },
  offerDuration: { label: "Offer Duration", values: durations },
  initialOfferType: { label: "Initial Offer Type", values: offerTypes },
  initialOfferPricing: { label: "Initial Offer Pricing", values: offerPricing },
  initialOfferDuration: { label: "Initial Offer Duration", values: durations },
  lastOfferType: { label: "Last Offer Type", values: offerTypes },
  lastOfferPricing: { label: "Last Offer Pricing", values: offerPricing },
  lastOfferDuration: { label: "Last Offer Duration", values: durations },
  paidTenure: {
    label: "Paid Tenure",
    values: list([
      ["<1 year", 0.58],
      ["1 year", 0.24],
      ["2 years", 0.11],
      ["3 years", 0.05],
      ["4 years", 0.015],
      [">=5 years", 0.005],
    ]),
  },
  previousState: { label: "Previous State", values: subscriptionStates },
  currentState: { label: "Current State", values: subscriptionStates },
  planChangeType: {
    label: "Plan Change Type",
    values: list([
      ["Upgrades", 0.53],
      ["Crossgrades", 0.28],
      ["Downgrades", 0.19],
    ]),
  },
  cancellationReason: {
    label: "Cancellation Reason",
    values: list([
      ["Turned Off Auto-Renew", 0.71],
      ["Billing Issue", 0.22],
      ["Price Increase", 0.05],
      ["Removed from Sale", 0.02],
    ]),
  },
  familySharing: {
    label: "Family Sharing",
    values: list([
      ["Individual", 0.93],
      ["Shared with Family", 0.07],
    ]),
  },
  clipSource: {
    label: "App Clip Source",
    values: list([
      ["App Clip Code", 0.24],
      ["QR Code", 0.2],
      ["Web Referrer", 0.16],
      ["NFC Tags", 0.13],
      ["Messages", 0.1],
      ["Maps", 0.07],
      ["App Referrer", 0.05],
      ["Location-Based", 0.03],
      ["Siri", 0.02],
    ]),
  },
} satisfies Record<string, DimensionDef>

export type DimensionKey = keyof typeof dimensions

// ---------------------------------------------------------------- Metrics

function hash(text: string) {
  let value = 2166136261
  for (let index = 0; index < text.length; index += 1) {
    value = Math.imul(value ^ text.charCodeAt(index), 16777619)
  }
  return value >>> 0
}

const unit01 = (text: string) => hash(text) / 4294967295

const geo: DimensionKey[] = ["territory", "region", "device", "platformVersion"]
const attribution: DimensionKey[] = [
  "sourceType",
  "appReferrer",
  "webReferrer",
  "campaign",
]
const storeDims: DimensionKey[] = [
  ...geo,
  ...attribution,
  "productPage",
  "pageType",
]
const downloadDims: DimensionKey[] = [
  ...storeDims,
  "preOrders",
  "downloadType",
]
const salesDims: DimensionKey[] = [
  ...geo,
  ...attribution,
  "productPage",
  "purchase",
  "purchaseType",
]
const usageDims: DimensionKey[] = [...geo, "appVersion", ...attribution]
const eventDims: DimensionKey[] = [...geo, "inAppEvent"]
const crashDims: DimensionKey[] = ["device", "platformVersion", "appVersion"]
const clipDims: DimensionKey[] = [...geo, "clipSource", "appVersion"]
const subscriptionDims: DimensionKey[] = [
  "territory",
  "region",
  "device",
  "subscriptionGroup",
  "subscriptionName",
  "subscriptionDuration",
  "subscriptionPricing",
  "offerType",
  "offerPricing",
  "offerDuration",
  "initialOfferType",
  "initialOfferPricing",
  "initialOfferDuration",
  "lastOfferType",
  "lastOfferPricing",
  "lastOfferDuration",
  "paidTenure",
  "familySharing",
]
const subscriptionEventDims: DimensionKey[] = [
  ...subscriptionDims,
  "previousState",
  "currentState",
  "planChangeType",
  "cancellationReason",
]

export type MetricDef = {
  key: string
  label: string
  group: string
  family: Family
  unit: Unit
  upIsGood: boolean
  definition: string
  report: ReportName | "Derived"
  dims: DimensionKey[]
  // flow: sums over time. stock: latest value. unique: de-duplicated reach.
  // mean: averages over time. Parts and ratios derive from other metrics.
  kind: "flow" | "stock" | "unique" | "mean" | "parts" | "ratio"
  base?: number
  growth?: number
  feature?: number
  shapeOf?: string
  parts?: string[]
  minus?: string[]
  ratio?: [numerator: string, denominator: string]
}

export const metricCatalog: MetricDef[] = []
const metricIndex = new Map<string, MetricDef>()

type MetricOptions = Partial<MetricDef> &
  Pick<MetricDef, "key" | "label" | "definition">

function createGroup(
  group: string,
  family: Family,
  defaults: Partial<MetricDef>,
) {
  return (options: MetricOptions) => {
    const def: MetricDef = {
      group,
      family,
      unit: "count",
      upIsGood: true,
      report: "Derived",
      dims: [],
      kind: "flow",
      ...defaults,
      ...options,
    }
    metricCatalog.push(def)
    metricIndex.set(def.key, def)
  }
}

const store = createGroup("App Store", "store", {
  report: "App Store Discovery and Engagement",
  dims: storeDims,
})
store({
  key: "impressions",
  label: "Impressions",
  definition: "Times the app was viewed in App Store tabs for over one second.",
  base: 38000,
  growth: 0.28,
  feature: 0.9,
})
store({
  key: "impressionsUnique",
  label: "Impressions (Unique Devices)",
  definition: "Unique devices that viewed the app in App Store tabs.",
  kind: "unique",
  base: 23500,
  growth: 0.28,
  feature: 0.9,
  shapeOf: "impressions",
})
store({
  key: "pageViews",
  label: "Product Page Views",
  definition: "Total times the App Store product page was viewed.",
  base: 5200,
  growth: 0.3,
  feature: 0.7,
})
store({
  key: "pageViewsUnique",
  label: "Product Page Views (Unique Devices)",
  definition: "Unique devices that viewed the product page.",
  kind: "unique",
  base: 3900,
  growth: 0.3,
  feature: 0.7,
  shapeOf: "pageViews",
})
store({
  key: "conversion",
  label: "Conversion Rate",
  definition: "Downloads and pre-orders divided by unique device impressions.",
  unit: "percent",
  kind: "ratio",
  ratio: ["downloadsAndPreOrders", "impressionsUnique"],
  report: "Derived",
})
store({
  key: "webPreviewViews",
  label: "Web Preview Page Views",
  definition: "Product page views on the App Store website.",
  report: "App Store Web Preview",
  dims: [...geo, "webReferrer", "pageType"],
  base: 1400,
  growth: 0.18,
})
store({
  key: "webPreviewTaps",
  label: "Web Preview App Store Taps",
  definition: "Taps from the web product page through to the App Store.",
  report: "App Store Web Preview",
  dims: [...geo, "webReferrer", "pageType"],
  base: 410,
  growth: 0.2,
})

const downloads = createGroup("Downloads", "downloads", {
  report: "App Store Downloads",
  dims: downloadDims,
})
downloads({
  key: "firstTimeDownloads",
  label: "First Time Downloads",
  definition: "First-time downloads on iOS, macOS, tvOS or visionOS devices.",
  base: 1270,
  growth: 0.34,
  feature: 0.55,
})
downloads({
  key: "redownloads",
  label: "Redownloads",
  definition: "Redownloads from the redownload button, excluding auto-updates.",
  base: 280,
  growth: 0.22,
  feature: 0.2,
})
downloads({
  key: "downloads",
  label: "Total Downloads",
  definition: "First Time Downloads plus Redownloads.",
  kind: "parts",
  parts: ["firstTimeDownloads", "redownloads"],
})
downloads({
  key: "preOrders",
  label: "Pre-Orders",
  definition: "Pre-orders placed, minus cancelations.",
  report: "App Store Pre-orders",
  dims: storeDims,
  base: 9,
  growth: 0.1,
})
downloads({
  key: "preOrderCancels",
  label: "Pre-Order Cancelations",
  definition: "Pre-orders canceled before release.",
  report: "App Store Pre-orders",
  dims: geo,
  upIsGood: false,
  base: 1,
  growth: 0.05,
})
downloads({
  key: "downloadsAndPreOrders",
  label: "Downloads and Pre-Orders",
  definition: "Total Downloads plus Pre-Orders; the conversion numerator.",
  kind: "parts",
  parts: ["downloads", "preOrders"],
  dims: storeDims,
})
downloads({
  key: "updates",
  label: "Updates",
  definition: "Total app updates, including auto-updates.",
  dims: [...geo, "appVersion"],
  base: 6100,
  growth: 0.2,
})

const sales = createGroup("Sales", "sales", {
  report: "App Store Purchases",
  dims: salesDims,
})
sales({
  key: "proceeds",
  label: "Proceeds",
  definition: "Estimated earnings after taxes and Apple's commission.",
  unit: "currency",
  base: 980,
  growth: 0.36,
  feature: 0.3,
})
sales({
  key: "sales",
  label: "Sales",
  definition: "Total billed to customers for apps and In-App Purchases.",
  unit: "currency",
  base: 1280,
  growth: 0.36,
  feature: 0.3,
  shapeOf: "proceeds",
})
sales({
  key: "payingUsers",
  label: "Paying Users",
  definition: "Unique Apple Accounts that paid for an app or In-App Purchase.",
  kind: "unique",
  base: 96,
  growth: 0.33,
  feature: 0.25,
})
sales({
  key: "iap",
  label: "In-App Purchases",
  definition: "In-App Purchases on supported OS versions, excluding restores.",
  base: 142,
  growth: 0.34,
  feature: 0.28,
})
sales({
  key: "proceedsPerUser",
  label: "Proceeds per Paying User",
  definition: "Proceeds divided by paying users for the period.",
  unit: "currency",
  kind: "ratio",
  ratio: ["proceeds", "payingUsers"],
})
sales({
  key: "salesPerUser",
  label: "Sales per Paying User",
  definition: "Sales divided by paying users for the period.",
  unit: "currency",
  kind: "ratio",
  ratio: ["sales", "payingUsers"],
})
for (const [day, base] of [
  ["1", 0.016],
  ["7", 0.031],
  ["35", 0.048],
] as const) {
  sales({
    key: `downloadToPaid${day}`,
    label: `Day ${day} Download to Paid`,
    definition: `Downloads that made a first purchase within ${day} days.`,
    unit: "percent",
    kind: "mean",
    base,
    growth: 0.05,
  })
}
const refundDims: DimensionKey[] = [...salesDims, "refundType"]
sales({
  key: "refundedProceeds",
  label: "Refunded Proceeds",
  definition: "Proceeds refunded during the selected period.",
  unit: "currency",
  upIsGood: false,
  dims: refundDims,
  base: 24,
  growth: 0.14,
})
sales({
  key: "refundedSales",
  label: "Refunded Sales",
  definition: "Sales refunded during the selected period.",
  unit: "currency",
  upIsGood: false,
  dims: refundDims,
  base: 31,
  growth: 0.14,
  shapeOf: "refundedProceeds",
})
sales({
  key: "refundedPurchases",
  label: "Refunded Purchases",
  definition: "Purchases refunded during the selected period.",
  upIsGood: false,
  dims: refundDims,
  base: 3.1,
  growth: 0.12,
})
sales({
  key: "proceedsRefundRate",
  label: "Proceeds Refund Rate",
  definition: "Percentage of proceeds refunded during the selected period.",
  unit: "percent",
  upIsGood: false,
  kind: "ratio",
  ratio: ["refundedProceeds", "proceeds"],
})
sales({
  key: "salesRefundRate",
  label: "Sales Refund Rate",
  definition: "Percentage of sales refunded during the selected period.",
  unit: "percent",
  upIsGood: false,
  kind: "ratio",
  ratio: ["refundedSales", "sales"],
})
sales({
  key: "purchaseRefundRate",
  label: "Purchase Refund Rate",
  definition: "Percentage of purchases refunded during the selected period.",
  unit: "percent",
  upIsGood: false,
  kind: "ratio",
  ratio: ["refundedPurchases", "iap"],
})

const usage = createGroup("Usage", "usage", {
  report: "App Sessions",
  dims: usageDims,
})
usage({
  key: "sessions",
  label: "Sessions",
  definition: "Times the app was used for at least two seconds.",
  base: 24000,
  growth: 0.22,
})
usage({
  key: "activeDevices",
  label: "Active Devices",
  definition: "Devices with at least one session in the selected period.",
  kind: "unique",
  base: 8600,
  growth: 0.24,
})
usage({
  key: "active30",
  label: "Active in Last 30 Days",
  definition: "Active devices with a session in the previous 30 days.",
  kind: "stock",
  base: 118000,
  growth: 0.26,
})
usage({
  key: "sessionsPerDevice",
  label: "Sessions per Active Device",
  definition: "Sessions divided by active devices for the period.",
  unit: "decimal",
  kind: "ratio",
  ratio: ["sessions", "activeDevices"],
})
usage({
  key: "sessionDuration",
  label: "Average Session Duration",
  definition: "Average length of a session.",
  unit: "duration",
  kind: "mean",
  base: 214,
  growth: 0.06,
})
usage({
  key: "installations",
  label: "Installations",
  definition: "Completed installations, including redownloads and Family Sharing.",
  report: "App Store Installations and Deletions",
  base: 1720,
  growth: 0.3,
  feature: 0.45,
})
usage({
  key: "deletions",
  label: "Deletions",
  definition: "Times the app was deleted from the Home Screen or Manage Storage.",
  report: "App Store Installations and Deletions",
  upIsGood: false,
  base: 410,
  growth: 0.16,
})
usage({
  key: "crashes",
  label: "Crashes",
  definition: "Total crashes on supported devices.",
  report: "App Crashes",
  upIsGood: false,
  dims: crashDims,
  base: 52,
  growth: -0.35,
})
usage({
  key: "crashRate",
  label: "Crash Rate",
  definition: "Crashes per session for the selected period.",
  unit: "percent",
  upIsGood: false,
  kind: "ratio",
  ratio: ["crashes", "sessions"],
  dims: crashDims,
})
usage({
  key: "optInRate",
  label: "Opt-in Rate",
  definition: "Share of users who share diagnostics and usage data.",
  report: "App Store Opt-in",
  unit: "percent",
  kind: "mean",
  dims: [...geo, "appVersion"],
  base: 0.31,
  growth: 0.02,
})
for (const [day, base] of [
  ["1", 0.44],
  ["7", 0.25],
  ["14", 0.19],
  ["28", 0.14],
] as const) {
  usage({
    key: `retention${day}`,
    label: `Day ${day} Retention`,
    definition: `Share of an install cohort still using the app on day ${day}.`,
    unit: "percent",
    kind: "mean",
    dims: [...geo, "appVersion", "sourceType"],
    base,
    growth: 0.03,
  })
}

const inAppEvents = createGroup("In-App Events", "events", {
  report: "App Store Discovery and Engagement",
  dims: eventDims,
})
inAppEvents({
  key: "eventImpressions",
  label: "Event Impressions",
  definition: "Times the In-App Event was viewed on the App Store.",
  base: 6200,
  growth: 0.2,
})
inAppEvents({
  key: "eventImpressionsUnique",
  label: "Event Impressions (Unique)",
  definition: "Unique devices that viewed the In-App Event.",
  kind: "unique",
  base: 4300,
  growth: 0.2,
  shapeOf: "eventImpressions",
})
inAppEvents({
  key: "eventPageViews",
  label: "Event Page Views",
  definition: "Times the In-App Event details page was viewed.",
  base: 880,
  growth: 0.22,
})
inAppEvents({
  key: "eventPageViewsUnique",
  label: "Event Page Views (Unique)",
  definition: "Unique devices that viewed the In-App Event details page.",
  kind: "unique",
  base: 640,
  growth: 0.22,
  shapeOf: "eventPageViews",
})
inAppEvents({
  key: "eventAppOpens",
  label: "App Opens",
  definition: "Times users opened the app from an In-App Event card link.",
  base: 310,
  growth: 0.25,
})
inAppEvents({
  key: "eventReminders",
  label: "Reminders",
  definition: "Reminder taps for an event start notification, minus cancelations.",
  base: 96,
  growth: 0.18,
})
inAppEvents({
  key: "eventNotificationTaps",
  label: "Notification Taps",
  definition: "Taps on notifications that an In-App Event is about to start.",
  base: 41,
  growth: 0.15,
})

const appClips = createGroup("App Clips", "clips", {
  report: "App Clip Usage",
  dims: clipDims,
})
appClips({
  key: "clipCardViews",
  label: "App Clip Card Views",
  definition: "Times an App Clip card was invoked.",
  base: 720,
  growth: 0.4,
})
appClips({
  key: "clipCardViewsUnique",
  label: "App Clip Card Views (Unique)",
  definition: "Unique devices that invoked an App Clip card.",
  kind: "unique",
  base: 540,
  growth: 0.4,
  shapeOf: "clipCardViews",
})
appClips({
  key: "clipInstallations",
  label: "App Clip Installations",
  definition: "Installations from the Open button on an App Clip card.",
  base: 240,
  growth: 0.42,
})
appClips({
  key: "clipSessions",
  label: "App Clip Sessions",
  definition: "Times the App Clip was used for at least one second.",
  base: 390,
  growth: 0.38,
})
appClips({
  key: "clipActiveDevices",
  label: "App Clip Active Devices",
  definition: "Unique devices with at least one App Clip session.",
  kind: "unique",
  base: 205,
  growth: 0.4,
})
appClips({
  key: "clipCrashes",
  label: "App Clip Crashes",
  definition: "Total times the App Clip has crashed.",
  upIsGood: false,
  base: 1.4,
  growth: -0.2,
})

const subscriptionStateMetric = createGroup(
  "Subscription States",
  "subscriptions",
  { report: "Subscription State", dims: subscriptionDims, kind: "stock" },
)
const churnStateDims: DimensionKey[] = [
  ...subscriptionDims,
  "cancellationReason",
]
for (const [key, label, definition, base, growth, upIsGood, dims] of [
  ["freeTrials", "Free Trials", "Active subscriptions in a free trial.", 3100, 0.24, true, subscriptionDims],
  ["paidOffers", "Paid Offers", "Active subscriptions in a paid offer.", 1250, 0.18, true, subscriptionDims],
  ["fullPrice", "Full Price", "Active subscriptions paying the full price.", 21400, 0.3, true, subscriptionDims],
  ["preservedPrice", "Preserved Price", "Active subscriptions paying a preserved price.", 4400, 0.06, true, subscriptionDims],
  ["contingentPrice", "Contingent Price", "Active subscriptions paying a contingent price.", 760, 0.2, true, subscriptionDims],
  ["gracePeriod", "Grace Period", "Billing issue, still in a grace period.", 410, 0.05, false, subscriptionDims],
  ["billingRetry", "Billing Retry", "Billing issue, not in a grace period.", 630, 0.04, false, subscriptionDims],
  ["suspended", "Suspended", "Commitment plans that missed payments and lost access.", 45, 0.03, false, subscriptionDims],
  ["voluntaryChurn", "Voluntary Churn", "Inactive subscriptions canceled by the user.", 9800, 0.22, false, churnStateDims],
  ["involuntaryChurn", "Involuntary Churn", "Inactive after 60 days of unrecovered billing issues.", 2300, 0.14, false, churnStateDims],
] as const) {
  subscriptionStateMetric({
    key,
    label,
    definition,
    base,
    growth,
    upIsGood,
    dims: [...dims],
  })
}
for (const [key, label, definition, parts, upIsGood] of [
  ["subscriptionOffers", "Subscription Offers (All)", "Active free trials and paid offers.", ["freeTrials", "paidOffers"], true],
  ["paidPlans", "Paid Plans (All)", "Active full-price, preserved-price and contingent-price subscriptions.", ["fullPrice", "preservedPrice", "contingentPrice"], true],
  ["activePlans", "Active Plans (All)", "Active subscriptions, including trials, paid offers and paid plans.", ["subscriptionOffers", "paidPlans"], true],
  ["billingIssue", "Billing Issue (All)", "Subscriptions that failed to renew, with recovery attempted.", ["gracePeriod", "billingRetry"], false],
  ["churned", "Churned (All)", "Inactive subscriptions that churned within the last two years.", ["voluntaryChurn", "involuntaryChurn"], false],
] as const) {
  subscriptionStateMetric({
    key,
    label,
    definition,
    kind: "parts",
    parts: [...parts],
    upIsGood,
    report: "Subscription State",
  })
}

const subscriptionRate = createGroup("Subscription Rates", "subscriptions", {
  report: "Derived",
  dims: subscriptionDims,
})
subscriptionRate({
  key: "mrr",
  label: "Monthly Recurring Revenue",
  definition: "Revenue from active paid subscriptions, normalized to monthly.",
  unit: "currency",
  kind: "stock",
  report: "Subscription State",
  base: 41000,
  growth: 0.31,
})

// Apple names every subscription event; each "(All)" total sums its children
// so the expandable table and the charts can never disagree.
const subscriptionEventGroups: {
  key: string
  label: string
  definition: string
  upIsGood?: boolean
  children: [label: string, definition: string, base: number][]
}[] = [
  {
    key: "offerStarts",
    label: "Offer Starts (All)",
    definition: "Offers that began.",
    children: [
      ["Free Trial Start", "Plans that began a free trial period.", 148],
      ["Paid Offer Start", "Plans that began a paid offer period.", 34],
    ],
  },
  {
    key: "offerRenewals",
    label: "Offer Renewals (All)",
    definition: "Offers that renewed to the next period.",
    children: [
      ["Free Trial Renewals", "Free trials that renewed to the next period.", 11],
      ["Paid Offer Renewals", "Paid offers that renewed to the next period.", 26],
    ],
  },
  {
    key: "paidFromOffers",
    label: "Paid Subscriptions from Offers (All)",
    definition: "Offers that converted into paid subscriptions.",
    children: [
      ["Full Price from Free Trial", "Free trials that converted to full price.", 58],
      ["Contingent Price from Free Trial", "Free trials that converted to contingent price.", 3],
      ["Full Price from Paid Offer", "Paid offers that converted to full price.", 15],
      ["Contingent Price from Paid Offer", "Paid offers that converted to contingent price.", 1],
    ],
  },
  {
    key: "paidStarts",
    label: "Paid Subscription Starts (All)",
    definition: "New paid subscriptions that began.",
    children: [
      ["Full Price Subscription Start", "New subscriptions at full price.", 42],
      ["Contingent Price Subscription Start", "New subscriptions at a contingent price.", 2],
    ],
  },
  {
    key: "renewals",
    label: "Renewals (All)",
    definition: "Paid subscriptions that renewed.",
    children: [
      ["Full Price Renewals", "Full price subscriptions that renewed at full price.", 410],
      ["Preserved Price Renewals", "Preserved price subscriptions that renewed.", 96],
      ["Contingent Price Renewals", "Contingent price subscriptions that renewed.", 14],
      ["Contingent Price Renewal from Full Price", "Renewals moving from full to contingent price.", 2],
      ["Contingent Price Renewal from Preserved Price", "Renewals moving from preserved to contingent price.", 1],
      ["Full Price Renewal from Contingent Price", "Renewals moving from contingent to full price.", 3],
      ["Preserved Price Renewal from Contingent Price", "Renewals moving from contingent to preserved price.", 1],
      ["Preserved Price Renewal from Full Price", "Renewals moving from full to preserved price.", 1],
      ["Full Price Renewal from Preserved Price", "Renewals moving from preserved to full price.", 6],
    ],
  },
  {
    key: "commitmentPayments",
    label: "Commitment-Based Payments (All)",
    definition: "Commitment-based subscriptions that made their monthly payment.",
    children: [
      ["Full Price Commitment-Based Payments", "Full price commitment plans that paid.", 18],
      ["Contingent Price Commitment-Based Payments", "Contingent price commitment plans that paid.", 2],
      ["Preserved Price Commitment-Based Payments", "Preserved price commitment plans that paid.", 3],
    ],
  },
  {
    key: "enteredBillingIssue",
    label: "Entered Billing Issue (All)",
    definition: "Subscriptions that entered a billing issue state.",
    upIsGood: false,
    children: [
      ["Entered Grace Period from Full Price", "Full price plans entering a grace period.", 16],
      ["Entered Grace Period from Contingent Price", "Contingent price plans entering a grace period.", 1],
      ["Entered Grace Period from Preserved Price", "Preserved price plans entering a grace period.", 3],
      ["Entered Grace Period from Free Trial", "Free trials entering a grace period.", 7],
      ["Entered Grace Period from Paid Offer", "Paid offers entering a grace period.", 2],
      ["Entered Billing Retry from Full Price", "Full price plans entering billing retry.", 9],
      ["Entered Billing Retry from Contingent Price", "Contingent price plans entering billing retry.", 1],
      ["Entered Billing Retry from Preserved Price", "Preserved price plans entering billing retry.", 2],
      ["Entered Billing Retry from Free Trial", "Free trial conversions entering billing retry.", 5],
      ["Entered Billing Retry from Paid Offer", "Paid offers entering billing retry.", 1],
      ["Entered Billing Retry from Grace Period", "Plans moving from grace period to billing retry.", 8],
    ],
  },
  {
    key: "billingRecoveries",
    label: "Recoveries from Billing Issue (All)",
    definition: "Subscriptions that recovered from a billing issue.",
    children: [
      ["Full Price Recoveries from Grace Period", "Recovered from grace period at full price.", 9],
      ["Contingent Price Recoveries from Grace Period", "Recovered from grace period at contingent price.", 1],
      ["Preserved Price Recoveries from Grace Period", "Recovered from grace period at preserved price.", 2],
      ["Paid Offer Recoveries from Grace Period", "Recovered from grace period into a paid offer.", 1],
      ["Full Price Recoveries from Billing Retry", "Recovered from billing retry at full price.", 5],
      ["Contingent Price Recoveries from Billing Retry", "Recovered from billing retry at contingent price.", 1],
      ["Preserved Price Recoveries from Billing Retry", "Recovered from billing retry at preserved price.", 1],
      ["Paid Offer Recoveries from Billing Retry", "Recovered from billing retry into a paid offer.", 1],
    ],
  },
  {
    key: "involuntaryChurns",
    label: "Involuntary Churns (All)",
    definition: "Subscriptions that churned due to billing issues.",
    upIsGood: false,
    children: [
      ["Involuntary Churns from Free Trials", "Free trials ended by payment failure.", 4],
      ["Involuntary Churns from Paid Offers", "Paid offers ended by payment failure.", 1],
      ["Involuntary Churns from Full Price", "Full price plans ended by payment failure.", 7],
      ["Involuntary Churns from Contingent Price", "Contingent price plans ended by payment failure.", 1],
      ["Involuntary Churns from Preserved Price", "Preserved price plans ended by payment failure.", 2],
    ],
  },
  {
    key: "voluntaryChurns",
    label: "Voluntary Churns (All)",
    definition: "Subscriptions that churned due to user cancellation.",
    upIsGood: false,
    children: [
      ["Voluntary Churns from Free Trials", "Free trials ended by user cancellation.", 38],
      ["Voluntary Churns from Paid Offers", "Paid offers ended by user cancellation.", 6],
      ["Voluntary Churns from Full Price", "Full price plans ended by user cancellation.", 31],
      ["Voluntary Churns from Contingent Price", "Contingent price plans ended by user cancellation.", 1],
      ["Voluntary Churns from Preserved Price", "Preserved price plans ended by user cancellation.", 3],
    ],
  },
  {
    key: "refunds",
    label: "Refunds (All)",
    definition: "Subscription transactions that were refunded.",
    upIsGood: false,
    children: [
      ["Refunds from Paid Offers", "Paid-offer plans that were refunded.", 1],
      ["Refunds from Full Price", "Full-price transactions that were refunded.", 3],
      ["Refunds from Contingent Price", "Contingent-price transactions that were refunded.", 0.4],
      ["Refunds from Preserved Price", "Preserved-price transactions that were refunded.", 0.5],
    ],
  },
  {
    key: "exits",
    label: "Exits (All)",
    definition: "Paid plans or offers that ended when a different one began.",
    children: [
      ["Plan Changes", "Plans that upgraded, crossgraded or downgraded.", 19],
      ["Offer to Offer", "Offers that changed to a different offer.", 3],
      ["Offers from Paid", "Paid subscriptions that changed to an offer.", 7],
    ],
  },
  {
    key: "extensions",
    label: "Extensions (All)",
    definition: "Subscriptions provided with a renewal extension.",
    children: [
      ["Free Trial Extensions", "Free trials given a renewal extension.", 1],
      ["Paid Offer Extensions", "Paid offers given a renewal extension.", 0.5],
      ["Contingent Price Extensions", "Contingent price plans given an extension.", 0.3],
      ["Preserved Price Extensions", "Preserved price plans given an extension.", 0.4],
    ],
  },
]

const camelKey = (label: string) =>
  label
    .replace(/[^a-zA-Z ]/g, "")
    .split(" ")
    .map((word, index) =>
      index
        ? word.charAt(0).toUpperCase() + word.slice(1)
        : word.toLowerCase(),
    )
    .join("")

const subscriptionEvent = createGroup("Subscription Events", "subscriptions", {
  report: "Subscription Event",
  dims: subscriptionEventDims,
})
export const subscriptionEventTree = subscriptionEventGroups.map((group) => {
  const children = group.children.map(([label, definition, base]) => {
    const key = camelKey(label)
    subscriptionEvent({
      key,
      label,
      definition,
      base,
      // Slightly different slopes keep the derived rates moving over time
      growth: 0.2 + unit01(key) * 0.14,
      upIsGood: group.upIsGood ?? true,
    })
    return key
  })
  subscriptionEvent({
    key: group.key,
    label: group.label,
    definition: group.definition,
    kind: "parts",
    parts: children,
    upIsGood: group.upIsGood ?? true,
  })
  return { key: group.key, children }
})

subscriptionRate({
  key: "planStarts",
  label: "Plan Starts",
  definition: "Offer starts plus new paid subscription starts.",
  kind: "parts",
  parts: ["offerStarts", "paidStarts"],
  dims: subscriptionEventDims,
})
subscriptionRate({
  key: "netPaidPlans",
  label: "Net Paid Plans",
  definition: "Paid plans gained minus paid plans lost in the period.",
  kind: "parts",
  parts: ["paidFromOffers", "paidStarts"],
  minus: ["involuntaryChurns", "voluntaryChurnsFromFullPrice"],
  dims: subscriptionEventDims,
})
subscriptionRate({
  key: "churnEvents",
  label: "Churned",
  definition: "Voluntary and involuntary churn events in the period.",
  kind: "parts",
  parts: ["voluntaryChurns", "involuntaryChurns"],
  upIsGood: false,
  dims: subscriptionEventDims,
})
for (const [key, label, definition, numerator, denominator] of [
  ["conversionToPaid", "Conversion Rate (All)", "Completed offers that converted to paid subscriptions.", "paidFromOffers", "offersCompleted"],
  ["trialToPaid", "Trial to Paid Conversion", "Completed trial offers that converted to paid.", "trialConverted", "trialsCompleted"],
  ["paidOfferToPaid", "Paid Offer to Paid Conversion", "Completed paid offers that converted to paid.", "paidOfferConverted", "paidOffersCompleted"],
] as const) {
  subscriptionRate({
    key,
    label,
    definition,
    unit: "percent",
    kind: "ratio",
    ratio: [numerator, denominator],
  })
}
// Denominators and numerators used only by the conversion rates above
for (const [key, label, parts] of [
  ["trialConverted", "Free Trials Converted", ["fullPriceFromFreeTrial", "contingentPriceFromFreeTrial"]],
  ["paidOfferConverted", "Paid Offers Converted", ["fullPriceFromPaidOffer", "contingentPriceFromPaidOffer"]],
  ["trialsCompleted", "Free Trials Completed", ["trialConverted", "voluntaryChurnsFromFreeTrials", "involuntaryChurnsFromFreeTrials"]],
  ["paidOffersCompleted", "Paid Offers Completed", ["paidOfferConverted", "voluntaryChurnsFromPaidOffers", "involuntaryChurnsFromPaidOffers"]],
  ["offersCompleted", "Offers Completed", ["trialsCompleted", "paidOffersCompleted"]],
] as const) {
  subscriptionRate({
    key,
    label,
    definition: "Helper total for subscription conversion rates.",
    kind: "parts",
    parts: [...parts],
    group: "Internal",
  })
}

export const metric = (key: string) => {
  const def = metricIndex.get(key)
  if (!def) throw new Error(`Unknown metric: ${key}`)
  return def
}

export const visibleMetrics = () =>
  metricCatalog.filter(
    (def) =>
      def.group !== "Internal" && def.key !== "downloadsAndPreOrders",
  )

export const metricGroups = () => {
  const groups = new Map<string, MetricDef[]>()
  for (const def of visibleMetrics()) {
    groups.set(def.group, [...(groups.get(def.group) ?? []), def])
  }
  return [...groups.entries()]
}

// ----------------------------------------------------------- Mock generator

const featureIndex = dataLength - 23

export const analyticsEvents = [
  { index: dataLength - 29, label: "Version 3.1.4 released" },
  { index: featureIndex, label: "Featured in Apps We Love" },
  { index: dataLength - 92, label: "Version 3.1.0 released" },
  { index: dataLength - 214, label: "Version 3.0 released" },
]

const seriesCache = new Map<string, { raw: number[]; prefix: number[] }>()

function generated(def: MetricDef) {
  const cached = seriesCache.get(def.key)
  if (cached) return cached
  const seed = (hash(def.shapeOf ?? def.key) % 97) / 7
  const base = def.base ?? 0
  const growth = def.growth ?? 0
  const feature = def.feature ?? 0
  // Plans and rates move slowly; daily activity moves with the week
  const calm = def.kind === "stock" || def.kind === "mean" ? 0.12 : 1
  const raw: number[] = []
  const prefix = [0]
  for (let index = 0; index < dataLength; index += 1) {
    // Compounds to base * (1 + growth) over the newest 180 days and flattens
    // further back so long ranges stay believable.
    const position = (index - (dataLength - 1)) / 180 + 1
    const exponent = position >= 0 ? position : position * 0.35
    const trend = (1 + growth) ** exponent
    const weekly = 1 + calm * 0.08 * Math.sin(((index + seed) / 7) * Math.PI * 2)
    const noise =
      1 +
      calm *
        0.06 *
        Math.sin(index * 1.7 + seed * 3.1) *
        Math.cos(index * 0.37 + seed)
    const spike = 1 + feature * Math.exp(-((index - featureIndex) ** 2) / 10)
    const value = base * trend * weekly * noise * spike
    raw.push(value)
    prefix.push(prefix[index] + value)
  }
  const series = { raw, prefix }
  seriesCache.set(def.key, series)
  return series
}

const shareCache = new Map<string, Map<string, number>>()

// Normalized value shares for one metric family, so every breakdown adds up
// to its total while conversion and revenue still differ between values.
function sharesFor(family: Family, dimension: DimensionKey, platform: Platform) {
  const cacheKey = `${family}|${dimension}|${platform}`
  const cached = shareCache.get(cacheKey)
  if (cached) return cached
  const shares = new Map<string, number>()
  if (dimension === "region") {
    const territory = sharesFor(family, "territory", platform)
    for (const value of dimensions.territory.values) {
      shares.set(
        value.region,
        (shares.get(value.region) ?? 0) + (territory.get(value.name) ?? 0),
      )
    }
  } else {
    const def: DimensionDef = dimensions[dimension]
    const values = def.values.filter(
      (value) => !value.platform || value.platform === platform,
    )
    const unattributed = def.unattributed
    const tilted = values.map((value) => {
      // The unattributed bucket stays stable so small values stay small
      const tilt =
        value.name === unattributed
          ? 1
          : 0.82 + unit01(`${family}|${dimension}|${value.name}`) * 0.36
      return [value.name, value.share * tilt] as const
    })
    const total = tilted.reduce((sum, [, share]) => sum + share, 0)
    for (const [name, share] of tilted) shares.set(name, share / total)
  }
  shareCache.set(cacheKey, shares)
  return shares
}

export const dimensionValues = (dimension: DimensionKey, platform: Platform) =>
  (dimensions[dimension] as DimensionDef).values
    .filter((value) => !value.platform || value.platform === platform)
    .map((value) => value.name)

const platformFactor: Record<Family, number> = {
  store: 0.07,
  downloads: 0.056,
  sales: 0.09,
  usage: 0.09,
  events: 0.05,
  subscriptions: 0.08,
  clips: 0.03,
}

function activeFilters(def: MetricDef, scope: Scope) {
  return (Object.entries(scope.filters) as [DimensionKey, string][]).filter(
    ([dimension]) =>
      def.dims.includes(dimension) &&
      // A territory already pins the region
      !(dimension === "region" && scope.filters.territory),
  )
}

// `at` is a day index: each value's share drifts slowly over time, so values
// grow at different rates instead of all matching the overall trend.
function scaleFor(def: MetricDef, scope: Scope, at: number) {
  const age = (dataLength - at) / 365
  let scale = scope.platform === "macOS" ? platformFactor[def.family] : 1
  for (const [dimension, value] of activeFilters(def, scope)) {
    const drift = unit01(`${def.family}|${dimension}|${value}|drift`) * 0.6 - 0.3
    scale *=
      (sharesFor(def.family, dimension, scope.platform).get(value) ?? 0) *
      Math.max(1 + drift * age, 0.2)
  }
  return scale
}

// Rates are not additive, so a filter nudges them around the overall value
function filterTilt(def: MetricDef, scope: Scope) {
  let tilt = 1
  for (const [dimension, value] of activeFilters(def, scope)) {
    tilt *= 0.88 + unit01(`${def.key}|${dimension}|${value}`) * 0.24
  }
  return tilt
}

const meanTilt = (def: MetricDef, scope: Scope) =>
  filterTilt(def, scope) * (scope.platform === "macOS" ? 1.12 : 1)

export function aggregate(
  key: string,
  from: number,
  to: number,
  scope: Scope,
): number {
  const def = metric(key)
  const days = to - from
  switch (def.kind) {
    case "parts": {
      const positive = (def.parts ?? []).reduce(
        (sum, part) => sum + aggregate(part, from, to, scope),
        0,
      )
      return (def.minus ?? []).reduce(
        (sum, part) => sum - aggregate(part, from, to, scope),
        positive,
      )
    }
    case "ratio": {
      // Both sides see the same filters, or an unsupported one skews the rate
      const narrowed: Scope = {
        ...scope,
        filters: Object.fromEntries(
          activeFilters(def, scope),
        ) as Scope["filters"],
      }
      const [numerator, denominator] = def.ratio ?? ["", ""]
      const bottom = aggregate(denominator, from, to, narrowed)
      if (!bottom) return 0
      const rate = aggregate(numerator, from, to, narrowed) / bottom
      // Shares cancel out within one family, so vary the rate explicitly
      return metric(numerator).family === metric(denominator).family
        ? rate * filterTilt(def, narrowed)
        : rate
    }
    case "stock":
      return generated(def).raw[to - 1] * scaleFor(def, scope, to - 1)
    case "mean": {
      const { prefix } = generated(def)
      return ((prefix[to] - prefix[from]) / days) * meanTilt(def, scope)
    }
    case "unique": {
      const { prefix } = generated(def)
      const mean = (prefix[to] - prefix[from]) / days
      return mean * days ** 0.9 * scaleFor(def, scope, (from + to) / 2)
    }
    default: {
      const { prefix } = generated(def)
      return (prefix[to] - prefix[from]) * scaleFor(def, scope, (from + to) / 2)
    }
  }
}

export const seriesFor = (key: string, buckets: Bucket[], scope: Scope) =>
  buckets.map(([from, to]) => aggregate(key, from, to, scope))

export const isAdditive = (def: MetricDef) =>
  def.kind === "flow" ||
  def.kind === "stock" ||
  (def.kind === "parts" && !def.minus)

export type BreakdownRow = {
  name: string
  value: number
  prior: number
  share: number | null
}

export function breakdown(
  key: string,
  dimension: DimensionKey,
  from: number,
  to: number,
  scope: Scope,
): BreakdownRow[] {
  const def = metric(key)
  const days = to - from
  const hidden = (dimensions[dimension] as DimensionDef).unattributed
  // A filter on this dimension narrows the breakdown to the filtered value
  const pinned =
    dimension === "region" && scope.filters.territory
      ? dimensions.territory.values.find(
          (value) => value.name === scope.filters.territory,
        )?.region
      : scope.filters[dimension]
  const rows = dimensionValues(dimension, scope.platform)
    .filter((name) => name !== hidden && (!pinned || name === pinned))
    .map((name) => {
      const scoped: Scope = {
        ...scope,
        filters: { ...scope.filters, [dimension]: name },
      }
      return {
        name,
        value: aggregate(key, from, to, scoped),
        prior: aggregate(key, from - days, from, scoped),
      }
    })
    .filter((row) => row.value > 0 || !isAdditive(def))
  const total = rows.reduce((sum, row) => sum + row.value, 0)
  return rows
    .map((row) => ({
      ...row,
      share: isAdditive(def) && total ? row.value / total : null,
    }))
    .sort((a, b) => b.value - a.value)
}

// ------------------------------------------------------------- Performance

// Mirrors the perfPowerMetrics response: per-version points for each metric,
// split into typical (p50) and top (p90) users, plus regression insights.
export const perfVersions = ["3.0.2", "3.1.0", "3.1.2", "3.1.3", "3.1.4"]
export type PerfDevice = "All iPhones" | "All iPads" | "Mac"

export const perfMetrics: {
  category: string
  key: string
  label: string
  unit: string
  p50: number[]
  p90: number[]
}[] = [
  { category: "LAUNCH", key: "launchTime", label: "Launch Time", unit: "ms", p50: [768.7, 750, 742.3, 731.9, 806.4], p90: [1532.1, 1490.2, 1466.8, 1441.3, 1618.7] },
  { category: "HANG", key: "hangRate", label: "Hang Rate", unit: "s/hr", p50: [1.12, 1.04, 0.98, 0.91, 0.84], p90: [4.6, 4.2, 3.9, 3.7, 3.4] },
  { category: "ANIMATION", key: "scrollHitchRate", label: "Scroll Hitch Rate", unit: "ms/s", p50: [3.4, 3.1, 3, 2.8, 2.7], p90: [9.8, 9.1, 8.7, 8.2, 8.1] },
  { category: "MEMORY", key: "peakMemory", label: "Peak Memory", unit: "MB", p50: [212, 218, 221, 224, 229], p90: [348, 356, 361, 365, 372] },
  { category: "MEMORY", key: "suspendedMemory", label: "Memory at Suspension", unit: "MB", p50: [64, 63, 62, 62, 61], p90: [101, 99, 98, 97, 96] },
  { category: "DISK", key: "diskWrites", label: "Disk Writes", unit: "MB/day", p50: [18.4, 17.9, 17.2, 16.8, 16.5], p90: [66.1, 63.4, 61.8, 60.2, 59.7] },
  { category: "BATTERY", key: "onScreenBattery", label: "Foreground Battery Usage", unit: "%/hr", p50: [6.1, 5.9, 5.8, 5.7, 5.6], p90: [12.4, 12.1, 11.8, 11.6, 11.5] },
  { category: "BATTERY", key: "backgroundBattery", label: "Background Battery Usage", unit: "%/day", p50: [1.4, 1.3, 1.3, 1.2, 1.2], p90: [3.8, 3.6, 3.5, 3.4, 3.3] },
  { category: "TERMINATION", key: "terminations", label: "Background Terminations", unit: "/day", p50: [0.42, 0.4, 0.37, 0.35, 0.34], p90: [1.6, 1.5, 1.4, 1.35, 1.3] },
]

// -------------------------------------------------------------- Benchmarks

// Peer group percentiles, keyed by metric, for each peer group
export const peerGroups = [
  "Productivity · Subscription",
  "Productivity · All Business Models",
  "All Categories · Subscription",
]

export const benchmarkMetrics: {
  key: string
  p25: number
  p50: number
  p75: number
}[] = [
  { key: "conversion", p25: 0.034, p50: 0.062, p75: 0.098 },
  { key: "proceedsPerUser", p25: 5.4, p50: 8.6, p75: 13.8 },
  { key: "downloadToPaid35", p25: 0.012, p50: 0.026, p75: 0.051 },
  { key: "retention1", p25: 0.21, p50: 0.31, p75: 0.42 },
  { key: "retention7", p25: 0.08, p50: 0.14, p75: 0.22 },
  { key: "retention28", p25: 0.03, p50: 0.07, p75: 0.12 },
  { key: "crashRate", p25: 0.0009, p50: 0.0023, p75: 0.0061 },
]

export const peerGroupFactor = [1, 0.86, 1.18]
