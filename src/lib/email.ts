import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM_EMAIL || 'noreply@creativeeraos.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://shaadi-app-eight.vercel.app'

// ── New lead → notify agency members ──────────────────────────
export async function sendNewLeadEmail({
  toEmails,
  companyName,
  celebrationName,
  celebrationType,
  clientEmail,
  message,
}: {
  toEmails: string[]
  companyName: string
  celebrationName: string
  celebrationType: string
  clientEmail: string
  message?: string | null
}) {
  if (!process.env.RESEND_API_KEY || !toEmails.length) return

  await resend.emails.send({
    from: `Creative Era OS <${FROM}>`,
    to: toEmails,
    subject: `New lead: ${celebrationName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1c1917">
        <div style="background:#9f1239;padding:24px 32px;border-radius:12px 12px 0 0">
          <p style="color:#fda4af;margin:0;font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase">Creative Era OS</p>
          <h1 style="color:#fff;margin:8px 0 0;font-size:22px;font-weight:700">New lead request</h1>
        </div>
        <div style="background:#fff;border:1px solid #e7e5e4;border-top:none;border-radius:0 0 12px 12px;padding:28px 32px">
          <p style="margin:0 0 20px;font-size:15px;color:#44403c">
            A client wants to connect with <strong>${companyName}</strong> on Creative Era OS.
          </p>
          <table style="width:100%;border-collapse:collapse;background:#f5f5f4;border-radius:8px;overflow:hidden;font-size:14px">
            <tr><td style="padding:10px 16px;color:#78716c;width:40%">Event</td><td style="padding:10px 16px;font-weight:600;color:#1c1917">${celebrationName}</td></tr>
            <tr style="border-top:1px solid #e7e5e4"><td style="padding:10px 16px;color:#78716c">Type</td><td style="padding:10px 16px;text-transform:capitalize">${celebrationType.replace(/_/g, ' ')}</td></tr>
            <tr style="border-top:1px solid #e7e5e4"><td style="padding:10px 16px;color:#78716c">Client</td><td style="padding:10px 16px">${clientEmail}</td></tr>
            ${message ? `<tr style="border-top:1px solid #e7e5e4"><td style="padding:10px 16px;color:#78716c">Message</td><td style="padding:10px 16px;font-style:italic">"${message}"</td></tr>` : ''}
          </table>
          <div style="margin-top:24px">
            <a href="${APP_URL}/leads" style="display:inline-block;background:#9f1239;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">
              View lead →
            </a>
          </div>
          <p style="margin:20px 0 0;font-size:12px;color:#a8a29e">Accept or decline from your Leads dashboard.</p>
        </div>
      </div>
    `,
  })
}

// ── Lead accepted → notify client with portal invite link ──────
export async function sendLeadAcceptedEmail({
  toEmail,
  companyName,
  celebrationName,
  inviteToken,
}: {
  toEmail: string
  companyName: string
  celebrationName: string
  inviteToken: string
}) {
  if (!process.env.RESEND_API_KEY) return

  const inviteUrl = `${APP_URL}/invite/${inviteToken}`

  await resend.emails.send({
    from: `Creative Era OS <${FROM}>`,
    to: [toEmail],
    subject: `${companyName} accepted your request!`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1c1917">
        <div style="background:#9f1239;padding:24px 32px;border-radius:12px 12px 0 0">
          <p style="color:#fda4af;margin:0;font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase">Creative Era OS</p>
          <h1 style="color:#fff;margin:8px 0 0;font-size:22px;font-weight:700">You're connected! 🎉</h1>
        </div>
        <div style="background:#fff;border:1px solid #e7e5e4;border-top:none;border-radius:0 0 12px 12px;padding:28px 32px">
          <p style="margin:0 0 16px;font-size:15px;color:#44403c">
            Great news — <strong>${companyName}</strong> has accepted your request for <strong>${celebrationName}</strong>.
          </p>
          <p style="margin:0 0 24px;font-size:14px;color:#78716c">
            Your dedicated wedding portal is ready. Use it to share your guest list, confirm functions, set preferences, and track progress — all in one place.
          </p>
          <a href="${inviteUrl}" style="display:inline-block;background:#9f1239;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600">
            Open my portal →
          </a>
          <p style="margin:20px 0 0;font-size:12px;color:#a8a29e">
            Or copy this link: <a href="${inviteUrl}" style="color:#9f1239">${inviteUrl}</a>
          </p>
        </div>
      </div>
    `,
  })
}

// ── Lead declined → notify client ─────────────────────────────
export async function sendLeadDeclinedEmail({
  toEmail,
  companyName,
  celebrationName,
}: {
  toEmail: string
  companyName: string
  celebrationName: string
}) {
  if (!process.env.RESEND_API_KEY) return

  await resend.emails.send({
    from: `Creative Era OS <${FROM}>`,
    to: [toEmail],
    subject: `Update on your request to ${companyName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1c1917">
        <div style="background:#78716c;padding:24px 32px;border-radius:12px 12px 0 0">
          <p style="color:#e7e5e4;margin:0;font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase">Creative Era OS</p>
          <h1 style="color:#fff;margin:8px 0 0;font-size:22px;font-weight:700">Planner update</h1>
        </div>
        <div style="background:#fff;border:1px solid #e7e5e4;border-top:none;border-radius:0 0 12px 12px;padding:28px 32px">
          <p style="margin:0 0 16px;font-size:15px;color:#44403c">
            Unfortunately, <strong>${companyName}</strong> is unable to take on <strong>${celebrationName}</strong> at this time.
          </p>
          <p style="margin:0 0 24px;font-size:14px;color:#78716c">
            Don't worry — you can connect with another planner on Creative Era OS.
          </p>
          <a href="${APP_URL}/celebrate" style="display:inline-block;background:#1c1917;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">
            Find another planner →
          </a>
        </div>
      </div>
    `,
  })
}
