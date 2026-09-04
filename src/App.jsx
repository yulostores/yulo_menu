// Flat routing — nothing else shares this origin, so there's no need for the /order/*
// prefix yulo_restaurant uses to carve its customer app out of a bigger portal bundle.
// The table QR lands on "/" with ?r=<restaurantId>&t=<tableId> (see
// TableSessionContext), every other route just reads the persisted session.

import { Navigate, Route, Routes } from "react-router-dom";

import Landing from "./screens/Landing";
import Menu from "./screens/Menu";
import ItemDetail from "./screens/ItemDetail";
import Cart from "./screens/Cart";
import OrderStatus from "./screens/OrderStatus";
import Help from "./screens/Help";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/menu" element={<Menu />} />
      <Route path="/item/:id" element={<ItemDetail />} />
      <Route path="/cart" element={<Cart />} />
      <Route path="/status" element={<OrderStatus />} />
      <Route path="/help" element={<Help />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
