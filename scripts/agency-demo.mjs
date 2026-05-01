/**
 * Full Agency Wedding Demo — Promotional Video
 * Shows complete workflow: signup → setup → execution → deliverables
 *
 * Run: node scripts/agency-demo.mjs
 */

import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const BASE_URL    = 'https://shaadi-app-eight.vercel.app'
const SUPABASE_URL = 'https://cikogbpckghtdxebirpn.supabase.co'
const SERVICE_KEY  = 'sb_secret_UCvbjrvCjk68u6hIVjOPrQ_K6mJ0OGh'

const TS = Date.now()
const AGENCY_EMAIL    = `agency.${TS}@dreameventsdemo.com`
const AGENCY_PASSWORD = 'Agency@12345'
const TEAM_EMAIL      = `hospitality.${TS}@dreameventsdemo.com`
const TEAM_PASSWORD   = 'Team@12345'

const VIDEO_DIR = path.join(__dirname, '../demo-video')

const pause = (ms = 1200) => new Promise(r => setTimeout(r, ms))

async function slowType(locator, text, delay = 55) {
  await locator.click()
  await locator.clear()
  for (const ch of text) {
    await locator.pressSequentially(ch)
    await new Promise(r => setTimeout(r, delay))
  }
}

async function run() {
  console.log('🎬 Agency Demo Recording starting...')

  // Supabase admin client (for fetching invite tokens)
  const sb = createClient(SUPABASE_URL, SERVICE_KEY)

  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: false,
    args: ['--window-size=1440,900', '--disable-infobars'],
    slowMo: 70,
  })

  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 1440, height: 900 } },
  })
  const page = await ctx.newPage()

  // ── 1. AGENCY SIGNUP ───────────────────────────────────────────────
  console.log('1. Agency signup...')
  await page.goto(BASE_URL + '/login')
  await pause(2500)

  await page.getByRole('button', { name: /create account/i }).click()
  await pause(800)
  await slowType(page.getByPlaceholder('Rahul Sharma'), 'Ananya Kapoor')
  await pause(300)
  await slowType(page.getByPlaceholder('Dream Weddings Co.'), 'Dream Events Co.')
  await pause(300)
  await slowType(page.getByPlaceholder('you@company.com'), AGENCY_EMAIL)
  await pause(300)
  await slowType(page.getByPlaceholder('Min. 6 characters'), AGENCY_PASSWORD)
  await pause(600)
  await page.getByRole('button', { name: /create account/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 25000 })
  await pause(2500)

  // ── 2. NEW WEDDING ──────────────────────────────────────────────────
  console.log('2. Creating wedding...')
  await page.goto(BASE_URL + '/weddings/new')
  await page.waitForLoadState('networkidle')
  await pause(1500)

  await slowType(page.getByPlaceholder('e.g. Priya'), 'Ananya')
  await pause(300)
  await slowType(page.getByPlaceholder('e.g. Arjun'), 'Rohan')
  await pause(300)
  const dateInput = page.locator('input[type="date"]').first()
  if (await dateInput.count() > 0) { await dateInput.fill('2026-12-05'); await pause(300) }
  const venueF = page.getByPlaceholder('e.g. Taj Hotel')
  if (await venueF.count() > 0) { await venueF.fill('Taj Lake Palace'); await pause(300) }
  const cityF = page.getByPlaceholder('e.g. Jaipur')
  if (await cityF.count() > 0) { await cityF.fill('Udaipur'); await pause(300) }
  await page.getByRole('button', { name: /create|save/i }).first().click()
  await pause(3000)
  await page.waitForLoadState('networkidle')

  const wUrl = page.url()
  const wMatch = wUrl.match(/\/weddings\/([a-f0-9-]{36})/)
  let wId = wMatch?.[1]
  if (!wId) {
    await page.goto(BASE_URL + '/dashboard')
    await pause(2000)
    const href = await page.locator('a[href*="/weddings/"]').first().getAttribute('href')
    wId = href?.match(/\/weddings\/([a-f0-9-]{36})/)?.[1]
  }
  console.log('   Wedding ID:', wId)
  if (!wId) throw new Error('No wedding ID')

  // ── 3. OVERVIEW ─────────────────────────────────────────────────────
  console.log('3. Overview...')
  await page.goto(BASE_URL + `/weddings/${wId}/overview`)
  await page.waitForLoadState('networkidle')
  await pause(3000)

  // ── 4. SETUP WIZARD — TEAM INVITE ───────────────────────────────────
  console.log('4. Setup wizard — inviting team...')
  await page.goto(BASE_URL + `/weddings/${wId}/setup`)
  await page.waitForLoadState('networkidle')
  await pause(2000)

  // Step 0 → click "Save & continue"
  await page.getByRole('button', { name: /save.*continue/i }).click()
  await pause(1500)

  // Steps 1–4 → click "Next" (Skip → is faster)
  for (let i = 0; i < 4; i++) {
    const skipBtn = page.getByRole('button', { name: /^skip|skip →/i }).first()
    const nextBtn = page.getByRole('button', { name: /^next/i }).first()
    if (await skipBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await skipBtn.click()
    } else if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nextBtn.click()
    }
    await pause(800)
  }
  // Now on step 5 — Team
  await pause(1000)

  // Invite team members
  const emailInput = page.getByPlaceholder('e.g. dilip@family.com')
  const roleSelect = page.locator('select').first()

  const teamInvites = [
    { email: TEAM_EMAIL, role: 'hospitality' },
    { email: `logistics.${TS}@dreameventsdemo.com`, role: 'logistics' },
    { email: `photography.${TS}@dreameventsdemo.com`, role: 'photography' },
  ]

  for (const inv of teamInvites) {
    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailInput.fill(inv.email)
      await pause(500)
      if (await roleSelect.isVisible()) {
        await roleSelect.selectOption(inv.role)
        await pause(300)
      }
      // Wait for button to be enabled
      await page.waitForFunction(() => {
        const btn = document.querySelector('button[class*="bg-rose"]')
        return btn && !btn.hasAttribute('disabled')
      }, { timeout: 5000 }).catch(() => {})
      await page.getByRole('button', { name: /send invite/i }).click({ force: true })
      await pause(1500)
    }
  }
  await pause(1000)

  // ── 5. TEAM MEMBER ACCEPTS INVITE (Hospitality) ─────────────────────
  console.log('5. Hospitality team member accepts invite...')

  // Fetch invite token from DB
  const { data: inviteRow } = await sb.from('invites')
    .select('token')
    .eq('email', TEAM_EMAIL.toLowerCase())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (inviteRow?.token) {
    const inviteCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const invitePage = await inviteCtx.newPage()
    await invitePage.goto(BASE_URL + `/invite/${inviteRow.token}`)
    await invitePage.waitForLoadState('networkidle')
    await pause(2000)

    const nameField = invitePage.getByLabel(/your name/i)
    if (await nameField.isVisible()) {
      await nameField.fill('Priya Hospitality')
      await pause(300)
    }
    const pwField = invitePage.getByPlaceholder(/enter your password/i)
    if (await pwField.isVisible()) {
      await pwField.fill(TEAM_PASSWORD)
      await pause(300)
    }
    await invitePage.getByRole('button', { name: /accept|get started/i }).click()
    await pause(3000)
    await inviteCtx.close()
    console.log('   ✓ Hospitality invite accepted')
  } else {
    console.log('   ⚠ Could not fetch invite token — skipping')
  }

  // ── 6. QUICK-ADD CEREMONIES ─────────────────────────────────────────
  console.log('6. Quick-add ceremonies...')
  await page.goto(BASE_URL + `/weddings/${wId}/events`)
  await page.waitForLoadState('networkidle')
  await pause(2000)

  await page.getByRole('button', { name: /quick add/i }).click()
  const dlg = page.getByRole('dialog')
  await dlg.waitFor({ state: 'visible', timeout: 10000 })
  await pause(700)

  for (const name of ['Mehandi', 'Haldi', 'Sangeet', 'Baraat', 'Pheras']) {
    await dlg.locator('span', { hasText: name }).filter({ hasText: new RegExp(`^${name}$`) }).first().click()
    await pause(500)
  }
  await pause(600)

  // Venue
  const vInp = dlg.locator('input[placeholder=""]').nth(5)
  if (await vInp.count() > 0) { await vInp.fill('Taj Lake Palace'); await pause(300) }

  await dlg.getByRole('button', { name: /add.*ceremonies/i }).click()
  await pause(3000)
  await page.waitForLoadState('networkidle')
  await pause(1500)

  // ── 7. GUEST IMPORT VIA CSV ─────────────────────────────────────────
  console.log('7. Importing guests via CSV...')
  await page.goto(BASE_URL + `/weddings/${wId}/guests`)
  await page.waitForLoadState('networkidle')
  await pause(2000)

  // Look for Import button
  const importBtn = page.getByRole('button', { name: /import/i }).first()
  if (await importBtn.isVisible()) {
    await importBtn.click()
    await pause(800)

    // File input
    const fileInput = page.locator('input[type="file"]')
    if (await fileInput.count() > 0) {
      await fileInput.setInputFiles(path.join(__dirname, 'sample-guests.csv'))
      await pause(2000)

      // Confirm import
      const confirmBtn = page.getByRole('button', { name: /import \d+|confirm|upload/i })
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click()
        await pause(3000)
      }
    }
  }
  await pause(2000)

  // ── 8. GUEST LIST VIEW ──────────────────────────────────────────────
  console.log('8. Guest list...')
  await page.goto(BASE_URL + `/weddings/${wId}/guests`)
  await page.waitForLoadState('networkidle')
  await pause(3000)

  // ── 9. GUEST 360 ────────────────────────────────────────────────────
  console.log('9. Guest 360...')
  const g360 = page.locator('a[href*="/guests/"][href*="/weddings/"]').first()
  if (await g360.count() > 0) {
    await g360.click()
    await page.waitForLoadState('networkidle')
    await pause(2000)
    for (const tab of ['Events', 'Travel', 'Room']) {
      const t = page.getByRole('button', { name: new RegExp(`^${tab}$`, 'i') })
      if (await t.count() > 0) { await t.click(); await pause(1200) }
    }
  }

  // ── 10. ROOMS ───────────────────────────────────────────────────────
  console.log('10. Rooms management...')
  await page.goto(BASE_URL + `/weddings/${wId}/rooms`)
  await page.waitForLoadState('networkidle')
  await pause(2500)

  // Add rooms if button exists
  const addRoomBtn = page.getByRole('button', { name: /add room|bulk add/i }).first()
  if (await addRoomBtn.isVisible()) {
    await addRoomBtn.click()
    await pause(800)

    const roomInput = page.locator('input').filter({ hasText: '' }).first()
    // Try to fill room number/count
    const countInput = page.getByPlaceholder(/how many|count|number of rooms/i).first()
    if (await countInput.isVisible()) {
      await countInput.fill('10')
      await pause(300)
      await page.getByRole('button', { name: /add|create/i }).last().click()
      await pause(1500)
    } else {
      await page.keyboard.press('Escape')
    }
  }
  await pause(1500)

  // ── 11. VENDORS ─────────────────────────────────────────────────────
  console.log('11. Adding vendors...')
  await page.goto(BASE_URL + `/weddings/${wId}/vendors`)
  await page.waitForLoadState('networkidle')
  await pause(2000)

  const vendors = [
    { name: 'Royal Caterers', amount: '450000' },
    { name: 'Bloom Decor Studio', amount: '380000' },
    { name: 'LensArt Photography', amount: '250000' },
  ]
  for (const v of vendors) {
    await page.getByRole('button', { name: /add vendor/i }).first().click()
    await pause(700)
    const nInput = page.getByPlaceholder('Vendor name').first()
    if (await nInput.count() > 0) {
      await nInput.fill(v.name)
      await pause(300)
      const aInput = page.getByPlaceholder('₹ amount').first()
      if (await aInput.count() > 0) { await aInput.fill(v.amount); await pause(200) }
      await page.getByRole('button', { name: /^add$/i }).first().click()
      await pause(900)
    }
  }
  await pause(1500)

  // ── 12. CHECKLIST ───────────────────────────────────────────────────
  console.log('12. Checklist...')
  await page.goto(BASE_URL + `/weddings/${wId}/checklist`)
  await page.waitForLoadState('networkidle')
  await pause(3000)

  // Mark first 2-3 items done
  const checkboxes = page.locator('button[role="checkbox"], input[type="checkbox"]')
  const cbCount = await checkboxes.count()
  for (let i = 0; i < Math.min(3, cbCount); i++) {
    await checkboxes.nth(i).click()
    await pause(500)
  }
  await pause(1500)

  // ── 13. DOCUMENTS ───────────────────────────────────────────────────
  console.log('13. Documents...')
  await page.goto(BASE_URL + `/weddings/${wId}/documents`)
  await page.waitForLoadState('networkidle')
  await pause(2500)

  const uploadBtn = page.getByRole('button', { name: /upload|add document/i }).first()
  if (await uploadBtn.isVisible()) {
    await uploadBtn.click()
    await pause(600)
    const docInput = page.locator('input[type="file"]')
    if (await docInput.count() > 0) {
      await docInput.setInputFiles(path.join(__dirname, 'sample-guests.csv'))
      await pause(2000)
    }
  }
  await pause(1500)

  // ── 14. EVENT WORKSPACE ─────────────────────────────────────────────
  console.log('14. Event workspace...')
  await page.goto(BASE_URL + `/weddings/${wId}/events`)
  await page.waitForLoadState('networkidle')
  await pause(2000)

  const wsLink = page.locator(`a[href*="/weddings/${wId}/events/"]`).first()
  if (await wsLink.count() > 0) {
    await wsLink.click()
    await page.waitForLoadState('networkidle')
    await pause(2000)

    // F&B tab
    const fbTab = page.getByRole('button', { name: /f.b/i }).first()
    if (await fbTab.count() > 0) {
      await fbTab.click(); await pause(700)
      const nums = page.locator('input[type="number"]')
      if (await nums.count() > 0) { await nums.first().fill('300'); await nums.first().blur(); await pause(500) }
      if (await nums.count() > 1) { await nums.nth(1).fill('200'); await nums.nth(1).blur(); await pause(500) }
    }
    await pause(700)

    // Decor tab
    const decorTab = page.getByRole('button', { name: /decor/i }).first()
    if (await decorTab.count() > 0) {
      await decorTab.click(); await pause(700)
      const addBtn = page.getByRole('button', { name: /add item/i })
      if (await addBtn.count() > 0) {
        await addBtn.click(); await pause(400)
        const inp = page.getByPlaceholder(/item|decor/i).last()
        if (await inp.count() > 0) { await inp.fill('Mandap — ivory & gold'); await page.keyboard.press('Enter'); await pause(500) }
        await addBtn.click(); await pause(400)
        const inp2 = page.getByPlaceholder(/item|decor/i).last()
        if (await inp2.count() > 0) { await inp2.fill('Floral arch — entrance'); await page.keyboard.press('Enter'); await pause(500) }
        await addBtn.click(); await pause(400)
        const inp3 = page.getByPlaceholder(/item|decor/i).last()
        if (await inp3.count() > 0) { await inp3.fill('Table centrepieces × 25'); await page.keyboard.press('Enter'); await pause(500) }
      }
    }
    await pause(1500)
  }

  // ── 15. AI ASSISTANT ────────────────────────────────────────────────
  console.log('15. AI Assistant...')
  await page.goto(BASE_URL + `/weddings/${wId}/overview`)
  await page.waitForLoadState('networkidle')
  await pause(2000)

  const aiBtn = page.locator('button').filter({ has: page.locator('svg') }).last()
  // Try sparkles floating button
  const sparklesBtn = page.locator('button[class*="fixed"], button[class*="bottom"]').last()
  if (await sparklesBtn.count() > 0) {
    await sparklesBtn.click()
    await pause(1500)
    const chatInput = page.getByPlaceholder(/ask|message|type/i).last()
    if (await chatInput.isVisible()) {
      await slowType(chatInput, 'How many guests are confirmed for the wedding?')
      await pause(400)
      await page.keyboard.press('Enter')
      await pause(4000)
    }
  }
  await pause(1000)

  // ── 16. COMMS ───────────────────────────────────────────────────────
  console.log('16. Comms...')
  await page.goto(BASE_URL + `/weddings/${wId}/comms`)
  await page.waitForLoadState('networkidle')
  await pause(3000)

  // ── 17. GROUND CONTROL ──────────────────────────────────────────────
  console.log('17. Ground Control...')
  await page.goto(BASE_URL + `/weddings/${wId}/day`)
  await page.waitForLoadState('networkidle')
  await pause(3000)

  // ── 18. SEATING ─────────────────────────────────────────────────────
  console.log('18. Seating chart...')
  await page.goto(BASE_URL + `/weddings/${wId}/seating`)
  await page.waitForLoadState('networkidle')
  await pause(3000)

  // ── 19. DELIVERABLES — GIFTS ────────────────────────────────────────
  console.log('19. Deliverables...')
  await page.goto(BASE_URL + `/weddings/${wId}/deliverables`)
  await page.waitForLoadState('networkidle')
  await pause(2000)

  const giftsTab = page.getByRole('button', { name: /gifts/i })
  if (await giftsTab.count() > 0) {
    await giftsTab.click(); await pause(700)
    for (const [giver, amt] of [['Sharma Uncle', '21000'], ['Mehta Nani ji', '11000'], ['Kapoor Family', '51000']]) {
      await page.getByRole('button', { name: /record gift/i }).click(); await pause(600)
      await page.getByPlaceholder('e.g. Sharma ji').fill(giver); await pause(200)
      await page.getByPlaceholder('e.g. 5100').fill(amt); await pause(200)
      await page.getByRole('button', { name: /^record$/i }).click(); await pause(1000)
    }
  }

  // ── 20. FINAL OVERVIEW ──────────────────────────────────────────────
  console.log('20. Final overview...')
  await page.goto(BASE_URL + `/weddings/${wId}/overview`)
  await page.waitForLoadState('networkidle')
  await pause(5000)

  // Done
  console.log('\n✅ Agency demo complete!')
  await pause(2000)
  await ctx.close()
  await browser.close()

  console.log('🎬 Video saved to:', VIDEO_DIR)
  console.log(`📧 Agency login: ${AGENCY_EMAIL} / ${AGENCY_PASSWORD}`)
  console.log(`👤 Team login:   ${TEAM_EMAIL} / ${TEAM_PASSWORD}`)
  console.log(`🔗 Wedding:      ${BASE_URL}/weddings/${wId}/overview`)
}

run().catch(e => {
  console.error('❌ Demo failed:', e.message)
  console.error(e.stack)
  process.exit(1)
})
