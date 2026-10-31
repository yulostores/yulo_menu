// The website footer: who runs Yulo Stores and the policy pages. On the home page and every
// policy page — payment gateways (and customers) look for exactly these links.

import { Link } from "react-router-dom";

import { BUSINESS } from "@/content/business";
import { POLICY_LINKS } from "@/content/policies";

export default function SiteFooter() {
  return (
    <footer className="border-t border-brand-cream/70 bg-white px-5 py-6 text-xs text-muted-foreground">
      <nav className="flex flex-wrap gap-x-4 gap-y-2">
        {POLICY_LINKS.map((link) => (
          <Link key={link.to} to={link.to} className="font-semibold text-[#5a403e] hover:text-brand-orange">
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="mt-4 space-y-0.5 leading-relaxed">
        <p className="font-semibold text-[#24190f]">{BUSINESS.legalName}</p>
        {BUSINESS.addressLines.map((line) => (
          <p key={line}>{line}</p>
        ))}
        <p>
          <a href={`mailto:${BUSINESS.supportEmail}`} className="hover:text-brand-orange">
            {BUSINESS.supportEmail}
          </a>
          {" · "}
          <a href={`tel:${BUSINESS.supportPhone.replace(/\s/g, "")}`} className="hover:text-brand-orange">
            {BUSINESS.supportPhone}
          </a>
        </p>
      </div>
      <p className="mt-4">
        © {new Date().getFullYear()} {BUSINESS.legalName} · Payments secured by Razorpay
      </p>
    </footer>
  );
}
