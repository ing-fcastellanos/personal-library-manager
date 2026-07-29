import { LoansView } from "@/components/loans/loans-view";

/**
 * "Préstamos" (#39). Everything currently out, grouped by borrower, plus the
 * closed-loan history. Reached from the catalog's "Afuera" chip and each
 * book's per-copy loan card — no 7th bottom-nav item (design decision).
 */
export default function PrestamosPage() {
  return <LoansView />;
}
