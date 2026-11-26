/** Visual identity per ad platform (matched by name, case-insensitive). */
export const PLATFORM_STYLE: Record<string, { color: string; short: string }> = {
  meta: { color: "#1877F2", short: "Meta" },
  tiktok: { color: "#111111", short: "TikTok" },
  snapchat: { color: "#E6C700", short: "Snap" },
  "google ads": { color: "#34A853", short: "Google" },
  google: { color: "#34A853", short: "Google" },
  x: { color: "#000000", short: "X" },
  linkedin: { color: "#0A66C2", short: "in" },
  youtube: { color: "#FF0000", short: "YT" },
};

export function platformStyle(name: string) {
  return PLATFORM_STYLE[name.trim().toLowerCase()] ?? { color: "#64748B", short: name.slice(0, 6) };
}
