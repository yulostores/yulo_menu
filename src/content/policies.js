// The website's policy pages, as { heading, body } sections (body: paragraphs or bullet lists).
// Written to match how the platform actually behaves — the refund rules are the backend's own
// (yulo_backend/server/services/refund.service.js), the approval window is
// ORDER_APPROVAL_TIMEOUT_MINUTES, the delivery handover is the customer's delivery code. Change a
// rule there, change it here too. Terms and Privacy follow the customer app's copies
// (server/config/appConfig.config.js LEGAL_DOCUMENTS), widened to cover table (QR) ordering.

import { BUSINESS } from "./business";

const { brand, legalName, supportEmail, supportPhone } = BUSINESS;

export const POLICIES = {
  terms: {
    title: "Terms & Conditions",
    intro: `These terms apply to everyone who uses ${brand} — the table menu at partner restaurants (opened by scanning a QR code), the ${brand} customer app and website, and the restaurant partner portal. ${brand} is operated by ${legalName}.`,
    sections: [
      {
        heading: "What we do",
        body: [
          `${brand} is a technology platform. Restaurants listed on ${brand} publish their menus, prices and availability, and accept orders for dine-in (at the table, through the QR menu) and delivery (through the ${brand} app).`,
          "The restaurant prepares the food and is responsible for its quality, hygiene and declared contents (veg / non-veg, allergens). We operate the ordering and payment service and, for delivery orders, arrange a delivery partner.",
        ],
      },
      {
        heading: "Orders and pricing",
        body: [
          "Prices are set by each restaurant and shown in Indian Rupees (₹). The amount shown before you pay — item prices plus any service charge, delivery fee, platform fee and applicable taxes — is exactly what you are charged.",
          "An order is confirmed only when the restaurant accepts it. A restaurant may decline an order, for example when an item is unavailable or the kitchen is closing; you are then refunded in full (see our Cancellation & Refund Policy).",
        ],
      },
      {
        heading: "Payments",
        body: [
          "Online payments (UPI, cards, net banking, wallets) are processed securely by our payment partner, Razorpay. We never see or store your full card number, CVV or UPI PIN.",
          "At a restaurant you may also pay your table bill at the counter (cash, UPI or card) directly to the restaurant.",
        ],
      },
      {
        heading: "Cancellations and refunds",
        body: [
          "Cancellations and refunds are governed by our Cancellation & Refund Policy, which forms part of these terms.",
        ],
      },
      {
        heading: "Your account and conduct",
        body: [
          "You are responsible for the phone number or account you use and for keeping your device secure. Do not place fraudulent orders, abuse restaurant staff or delivery partners, or attempt to disrupt the service — we may suspend accounts that do.",
        ],
      },
      {
        heading: "Restaurant partners",
        body: [
          "Restaurants that join through the partner portal agree to publish accurate menus and prices, honour accepted orders, and comply with food-safety and tax laws. Payouts to restaurants are made weekly, net of the platform fee and settlement charges shown in their statements.",
        ],
      },
      {
        heading: "Liability",
        body: [
          "To the extent the law allows, our liability for any order is limited to the amount paid for that order. We are not liable for the food a restaurant prepares, or for delays caused by events outside our reasonable control.",
        ],
      },
      {
        heading: "Governing law and changes",
        body: [
          "These terms are governed by the laws of India; courts at Bengaluru, Karnataka have jurisdiction. We may update these terms — the “Last updated” date changes when we do, and continued use means you accept the update.",
          `Questions: ${supportEmail} · ${supportPhone}.`,
        ],
      },
    ],
  },

  privacy: {
    title: "Privacy Policy",
    intro: `This policy explains what ${legalName} (“${brand}”, “we”) collects when you use the ${brand} table menu, app or website, and how we use it.`,
    sections: [
      {
        heading: "What we collect",
        body: [
          "Your phone number, and — if you give them — your name, email and delivery addresses.",
          "Your orders, table and restaurant, payments status (never card or UPI credentials), ratings and support requests.",
          "Your delivery location, when you choose to share it to set a delivery point.",
          "Basic device and diagnostic information needed to keep the service working.",
        ],
      },
      {
        heading: "How we use it",
        body: [
          "To place, prepare, serve and deliver your orders; to process payments and refunds; to provide support; to prevent fraud; and to improve the service.",
          "The restaurant you order from — and, for delivery, the assigned delivery partner — receive only the details needed to fulfil that order.",
        ],
      },
      {
        heading: "Payments",
        body: [
          "Payments are processed by Razorpay under its own privacy policy. We receive only the payment status and reference, never your full card number, CVV or UPI PIN.",
        ],
      },
      {
        heading: "What we never do",
        body: ["We do not sell your personal data, and we do not share your contact details beyond the order being fulfilled."],
      },
      {
        heading: "Retention and your choices",
        body: [
          "Order and invoice records are kept as long as tax and accounting rules require; other data is kept while your account is active and then deleted or anonymised.",
          `To access, correct or delete your data, write to ${supportEmail}; we act on requests within 30 days.`,
        ],
      },
    ],
  },

  refund: {
    title: "Cancellation & Refund Policy",
    intro: "How cancellations work, when you get your money back, and how long it takes.",
    sections: [
      {
        heading: "Full refund — automatic",
        body: [
          "The restaurant declines your order.",
          "The restaurant does not accept your order within 15 minutes — the order is cancelled automatically.",
          "You cancel before the restaurant has started preparing your food.",
          "The restaurant or Yulo Stores cancels your order after accepting it (for example, an item ran out).",
          "Your payment went through for an order that had already been cancelled.",
        ],
      },
      {
        heading: "No refund",
        body: [
          "You cancel after the restaurant has started preparing your food. The app asks you to confirm this before the cancellation goes through, because the food is already being made.",
          "Orders already delivered or served — unless there is a problem with the order (see below).",
        ],
      },
      {
        heading: "Problems with an order",
        body: [
          `If an item is missing, wrong or not as described, contact us within 24 hours through Help in the app or at ${supportEmail} with your order number. After checking with the restaurant we may issue a full or partial refund for the affected items.`,
        ],
      },
      {
        heading: "How and when refunds are paid",
        body: [
          "Refunds always go back to the original payment method (UPI, card, net banking or wallet) through Razorpay.",
          "Once a refund is issued it usually reaches you within 5–7 working days, depending on your bank. You can see its status on the order in the app.",
          "If money was deducted but the order was not placed (a failed payment), it is reversed automatically by Razorpay or your bank within 5–7 working days.",
          "Bills paid at the restaurant counter (cash, UPI or card to the restaurant) are refunded by the restaurant directly.",
        ],
      },
    ],
  },

  shipping: {
    title: "Shipping & Delivery Policy",
    intro: `${brand} delivers freshly prepared food from partner restaurants. We do not ship physical goods by courier.`,
    sections: [
      {
        heading: "Dine-in (table QR) orders",
        body: [
          "Orders placed from the table menu are prepared by the restaurant and served at your table. No delivery charge applies.",
        ],
      },
      {
        heading: "Delivery area",
        body: [
          "Each restaurant delivers within its own delivery radius (at most 25 km). The app shows whether a restaurant delivers to your address before you order, and does not accept orders outside the area.",
        ],
      },
      {
        heading: "Delivery time",
        body: [
          "The estimated delivery time is shown before you pay and updated live while you track the order — typically 30–60 minutes depending on preparation time and distance.",
          "Delays can happen in heavy traffic or bad weather; you can follow your delivery partner live in the app.",
        ],
      },
      {
        heading: "Delivery charges",
        body: [
          "The delivery fee depends on the distance from the restaurant to you and is shown, with taxes, at checkout before you pay. Some restaurants offer free delivery above an order value.",
        ],
      },
      {
        heading: "Handover",
        body: [
          "When your order is on its way, the app shows a 4-digit delivery code. Share it with the delivery partner when you receive your food — this confirms the delivery.",
          `If a delivery cannot be completed because of a problem on our side or the restaurant’s, you are refunded in full. Contact ${supportEmail} for any delivery issue.`,
        ],
      },
    ],
  },
};

export const POLICY_LINKS = [
  { to: "/terms", label: "Terms & Conditions" },
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/refund-policy", label: "Cancellation & Refund Policy" },
  { to: "/shipping-policy", label: "Shipping & Delivery Policy" },
  { to: "/contact", label: "Contact Us" },
];
