// Documents returned by Fire's backend (see service/api/openapi.yaml).

export type App = { id: string; name: string; bundleId: string; sku: string; primaryLocale: string; iconUrl?: string }

export type Version = {
  id: string
  platform: string
  versionString: string
  state: string
  releaseType: string
  earliestReleaseDate?: string
  copyright: string
  createdDate: string
  editable: boolean
  buildId?: string
  buildNumber?: string
}

export type BuildStatus = "processing" | "review" | "testing" | "rejected" | "ready" | "expired"

export type Build = {
  id: string
  number: string
  version: string
  platform: string
  uploadedDate: string
  expirationDate: string
  expired: boolean
  processingState: string
  internalState: string
  externalState: string
  minOsVersion: string
  status: BuildStatus
}

export type BetaGroup = { id: string; name: string; internal: boolean; publicLinkEnabled: boolean; publicLink?: string; testers: number }

export type BuildDetail = Build & {
  bundleId: string
  usesNonExemptEncryption: boolean | null
  whatToTest: { id: string; locale: string; text: string } | null
  groups: BetaGroup[]
  usage: { installs: number; sessions: number; crashes: number; feedback: number; invites: number } | null
  feedback: { id: string; kind: "screenshot" | "crash"; comment: string; email: string; device: string; osVersion: string; createdDate: string }[]
}

export type BuildsPage = { builds: Build[]; groups: BetaGroup[]; testers: number }

export type Submission = {
  id: string
  state: string
  platform: string
  submittedDate: string
  submittedBy: string
  versionId?: string
  version?: string
  versionState?: string
  buildNumber?: string
  items: { id: string; state: string; kind: string }[]
}

export type Overview = {
  app: App
  versions: Version[]
  builds: Build[]
  submissions: Submission[]
  locales: { locale: string; filled: number; total: number }[]
}

export type Locale = {
  locale: string
  appInfoLocalizationId?: string
  versionLocalizationId?: string
  name: string
  subtitle: string
  privacyPolicyUrl: string
  privacyChoicesUrl: string
  description: string
  keywords: string
  promotionalText: string
  whatsNew: string
  supportUrl: string
  marketingUrl: string
}

export type ReviewDetail = {
  id: string
  contactFirstName: string
  contactLastName: string
  contactPhone: string
  contactEmail: string
  demoAccountRequired: boolean
  demoAccountName: string
  demoAccountPassword: string
  notes: string
}

export type Metadata = {
  app: App
  versions: Version[]
  version: Version | null
  appInfo: { id: string; state: string; ageRating: string; primaryCategory: string; secondaryCategory: string; editable: boolean } | null
  locales: Locale[]
  reviewDetail: ReviewDetail | null
  categories: string[]
}

export type ScreenshotSet = { id: string; displayType: string; screenshots: { id: string; fileName: string; url: string; width: number; height: number }[] }

export type Product = {
  id: string
  kind: "iap" | "subscription"
  name: string
  productId: string
  type: string
  state: string
  period?: string
  groupId?: string
  groupLevel?: number
  familySharable: boolean
  reviewNote: string
}

export type Purchases = { groups: { id: string; name: string; products: Product[] }[]; oneTime: Product[] }

export type ProductDetail = {
  product: Product
  localizations: { id: string; locale: string; name: string; description: string; state: string }[]
  prices: { territory: string; currency: string; customerPrice: string; proceeds: string; startDate?: string; scheduled: boolean; manual: boolean }[]
}

export type SalesBreakdown = { key: string; title?: string; kind?: string; downloads: number; purchases: number; units: number; proceeds: Record<string, number> }

export type Sales = {
  from: string
  to: string
  days: { date: string; available: boolean; downloads: number; redownloads: number; updates: number; purchases: number; proceeds: Record<string, number> }[]
  territories: SalesBreakdown[]
  products: SalesBreakdown[]
  currencies: string[]
}

export type TeamUser = { id: string; username: string; firstName: string; lastName: string; roles: string[]; allAppsVisible: boolean }
export type Invitation = { id: string; email: string; firstName: string; lastName: string; roles: string[]; allAppsVisible: boolean; expirationDate: string }
export type Team = { users: TeamUser[]; invitations: Invitation[] }

export type Session = { serverKey: { keyId: string; issuerId?: string; keyType: "team" | "individual" } | null; version: string }
