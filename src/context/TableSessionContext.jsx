// Session context for the whole app — reads ?r=<restaurantId>&t=<tableId> off the QR
// link once, persists it (and the cart) to localStorage so a page refresh or a redirect
// mid-flow doesn't lose the table. No auth of any kind — ported logic from
// yulo_restaurant/src/screens/customer/CustomerApp.jsx, minus the login/Guard wiring
// that app needs and this one doesn't.

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

const SESSION_KEY = "yulo_menu_session";
const CART_KEY = "yulo_menu_cart";

const EMPTY_SESSION = { restaurantId: null, tableId: null, guestPhone: "", savedAt: 0 };

// A table and cart remembered on this phone go stale: a guest who opens the app hours later
// (from the browser history, not by scanning) is not still sitting at that table. Past this
// the stored table and cart are dropped and the guest is asked to scan again.
const SESSION_TTL_MS = 6 * 60 * 60 * 1000;

function isExpired(saved) {
  return !saved?.savedAt || Date.now() - saved.savedAt > SESSION_TTL_MS;
}

function readJson(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

const TableSessionContext = createContext(null);

export function useTableSession() {
  const ctx = useContext(TableSessionContext);
  if (!ctx) throw new Error("useTableSession must be used within TableSessionProvider");
  return ctx;
}

export function TableSessionProvider({ children }) {
  const [params] = useSearchParams();
  const [expiredOnLoad] = useState(() => isExpired(readJson(SESSION_KEY, EMPTY_SESSION)));
  const [session, setSession] = useState(() =>
    expiredOnLoad ? EMPTY_SESSION : readJson(SESSION_KEY, EMPTY_SESSION),
  );
  const [cart, setCart] = useState(() => {
    if (expiredOnLoad) return [];
    try {
      const raw = window.localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const urlRestaurantId = params.get("r");
  const urlTableId = params.get("t");

  // Switching tables (a different QR scanned on the same device — another restaurant, or
  // another table of the same one) clears the cart: what was picked for one table must not
  // be ordered onto another's bill. Scanning also restarts the stale-session clock.
  useEffect(() => {
    if (!urlRestaurantId && !urlTableId) return;
    setSession((current) => {
      const nextRestaurant = urlRestaurantId ?? current.restaurantId;
      const nextTable = urlTableId ?? current.tableId;
      const switched =
        (current.restaurantId && nextRestaurant !== current.restaurantId) ||
        (current.tableId && nextTable !== current.tableId);
      if (switched) setCart([]);
      return { ...current, restaurantId: nextRestaurant, tableId: nextTable, savedAt: Date.now() };
    });
  }, [urlRestaurantId, urlTableId]);

  useEffect(() => {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }, [session]);

  useEffect(() => {
    window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
    // Using the cart counts as still being at the table.
    if (cart.length > 0) setSession((current) => (current.restaurantId ? { ...current, savedAt: Date.now() } : current));
  }, [cart]);

  const api = useMemo(() => {
    function addToCart(item, quantity = 1, specialInstructions = "") {
      setCart((current) => {
        const existing = current.find((line) => line.menuItemId === item._id);
        if (existing) {
          return current.map((line) =>
            line.menuItemId === item._id
              ? {
                  ...line,
                  quantity: line.quantity + quantity,
                  specialInstructions: specialInstructions || line.specialInstructions,
                }
              : line,
          );
        }
        return [
          ...current,
          {
            menuItemId: item._id,
            name: item.name,
            price: item.effectivePrice ?? item.discountedPrice ?? item.sellingPrice ?? 0,
            image: item.image ?? null,
            foodType: item.foodType,
            quantity,
            specialInstructions,
          },
        ];
      });
    }

    function setQuantity(menuItemId, quantity) {
      setCart((current) =>
        quantity <= 0
          ? current.filter((line) => line.menuItemId !== menuItemId)
          : current.map((line) =>
              line.menuItemId === menuItemId ? { ...line, quantity } : line,
            ),
      );
    }

    function removeFromCart(menuItemId) {
      setCart((current) => current.filter((line) => line.menuItemId !== menuItemId));
    }

    function clearCart() {
      setCart([]);
    }

    function setGuestPhone(guestPhone) {
      setSession((current) => ({ ...current, guestPhone }));
    }

    return { addToCart, setQuantity, removeFromCart, clearCart, setGuestPhone };
  }, []);

  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const cartTotal = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);

  const value = { session, cart, cartCount, cartTotal, ...api };

  return <TableSessionContext.Provider value={value}>{children}</TableSessionContext.Provider>;
}
