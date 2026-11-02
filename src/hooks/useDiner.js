// Live customer activity at the table (lib/diner.js): get this phone a diner token for the table
// it scanned, keep the restaurant's live dashboard told what is in the cart, and read back any
// offer the restaurant sends. All best-effort — a failure here never gets in the way of ordering.

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { menuApi } from "@/api/menu.api";
import { dinerToken, forgetDiner, hasOptedOut, saveDiner, setOptedOut, storedDiner } from "@/lib/diner";

const CART_SYNC_DELAY_MS = 800;
const OFFER_POLL_MS = 20_000;

export const dinerKeys = {
  diner: (restaurantId, tableId) => ["diner", restaurantId, tableId],
  offer: (restaurantId, tableId) => ["tableOffer", restaurantId, tableId],
};

/**
 * Makes sure this table has a diner token (or the server's "not here" answer), and returns
 * whether a token is in use. Once a new token arrives, the restaurant is opened once with it so
 * the dashboard sees the visit even though the menu was already loaded.
 */
export function useDinerToken(restaurantId, tableId) {
  const { data } = useQuery({
    queryKey: dinerKeys.diner(restaurantId, tableId),
    enabled: Boolean(restaurantId && tableId) && !hasOptedOut(),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    retry: false,
    queryFn: async () => {
      const saved = storedDiner(restaurantId, tableId);
      if (saved) return { token: saved.token };
      const { data: res } = await menuApi.startDiner(restaurantId, tableId);
      saveDiner(restaurantId, tableId, res.data);
      if (res.data.token) await menuApi.getRestaurant(restaurantId).catch(() => null);
      return { token: res.data.token ?? null };
    },
  });
  return Boolean(data?.token) && Boolean(dinerToken());
}

/**
 * A 401 from a diner-only endpoint means the server no longer accepts this phone's token:
 * forget it and ask for a fresh one, so live activity picks up again by itself.
 */
function useRenewOnRejection(restaurantId, tableId) {
  const qc = useQueryClient();
  return (err) => {
    if (err?.status !== 401) return;
    forgetDiner();
    qc.invalidateQueries({ queryKey: dinerKeys.diner(restaurantId, tableId) });
  };
}

/** Sends the phone's cart to the table's live session a moment after it changes. */
export function useCartSync(restaurantId, tableId, cart, active) {
  const renew = useRenewOnRejection(restaurantId, tableId);
  const lastSent = useRef(null);
  useEffect(() => {
    if (!active) return undefined;
    const items = cart.map((line) => ({ menuItemId: line.menuItemId, quantity: line.quantity }));
    const body = JSON.stringify(items);
    if (body === lastSent.current) return undefined;
    const timer = setTimeout(() => {
      lastSent.current = body;
      menuApi.syncCart(restaurantId, tableId, items).catch((err) => {
        lastSent.current = null;
        renew(err);
      });
    }, CART_SYNC_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, tableId, cart, active]);
}

/** The offer the restaurant sent this diner, if any — checked every 20 seconds. */
export function useTableOffer(restaurantId, tableId, active) {
  const renew = useRenewOnRejection(restaurantId, tableId);
  return useQuery({
    queryKey: dinerKeys.offer(restaurantId, tableId),
    enabled: Boolean(active && restaurantId && tableId),
    queryFn: () =>
      menuApi
        .getTableOffer(restaurantId, tableId)
        .then((r) => r.data.data.offer ?? null)
        .catch((err) => {
          renew(err);
          return null;
        }),
    refetchInterval: OFFER_POLL_MS,
    staleTime: 0,
    retry: false,
  });
}

/** Marks an offer seen, once per offer on this phone. */
export function useMarkOfferSeen(restaurantId, tableId, offer) {
  const seen = useRef(new Set());
  useEffect(() => {
    if (!offer || offer.status === "viewed" || offer.status === "applied" || seen.current.has(offer.id)) return;
    seen.current.add(offer.id);
    menuApi.viewTableOffer(restaurantId, tableId, offer.id).catch(() => seen.current.delete(offer.id));
  }, [restaurantId, tableId, offer]);
}

/** "Don't share my activity": the diner's guest account stops sharing, and the phone forgets it. */
export function useStopSharing() {
  const qc = useQueryClient();
  const [done, setDone] = useState(false);
  const mutation = useMutation({
    mutationFn: () => menuApi.stopSharing().catch(() => null),
    onSettled: () => {
      setOptedOut();
      setDone(true);
      qc.removeQueries({ queryKey: ["tableOffer"] });
      qc.removeQueries({ queryKey: ["diner"] });
    },
  });
  return { stop: () => mutation.mutate(), stopping: mutation.isPending, stopped: done };
}
