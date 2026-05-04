import Link from 'next/link'

export const metadata = { title: 'Terms of Service — UtsavOS' }

const LAST_UPDATED = 'May 2, 2026'
const COMPANY = 'Utsav'
const EMAIL = 'hello@creativeeraexperiences.com'
const APP_URL = 'https://creativeeraexperiences.com'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10">
          <Link href="/" className="text-sm text-rose-700 hover:underline">← Home</Link>
          <h1 className="text-3xl font-bold text-stone-900 mt-4">Terms of Service</h1>
          <p className="text-stone-500 text-sm mt-2">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="prose prose-stone max-w-none space-y-8 text-stone-700 text-sm leading-relaxed">

          <section>
            <p>
              These Terms of Service ("<strong>Terms</strong>") govern your access to and use of
              UtsavOS (the "<strong>Platform</strong>"), operated by{' '}
              <strong>{COMPANY}</strong> ("<strong>we</strong>", "<strong>us</strong>"). By creating
              an account or using the Platform, you agree to be bound by these Terms. If you do not
              agree, do not use the Platform.
            </p>
          </section>

          <Section title="1. Eligibility">
            <p>
              The Platform is intended for use by professional wedding planners, event management
              companies, and their authorized staff ("<strong>Agency Users</strong>"). You must be
              at least 18 years of age and have the legal authority to enter into these Terms on
              behalf of your organization. Individual consumers planning their own weddings may use
              the B2C features (Utsav Celebrate) under the same Terms.
            </p>
          </Section>

          <Section title="2. Account Registration">
            <p>
              You must provide accurate, complete, and current information during registration. You
              are responsible for maintaining the confidentiality of your credentials and for all
              activity under your account. Notify us immediately at {EMAIL} if you suspect
              unauthorized access.
            </p>
            <p className="mt-2">
              Each company/agency gets one account. Team members are added by the account owner
              with role-based permissions. You may not share credentials across multiple organizations.
            </p>
          </Section>

          <Section title="3. Permitted Use">
            <p>You may use the Platform to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Manage weddings and events for your clients</li>
              <li>Organize guests, vendors, budgets, and logistics</li>
              <li>Share client portals and collect RSVP / preference data</li>
              <li>Coordinate your team with role-based task management</li>
            </ul>
            <p className="mt-3">You may <strong>not</strong>:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Use the Platform for any unlawful purpose or in violation of applicable Indian law</li>
              <li>Resell, sublicense, or white-label the Platform without written consent</li>
              <li>Reverse engineer, decompile, or attempt to extract the Platform's source code</li>
              <li>Upload malicious code, conduct unauthorized penetration testing, or disrupt service</li>
              <li>Store data on the Platform that you do not have the right to process (e.g., data obtained without consent)</li>
              <li>Use the Platform to send spam, unsolicited bulk messages, or fraudulent communications</li>
            </ul>
          </Section>

          <Section title="4. Data Ownership">
            <p>
              <strong>You own your data.</strong> All wedding, guest, vendor, and client data you
              enter into the Platform remains yours. We do not claim ownership over your content.
              You grant us a limited, non-exclusive license to store, process, and display that data
              solely to provide the Platform's services to you.
            </p>
            <p className="mt-2">
              You are responsible for ensuring you have the necessary rights and consents to upload
              and process personal data (including guest data) on the Platform. You act as the
              "Data Fiduciary" under DPDPA for the personal data of your clients and guests.
            </p>
          </Section>

          <Section title="5. Service Availability">
            <p>
              We aim for high availability but do not guarantee uninterrupted service. The Platform
              is provided "<strong>as is</strong>" and "<strong>as available</strong>". We may
              perform scheduled maintenance with reasonable notice. We are not liable for downtime
              caused by factors outside our control (internet outages, third-party service failures,
              force majeure).
            </p>
          </Section>

          <Section title="6. Intellectual Property">
            <p>
              The Platform, its design, code, branding, and features are the intellectual property
              of {COMPANY} and are protected under applicable Indian IP law. You may not copy,
              reproduce, or create derivative works from our Platform without explicit written
              permission.
            </p>
          </Section>

          <Section title="7. Third-Party Integrations">
            <p>
              The Platform integrates with third-party services including Supabase, Vercel, Resend,
              and MSG91. Use of these integrations is subject to their respective terms of service.
              We are not responsible for the availability, reliability, or data practices of these
              third-party providers.
            </p>
          </Section>

          <Section title="8. Limitation of Liability">
            <p>
              To the maximum extent permitted by applicable law, {COMPANY} shall not be liable for
              any indirect, incidental, special, consequential, or punitive damages arising from
              your use of or inability to use the Platform, including but not limited to loss of
              data, loss of revenue, or business interruption.
            </p>
            <p className="mt-2">
              Our total liability to you for any claim arising from these Terms or use of the
              Platform shall not exceed the amount you have paid us in the 3 months preceding the
              claim (or ₹5,000 if no payment has been made).
            </p>
          </Section>

          <Section title="9. Indemnification">
            <p>
              You agree to indemnify and hold harmless {COMPANY}, its directors, employees, and
              agents from any claims, damages, or expenses (including legal fees) arising from:
              (a) your use of the Platform in violation of these Terms; (b) your violation of any
              third-party rights; or (c) any data you upload without proper consent.
            </p>
          </Section>

          <Section title="10. Termination">
            <p>
              You may terminate your account at any time by contacting us at {EMAIL}. We may
              suspend or terminate your account if you violate these Terms, with or without notice
              depending on the severity of the violation.
            </p>
            <p className="mt-2">
              Upon termination, your data is retained for 30 days to allow export, then permanently
              deleted. Provisions relating to intellectual property, liability, and governing law
              survive termination.
            </p>
          </Section>

          <Section title="11. Modifications to Terms">
            <p>
              We may update these Terms periodically. Significant changes will be communicated via
              email or an in-app notice at least 7 days before they take effect. Continued use of
              the Platform after the effective date constitutes acceptance of the revised Terms.
            </p>
          </Section>

          <Section title="12. Governing Law and Dispute Resolution">
            <p>
              These Terms are governed by and construed in accordance with the laws of India.
              Any disputes arising from these Terms shall first be attempted to be resolved
              amicably. If unresolved, disputes shall be subject to the exclusive jurisdiction
              of the courts of Indore, Madhya Pradesh, India.
            </p>
          </Section>

          <Section title="13. Contact">
            <div className="p-4 bg-stone-100 rounded-lg text-stone-700">
              <p><strong>{COMPANY}</strong></p>
              <p>Email: <a href={`mailto:${EMAIL}`} className="text-rose-700 hover:underline">{EMAIL}</a></p>
              <p>Website: <a href={APP_URL} className="text-rose-700 hover:underline">{APP_URL}</a></p>
            </div>
          </Section>

        </div>

        <div className="mt-12 pt-6 border-t border-stone-200 flex gap-6 text-xs text-stone-400">
          <Link href="/privacy" className="hover:text-stone-600">Privacy Policy</Link>
          <Link href="/" className="hover:text-stone-600">Home</Link>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-stone-900 mb-3">{title}</h2>
      {children}
    </section>
  )
}
