// Flat routing — nothing else shares this origin, so there's no need for the /order/*
// prefix yulo_restaurant uses to carve its customer app out of a bigger portal bundle.
// The table QR lands on "/" with ?r=<restaurantId>&t=<tableId> (see
// TableSessionContext) straight into the menu (Menu.jsx's own header shows the
// "Welcome to <restaurant>" greeting) — every other route just reads the persisted session.

import { Navigate, Route, Routes } from "react-router-dom";

import Menu from "./screens/Menu";
import ItemDetail from "./screens/ItemDetail";
import Cart from "./screens/Cart";
import OrderStatus from "./screens/OrderStatus";
import Bill from "./screens/Bill";
import Help from "./screens/Help";
import PolicyPage from "./screens/PolicyPage";
import Contact from "./screens/Contact";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Menu />} />
      <Route path="/menu" element={<Menu />} />
      <Route path="/item/:id" element={<ItemDetail />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/status" element={<OrderStatus />} />
      <Route path="/bill" element={<Bill />} />
      <Route path="/help" element={<Help />} />
      {/* The website's policy pages — linked from the home page footer. */}
      <Route path="/terms" element={<PolicyPage policy="terms" />} />
      <Route path="/privacy" element={<PolicyPage policy="privacy" />} />
      <Route path="/refund-policy" element={<PolicyPage policy="refund" />} />
      <Route path="/shipping-policy" element={<PolicyPage policy="shipping" />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
