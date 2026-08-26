export type LicenceStatus = "Active" | "Pending" | "Reserved" | "Suspended" | "Expired" | "Cancelled";

export const STATUS_LIST: LicenceStatus[] = ["Active", "Pending", "Reserved", "Suspended", "Expired", "Cancelled"];

export const STATUS_COLORS: Record<LicenceStatus, string> = {
  Active: "#16A34A",
  Pending: "#D97706",
  Reserved: "#0891B2",
  Suspended: "#EA580C",
  Expired: "#94A3B8",
  Cancelled: "#DC2626",
};

/** Default visibility per status when the app first loads — all statuses on by default. */
export const DEFAULT_STATUS_VISIBILITY: Record<LicenceStatus, boolean> = {
  Active: true,
  Pending: true,
  Reserved: true,
  Suspended: true,
  Expired: true,
  Cancelled: true,
};

export const PALETTE = {
  appBg: "#F8FAFC",
  panelBg: "#FFFFFF",
  border: "#E2E8F0",
  borderStrong: "#CBD5E1",
  brandNavy: "#0F2A43",
  brandNavyBorder: "#0B2136",
  brandField: "#173953",
  brandFieldBorder: "#1E4262",
  accentBlue: "#1D4E89",
  accentBlueHover: "#173D6E",
  linkBlue: "#93C5FD",
  logoAmber: "#D97706",
  textPrimary: "#1E293B",
  textSecondary: "#334155",
  textMuted: "#64748B",
  textFaint: "#94A3B8",
  onDarkPrimary: "#F8FAFC",
  onDarkSecondary: "#CBD5E1",
} as const;

export function statusColor(status: string): string {
  return STATUS_COLORS[status as LicenceStatus] ?? "#64748B";
}
