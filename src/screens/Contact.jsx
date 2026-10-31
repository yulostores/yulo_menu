// Contact Us — the business behind Yulo Stores and how to reach support.

import { useNavigate } from "react-router-dom";
import { Clock, Mail, MapPin, Phone } from "lucide-react";

import Layout from "@/components/Layout";
import SiteFooter from "@/components/SiteFooter";
import { BUSINESS } from "@/content/business";

function Row({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-orange" />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}

export default function Contact() {
  const navigate = useNavigate();
  return (
    <Layout title="Contact Us" showBack onBack={() => navigate("/")}>
      <div className="space-y-5 px-5 py-5">
        <p className="text-sm leading-relaxed">
          Questions about an order, a payment or a refund? We&apos;re here to help. Please include your order
          number if you have one.
        </p>
        <div className="space-y-4 rounded-2xl border border-brand-cream/70 bg-white p-4">
          <Row icon={Mail} label="Email">
            <a href={`mailto:${BUSINESS.supportEmail}`} className="font-semibold text-brand-orange">
              {BUSINESS.supportEmail}
            </a>
          </Row>
          <Row icon={Phone} label="Phone">
            <a href={`tel:${BUSINESS.supportPhone.replace(/\s/g, "")}`} className="font-semibold">
              {BUSINESS.supportPhone}
            </a>
          </Row>
          <Row icon={Clock} label="Support hours">
            {BUSINESS.supportHours}
          </Row>
          <Row icon={MapPin} label="Registered office">
            <p className="font-semibold">{BUSINESS.legalName}</p>
            {BUSINESS.addressLines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </Row>
        </div>
      </div>
      <SiteFooter />
    </Layout>
  );
}
