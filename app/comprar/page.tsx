import { WishlistView } from "@/components/wishlist/wishlist-view";

/**
 * "Comprar" — the household buy list (#37). The same Deseos screen as `/deseos`,
 * opened with the "Comprar" tab active (design nav option A).
 */
export default function ComprarPage() {
  return <WishlistView initialTab="comprar" />;
}
