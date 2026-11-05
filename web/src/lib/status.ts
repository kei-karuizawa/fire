import type { Build, Product, Submission } from "./types"

// Fire's summary of a review submission.
export type SubmissionStatus = "draft" | "waiting" | "inReview" | "rejected" | "canceling" | "approved" | "removed"

export function submissionStatus(sub: Submission): SubmissionStatus {
  switch (sub.state) {
    case "READY_FOR_REVIEW":
      return "draft"
    case "WAITING_FOR_REVIEW":
      return "waiting"
    case "IN_REVIEW":
      return "inReview"
    case "UNRESOLVED_ISSUES":
      return "rejected"
    case "CANCELING":
      return "canceling"
  }
  if (sub.items.some((item) => item.state === "REJECTED")) return "rejected"
  if (sub.items.length > 0 && sub.items.every((item) => item.state === "REMOVED")) return "removed"
  return "approved"
}

// CSS tone classes from the design system.
export function submissionTone(status: SubmissionStatus) {
  if (status === "approved") return "approved"
  if (status === "rejected") return "rejected"
  if (status === "waiting" || status === "inReview") return "review"
  return "withdrawn"
}

export const buildTone = (build: Pick<Build, "status">) => (build.status === "ready" ? "live" : build.status)

export type ProductTone = "approved" | "review" | "missing" | "rejected" | "removed"

export function productTone(product: Pick<Product, "state">): ProductTone {
  switch (product.state) {
    case "APPROVED":
      return "approved"
    case "WAITING_FOR_REVIEW":
    case "IN_REVIEW":
    case "PENDING_BINARY_APPROVAL":
    case "WAITING_FOR_UPLOAD":
    case "PROCESSING_CONTENT":
      return "review"
    case "MISSING_METADATA":
    case "READY_TO_SUBMIT":
      return "missing"
    case "DEVELOPER_ACTION_NEEDED":
    case "REJECTED":
      return "rejected"
  }
  return "removed"
}

export const platformLabel = (platform: string) =>
  ({ IOS: "iOS", MAC_OS: "macOS", TV_OS: "tvOS", VISION_OS: "visionOS" })[platform] ?? platform
