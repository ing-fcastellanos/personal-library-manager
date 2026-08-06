import { ActivityFeed } from "@/components/audit/activity-feed";

/**
 * Recent activity (#40): who did what across books, copies, and reading events.
 * Settings sub-page, same shape as `/ajustes/qr` and `/ajustes/series` — not a
 * bottom-nav entry.
 */
export default function ActividadPage() {
  return <ActivityFeed />;
}
