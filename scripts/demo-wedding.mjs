/**
 * Full wedding demo walkthrough — promotional video
 * Uses system Chrome + Playwright video recording
 * Run: node scripts/demo-wedding.mjs
 */

import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const BASE_URL = 'https://shaadi-app-eight.vercel.app'
const DEMO_EMAIL = `demo.vikram.${Date.now()}@creativeeraos.com`
const DEMO_PASSWORD = 'Demo@12345'
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
  console.log('🎬 Starting demo recording...')

  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: false,
    args: ['--window-size=1440,900', '--disable-infobars', '--start-maximized'],
    slowMo: 60,
  })

  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: VIDEO_DIR, size: { width: 1440, height: 900 } },
  })

  const page = await ctx.newPage()

  // ── 1. Login page ──────────────────────────────────────────────────────
  console.log('1. Login page...')
  await page.goto(BASE_URL + '/login')
  await pause(2500)

  // ── 2. Create agency account ────────────────────────────────────────
  console.log('2. Signing up...')
  await page.getByRole('button', { name: /create account/i }).click()
  await pause(800)

  await slowType(page.getByPlaceholder('Rahul Sharma'), 'Vikram Mehta')
  await pause(400)
  await slowType(page.getByPlaceholder('Dream Weddings Co.'), 'Dream Events Co.')
  await pause(400)
  await slowType(page.getByPlaceholder('you@company.com'), DEMO_EMAIL)
  await pause(400)
  await slowType(page.getByPlaceholder('Min. 6 characters'), DEMO_PASSWORD)
  await pause(600)

  await page.getByRole('button', { name: /create account/i }).click()
  await page.waitForURL('**/dashboard', { timeout: 25000 })
  await pause(2500)

  // ── 3. New wedding ──────────────────────────────────────────────────
  console.log('3. Creating wedding...')
  await page.goto(BASE_URL + '/weddings/new')
  await page.waitForLoadState('networkidle')
  await pause(1500)

  await slowType(page.getByPlaceholder('e.g. Priya'), 'Ananya')
  await pause(300)
  await slowType(page.getByPlaceholder('e.g. Arjun'), 'Rohan')
  await pause(300)

  const dateInput = page.locator('input[type="date"]').first()
  if (await dateInput.count() > 0) {
    await dateInput.fill('2026-12-05')
    await pause(300)
  }

  const venueField = page.getByPlaceholder('e.g. Taj Hotel')
  if (await venueField.count() > 0) {
    await venueField.fill('Taj Lake Palace')
    await pause(300)
  }

  const cityField = page.getByPlaceholder('e.g. Jaipur')
  if (await cityField.count() > 0) {
    await cityField.fill('Udaipur')
    await pause(300)
  }

  await page.getByRole('button', { name: /create|save/i }).first().click()
  await pause(3000)
  await page.waitForLoadState('networkidle')

  // Extract wedding ID
  const weddingUrl = page.url()
  const wMatch = weddingUrl.match(/\/weddings\/([a-f0-9-]{36})/)
  let weddingId = wMatch?.[1]

  if (!weddingId) {
    // Try clicking first wedding from dashboard
    await page.goto(BASE_URL + '/dashboard')
    await pause(2000)
    const wLink = page.locator('a[href*="/weddings/"]').first()
    if (await wLink.count() > 0) {
      const href = await wLink.getAttribute('href')
      weddingId = href?.match(/\/weddings\/([a-f0-9-]{36})/)?.[1]
      await wLink.click()
      await pause(2000)
    }
  }

  console.log('   Wedding ID:', weddingId)
  if (!weddingId) throw new Error('Could not get wedding ID')

  // ── 4. Overview ──────────────────────────────────────────────────────
  console.log('4. Overview...')
  await page.goto(BASE_URL + `/weddings/${weddingId}/overview`)
  await page.waitForLoadState('networkidle')
  await pause(3000)

  // ── 5. Quick-add ceremonies ─────────────────────────────────────────
  console.log('5. Adding ceremonies...')
  await page.goto(BASE_URL + `/weddings/${weddingId}/events`)
  await page.waitForLoadState('networkidle')
  await pause(2000)

  await page.getByRole('button', { name: /quick add/i }).click()
  await pause(1200)

  // Wait for dialog to be visible
  const dialog = page.getByRole('dialog')
  await dialog.waitFor({ state: 'visible', timeout: 10000 })
  await pause(600)

  // Select ceremonies by clicking their name spans inside the dialog
  for (const name of ['Mehandi', 'Haldi', 'Sangeet', 'Baraat', 'Pheras']) {
    await dialog.locator(`span`, { hasText: name }).filter({ hasText: new RegExp(`^${name}$`) }).first().click()
    await pause(600)
  }
  await pause(800)

  // Venue inside dialog
  const vInput = dialog.locator('input').nth(5)
  if (await vInput.count() > 0) {
    await vInput.fill('Taj Lake Palace')
    await pause(300)
  }

  // Submit
  await dialog.getByRole('button', { name: /add.*ceremonies/i }).click()
  await pause(3000)
  await page.waitForLoadState('networkidle')
  await pause(1500)

  // ── 6. Event workspace ───────────────────────────────────────────────
  console.log('6. Event workspace...')
  // Click first workspace link
  const wsLinks = page.locator('a[href*="/events/"][href*="/weddings/"]')
  if (await wsLinks.count() > 0) {
    await wsLinks.first().click()
    await page.waitForLoadState('networkidle')
    await pause(2000)

    // F&B tab
    const fbTab = page.getByRole('button', { name: /f.b/i }).first()
    if (await fbTab.count() > 0) {
      await fbTab.click()
      await pause(800)
      const numInputs = page.locator('input[type="number"]')
      if (await numInputs.count() > 0) {
        await numInputs.first().fill('200')
        await numInputs.first().blur()
        await pause(600)
      }
      if (await numInputs.count() > 1) {
        await numInputs.nth(1).fill('150')
        await numInputs.nth(1).blur()
        await pause(600)
      }
    }
    await pause(800)

    // Decor tab
    const decorTab = page.getByRole('button', { name: /decor/i }).first()
    if (await decorTab.count() > 0) {
      await decorTab.click()
      await pause(800)

      // Add 2 decor items
      const addDecorBtn = page.getByRole('button', { name: /add item/i })
      if (await addDecorBtn.count() > 0) {
        await addDecorBtn.click()
        await pause(500)
        const inp = page.getByPlaceholder(/item|decor/i).last()
        if (await inp.count() > 0) {
          await inp.fill('Floral arch — entrance gate')
          await page.keyboard.press('Enter')
          await pause(600)
        }
        await addDecorBtn.click()
        await pause(500)
        const inp2 = page.getByPlaceholder(/item|decor/i).last()
        if (await inp2.count() > 0) {
          await inp2.fill('Mandap — ivory & gold')
          await page.keyboard.press('Enter')
          await pause(600)
        }
      }
    }
    await pause(1200)
  }

  // ── 7. Guests ────────────────────────────────────────────────────────
  console.log('7. Adding guests...')
  await page.goto(BASE_URL + `/weddings/${weddingId}/guests`)
  await page.waitForLoadState('networkidle')
  await pause(2000)

  const guestList = [
    { name: 'Ramesh Sharma', phone: '9876500001' },
    { name: 'Sunita Mehta', phone: '9876500002' },
    { name: 'Raj Kapoor', phone: '9876500003' },
  ]

  for (const g of guestList) {
    await page.getByRole('button', { name: /add guest/i }).first().click()
    await pause(700)
    await page.getByPlaceholder('e.g. Sharma Ji').fill(g.name)
    await pause(300)
    const ph = page.getByPlaceholder('+91 98765 43210')
    if (await ph.count() > 0) {
      await ph.fill(g.phone)
      await pause(200)
    }
    await page.getByRole('button', { name: /^add guest$/i }).click()
    await pause(1000)
  }
  await pause(1500)

  // ── 8. Guest 360 ─────────────────────────────────────────────────────
  console.log('8. Guest 360...')
  const g360 = page.locator('a[href*="/guests/"][href*="/weddings/"]').first()
  if (await g360.count() > 0) {
    await g360.click()
    await page.waitForLoadState('networkidle')
    await pause(2000)

    for (const tab of ['Events', 'Travel', 'Room']) {
      const t = page.getByRole('button', { name: new RegExp(`^${tab}$`, 'i') })
      if (await t.count() > 0) {
        await t.click()
        await pause(1500)
      }
    }
  }

  // ── 9. Vendors ───────────────────────────────────────────────────────
  console.log('9. Adding vendors...')
  await page.goto(BASE_URL + `/weddings/${weddingId}/vendors`)
  await page.waitForLoadState('networkidle')
  await pause(2000)

  // Click "Add vendor" — opens inline form in a category
  await page.getByRole('button', { name: /add vendor/i }).first().click()
  await pause(800)

  const vNameInput = page.getByPlaceholder('Vendor name').first()
  if (await vNameInput.count() > 0) {
    await vNameInput.fill('Royal Caterers')
    await pause(300)
    const amtInput = page.getByPlaceholder('₹ amount').first()
    if (await amtInput.count() > 0) await amtInput.fill('350000')
    await pause(300)
    await page.getByRole('button', { name: /^add$/i }).first().click()
    await pause(1000)
  }

  await page.getByRole('button', { name: /add vendor/i }).first().click()
  await pause(800)
  const vNameInput2 = page.getByPlaceholder('Vendor name').first()
  if (await vNameInput2.count() > 0) {
    await vNameInput2.fill('Bloom Decor Studio')
    await pause(300)
    await page.getByRole('button', { name: /^add$/i }).first().click()
    await pause(1000)
  }
  await pause(1500)

  // ── 10. Budget ───────────────────────────────────────────────────────
  console.log('10. Budget page...')
  await page.goto(BASE_URL + `/weddings/${weddingId}/budget`)
  await page.waitForLoadState('networkidle')
  await pause(3000)

  // ── 11. Ground Control ───────────────────────────────────────────────
  console.log('11. Ground Control...')
  await page.goto(BASE_URL + `/weddings/${weddingId}/day`)
  await page.waitForLoadState('networkidle')
  await pause(3000)

  // ── 12. Deliverables — Gift tracker ─────────────────────────────────
  console.log('12. Deliverables...')
  await page.goto(BASE_URL + `/weddings/${weddingId}/deliverables`)
  await page.waitForLoadState('networkidle')
  await pause(2000)

  // Gifts tab
  const giftsTab = page.getByRole('button', { name: /gifts/i })
  if (await giftsTab.count() > 0) {
    await giftsTab.click()
    await pause(800)

    await page.getByRole('button', { name: /record gift/i }).click()
    await pause(700)
    await page.getByPlaceholder('e.g. Sharma ji').fill('Sharma Uncle')
    await pause(300)
    await page.getByPlaceholder('e.g. 5100').fill('21000')
    await pause(300)
    await page.getByRole('button', { name: /^record$/i }).click()
    await pause(1200)

    // Second gift
    await page.getByRole('button', { name: /record gift/i }).click()
    await pause(700)
    await page.getByPlaceholder('e.g. Sharma ji').fill('Mehta Nani')
    await pause(300)
    await page.getByPlaceholder('e.g. 5100').fill('11000')
    await pause(300)
    await page.getByRole('button', { name: /^record$/i }).click()
    await pause(1200)
  }

  // ── 13. Final — Overview ────────────────────────────────────────────
  console.log('13. Final overview...')
  await page.goto(BASE_URL + `/weddings/${weddingId}/overview`)
  await page.waitForLoadState('networkidle')
  await pause(4000)

  // Done
  console.log('✅ Demo complete!')
  await pause(2000)
  await ctx.close()
  await browser.close()

  console.log('🎬 Video saved to:', VIDEO_DIR)
  console.log(`📧 Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`)
}

run().catch(e => {
  console.error('❌ Demo failed:', e.message)
  process.exit(1)
})
