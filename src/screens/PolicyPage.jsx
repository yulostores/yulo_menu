// One policy page (Terms, Privacy, Refund, Shipping) from content/policies.js.

import { useNavigate } from "react-router-dom";

import Layout from "@/components/Layout";
import SiteFooter from "@/components/SiteFooter";
import { POLICIES } from "@/content/policies";
import { POLICIES_UPDATED } from "@/content/business";

export default function PolicyPage({ policy }) {
  const navigate = useNavigate();
  const doc = POLICIES[policy];

  return (
    <Layout title={doc.title} showBack onBack={() => navigate("/")}>
      <article className="space-y-5 px-5 py-5 text-sm leading-relaxed">
        <p className="text-xs text-muted-foreground">Last updated: {POLICIES_UPDATED}</p>
        {doc.intro ? <p>{doc.intro}</p> : null}
        {doc.sections.map((section) => (
          <section key={section.heading} className="space-y-2">
            <h2 className="text-base font-bold">{section.heading}</h2>
            {section.body.length > 1 ? (
              <ul className="list-disc space-y-1.5 pl-5">
                {section.body.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p>{section.body[0]}</p>
            )}
          </section>
        ))}
      </article>
      <SiteFooter />
    </Layout>
  );
}
