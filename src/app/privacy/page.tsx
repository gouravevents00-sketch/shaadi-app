import Link from 'next/link'

export const metadata = { title: 'Privacy Policy — UtsavOS' }

const LAST_UPDATED = 'May 2, 2026'
const COMPANY = 'Utsav'
const EMAIL = 'hello@creativeeraexperiences.com'
const APP_URL = 'https://creativeeraexperiences.com'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="text-sm text-rose-700 hover:underline">← Home</Link>
          <h1 className="text-3xl font-bold text-stone-900 mt-4">Privacy Policy</h1>
          <p className="text-stone-500 text-sm mt-2">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="prose prose-stone max-w-none space-y-8 text-stone-700 text-sm leading-relaxed">

          <section>
            <p>
              {COMPANY} ("<strong>we</strong>", "<strong>us</strong>", "<strong>our</strong>") operates
              the UtsavOS platform at <strong>{APP_URL}</strong> ("<strong>Platform</strong>").
              This Privacy Policy explains how we collect, use, store, and protect personal
              information when you use our Platform, in accordance with India's Digital Personal Data
              Protection Act, 2023 ("<strong>DPDPA</strong>") and the Information Technology Act, 2000.
            </p>
            <p className="mt-3">
              By using the Platform, you consent to the practices described in this policy.
            </p>
          </section>

          <Section title="1. Who We Are and What We Do">
            <p>
              UtsavOS is a wedding and event operations management platform used by
              professional wedding planners and event management companies ("Agencies") to manage
              weddings, guest lists, vendor coordination, budgets, and client communication.
            </p>
            <p className="mt-2">
              Agencies create accounts on our Platform and use it to manage their clients' wedding
              operations. Wedding guests whose data is entered or who submit RSVPs through the
              Platform are "Data Principals" as defined under DPDPA.
            </p>
          </Section>

          <Section title="2. What Data We Collect">
            <SubHead>From Agency Users (Planners &amp; Staff)</SubHead>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Name, email address, and password (for account creation)</li>
              <li>Company name and business details</li>
              <li>Usage activity on the Platform (pages visited, features used)</li>
            </ul>

            <SubHead>From Wedding Guests (via RSVP or entered by Agency)</SubHead>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Name, phone number, email address</li>
              <li>Dietary requirements and preferences</li>
              <li>Travel arrival and departure details</li>
              <li>Room/accommodation assignments</li>
              <li>Wedding attendance and event RSVP responses</li>
              <li>Any additional notes entered by the wedding planning agency</li>
            </ul>

            <SubHead>From Client Couples (via Client Portal)</SubHead>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Name, phone, email</li>
              <li>Wedding preferences, requirements, and approvals submitted through the portal</li>
            </ul>

            <SubHead>Technical Data (all users)</SubHead>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>IP address, browser type, device information</li>
              <li>Session and authentication tokens (via Supabase)</li>
            </ul>
          </Section>

          <Section title="3. How We Use Your Data">
            <p>We use personal data for the following purposes:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Platform operation:</strong> To provide, maintain, and improve the wedding management services</li>
              <li><strong>Guest management:</strong> To allow agencies to manage RSVP, attendance, dietary needs, room allocation, and logistics for wedding events</li>
              <li><strong>Communication:</strong> To send RSVP confirmations, event reminders, and platform notifications (email/WhatsApp, with consent)</li>
              <li><strong>Authentication:</strong> To verify user identity and manage secure access</li>
              <li><strong>Support:</strong> To respond to queries and troubleshoot issues</li>
              <li><strong>Legal compliance:</strong> To meet obligations under applicable law</li>
            </ul>
            <p className="mt-3">
              We do <strong>not</strong> sell, rent, or share your personal data with third parties
              for their marketing purposes.
            </p>
          </Section>

          <Section title="4. Data Storage and Security">
            <p>
              All data is stored on <strong>Supabase</strong> (PostgreSQL database hosted on AWS
              infrastructure in the ap-south-1 region, India). We implement:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Row-Level Security (RLS) policies so companies can only access their own data</li>
              <li>Encrypted connections (TLS/HTTPS) for all data in transit</li>
              <li>Encrypted storage at rest via Supabase</li>
              <li>Role-based access controls limiting which staff can view sensitive data</li>
            </ul>
          </Section>

          <Section title="5. Data Sharing">
            <p>We share data only in these limited circumstances:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Within the Agency:</strong> Guest and wedding data is accessible to the agency's own team members (based on their assigned role and permissions)</li>
              <li><strong>Service Providers:</strong> We use Supabase (database), Vercel (hosting), Resend (email), and MSG91 (WhatsApp/SMS) as infrastructure providers who process data on our behalf under data processing agreements</li>
              <li><strong>Legal requirement:</strong> If required by law, court order, or government authority under applicable Indian law</li>
            </ul>
          </Section>

          <Section title="6. Guest Data and RSVP Consent">
            <p>
              When a wedding guest submits an RSVP through the Platform, they are providing
              personal data directly to the wedding planning agency managing their event. By
              submitting the RSVP form, guests consent to their data being:
            </p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Stored and used by the wedding planning agency for event logistics</li>
              <li>Shared with the wedding couple and relevant event staff</li>
              <li>Used to communicate event-related information (confirmations, reminders)</li>
            </ul>
            <p className="mt-2">
              Guests may contact the wedding planning agency directly to request access to,
              correction of, or deletion of their personal data.
            </p>
          </Section>

          <Section title="7. Data Retention">
            <p>
              We retain personal data for as long as the Agency account is active. Agencies may
              delete individual guest records or wedding data at any time from within the Platform.
              Upon account termination, data is retained for 30 days to allow data export, then
              permanently deleted.
            </p>
          </Section>

          <Section title="8. Your Rights (DPDPA 2023)">
            <p>Under the Digital Personal Data Protection Act, 2023, you have the right to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Access:</strong> Request a summary of your personal data we hold</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data</li>
              <li><strong>Erasure:</strong> Request deletion of your personal data (subject to legal obligations)</li>
              <li><strong>Grievance redressal:</strong> Raise a complaint with our Data Protection Officer</li>
            </ul>
            <p className="mt-2">
              To exercise any of these rights, email us at <strong>{EMAIL}</strong>.
              We will respond within 30 days.
            </p>
          </Section>

          <Section title="9. Cookies">
            <p>
              We use essential cookies only — for authentication sessions and security. We do not
              use advertising cookies or third-party tracking cookies. No cookie consent banner is
              required for essential cookies under applicable law.
            </p>
          </Section>

          <Section title="10. Children's Privacy">
            <p>
              The Platform is not directed at individuals under the age of 18. We do not knowingly
              collect personal data from minors. If you believe we have inadvertently collected data
              from a minor, contact us at {EMAIL} and we will delete it promptly.
            </p>
          </Section>

          <Section title="11. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. Material changes will be
              communicated via email or a prominent notice on the Platform. Continued use after
              changes constitutes acceptance of the updated policy.
            </p>
          </Section>

          <Section title="12. Contact Us / Grievance Officer">
            <p>
              For privacy-related queries, complaints, or to exercise your data rights, contact:
            </p>
            <div className="mt-2 p-4 bg-stone-100 rounded-lg text-stone-700">
              <p><strong>{COMPANY}</strong></p>
              <p>Grievance / Data Protection Officer</p>
              <p>Email: <a href={`mailto:${EMAIL}`} className="text-rose-700 hover:underline">{EMAIL}</a></p>
              <p>Website: <a href={APP_URL} className="text-rose-700 hover:underline">{APP_URL}</a></p>
            </div>
          </Section>

        </div>

        <div className="mt-12 pt-6 border-t border-stone-200 flex gap-6 text-xs text-stone-400">
          <Link href="/terms" className="hover:text-stone-600">Terms of Service</Link>
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

function SubHead({ children }: { children: React.ReactNode }) {
  return <p className="font-semibold text-stone-800 mt-4 mb-1">{children}</p>
}
