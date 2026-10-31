// Who runs Yulo Stores — shown on the home page footer, the Contact page and every policy page.
// One place, so the details a payment gateway or a customer checks are the same everywhere.
// Keep these identical to the business details registered with Razorpay (KYC): a mismatch in
// the legal name or address is a common reason a website review is sent back. The same block
// lives in the backend's server/config/appConfig.config.js (ABOUT) for the customer app.

export const BUSINESS = {
  brand: "Yulo Stores",
  legalName: "Yulo Stores Technologies Pvt. Ltd.",
  addressLines: [
    "4th Floor, Prestige Sigma",
    "Vittal Mallya Road, Bengaluru 560001",
    "Karnataka, India",
  ],
  supportEmail: "support@yulostores.in",
  supportPhone: "+91 1800 200 1234",
  supportHours: "Every day, 9:00 AM – 11:00 PM IST",
  website: "https://yulostores.in",
  // The restaurant partner portal — linked from the home page for restaurant owners.
  restaurantPortalUrl:
    import.meta.env.VITE_RESTAURANT_PORTAL_URL || "https://yulo-restaurant.vercel.app/owner/login",
};

// Shown as "Last updated" on every policy page.
export const POLICIES_UPDATED = "1 November 2026";
