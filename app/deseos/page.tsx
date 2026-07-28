import { WishlistView } from "@/components/wishlist/wishlist-view";

/**
 * "Deseos" — the wishlist (#37). Lands on the reader-scoped "Quiero leer" view;
 * the "Comprar" tab switches to the household buy list. `/comprar` renders the same
 * screen with that tab active.
 */
export default function DeseosPage() {
  return <WishlistView initialTab="leer" />;
}
