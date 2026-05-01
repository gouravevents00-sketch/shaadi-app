import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'

// ─── Color tokens ──────────────────────────────────────────────────────────────
const C = {
  rose800:  'FF9F1239',
  stone800: 'FF292524',
  white:    'FFFFFFFF',
  yellow50: 'FFFEFCE8',
  stone50:  'FFFAFAF9',
  rose50:   'FFFFF1F2',
  stone200: 'FFE7E5E4',
  stone400: 'FFA8A29E',
  stone600: 'FF57534E',
  blue800:  'FF1E40AF',
  green800: 'FF166534',
}

type FillType = 'pattern'
const fill = (argb: string): ExcelJS.Fill => ({ type: 'pattern' as FillType, pattern: 'solid', fgColor: { argb } })
const font = (argb: string, bold = false, size = 10): Partial<ExcelJS.Font> => ({ bold, color: { argb }, size })

// ─── Ceremony → vendor mapping ─────────────────────────────────────────────────
const CEREMONY_VENDORS: Record<string, string[]> = {
  'mehandi':         ['Mehandi Artist'],
  'haldi':           ['Florist (Haldi Decor)', 'Photographer'],
  'ganesh poojan':   ['Pandit', 'Florist'],
  'mayera':          ['Caterer', 'Decorator'],
  'sham-e-mehfil':   ['DJ / Music', 'Caterer', 'Lighting'],
  'sham e mehfil':   ['DJ / Music', 'Caterer', 'Lighting'],
  'sangeet':         ['Choreographer', 'DJ / Music', 'Caterer', 'Lighting'],
  'sagai':           ['Photographer', 'Videographer', 'Caterer', 'Decorator'],
  'baraat':          ['Dhol & Band', 'Horse & Buggy', 'Fireworks', 'Transport', 'Lighting'],
  'pheras':          ['Pandit', 'Mandap Decorator', 'Photographer', 'Videographer', 'Caterer'],
  'vidaai':          ['Transport'],
  'vidai':           ['Transport'],
  'reception':       ['DJ / Music', 'Caterer', 'Decorator', 'Photographer', 'Videographer', 'Lighting'],
  'cocktail':        ['DJ / Music', 'Caterer', 'Bartender'],
  'lunch':           ['Caterer'],
  'dinner':          ['Caterer'],
  'grah pravesh':    ['Pandit', 'Florist'],
}

// ─── Ceremony → budget items ────────────────────────────────────────────────────
type BudgetHint = { item: string; estimate: (total: number, guests: number) => number }
const CEREMONY_BUDGET: Record<string, BudgetHint[]> = {
  'mehandi':       [{ item: 'Mehandi Artist', estimate: (t, g) => Math.min(25000, t * 0.01) }],
  'haldi':         [{ item: 'Haldi Decor & Flowers', estimate: (t, g) => Math.min(40000, t * 0.015) }],
  'ganesh poojan': [{ item: 'Pandit Dakshina + Samagri', estimate: () => 15000 }],
  'sangeet':       [
    { item: 'DJ / Music Setup', estimate: (t, g) => Math.min(80000, t * 0.03) },
    { item: 'Choreographer', estimate: () => 30000 },
    { item: 'Catering (Sangeet)', estimate: (t, g) => g * 600 },
    { item: 'Lighting (Sangeet)', estimate: (t, g) => Math.min(60000, t * 0.02) },
  ],
  'sham-e-mehfil': [
    { item: 'DJ / Music (Mehfil)', estimate: (t, g) => Math.min(50000, t * 0.02) },
    { item: 'Catering (Mehfil)', estimate: (t, g) => g * 500 },
  ],
  'sham e mehfil': [
    { item: 'DJ / Music (Mehfil)', estimate: (t, g) => Math.min(50000, t * 0.02) },
    { item: 'Catering (Mehfil)', estimate: (t, g) => g * 500 },
  ],
  'sagai':         [
    { item: 'Catering (Sagai)', estimate: (t, g) => g * 700 },
    { item: 'Decoration (Sagai)', estimate: (t, g) => Math.min(100000, t * 0.04) },
    { item: 'Photography (Sagai)', estimate: (t, g) => Math.min(50000, t * 0.02) },
  ],
  'baraat':        [
    { item: 'Dhol & Band', estimate: () => 30000 },
    { item: 'Horse & Buggy', estimate: () => 35000 },
    { item: 'Fireworks', estimate: () => 25000 },
    { item: 'Baraat Lighting', estimate: (t, g) => Math.min(50000, t * 0.015) },
    { item: 'Baraat Transport (Buses)', estimate: (t, g) => Math.min(80000, t * 0.02) },
  ],
  'pheras':        [
    { item: 'Pandit Fees', estimate: () => 21000 },
    { item: 'Mandap Decoration', estimate: (t, g) => Math.min(300000, t * 0.1) },
    { item: 'Catering (Wedding Lunch/Dinner)', estimate: (t, g) => g * 1200 },
    { item: 'Main Photography Package', estimate: (t, g) => Math.min(200000, t * 0.07) },
    { item: 'Videography Package', estimate: (t, g) => Math.min(100000, t * 0.04) },
  ],
  'reception':     [
    { item: 'Reception Decoration', estimate: (t, g) => Math.min(400000, t * 0.12) },
    { item: 'Catering (Reception)', estimate: (t, g) => g * 1000 },
    { item: 'DJ / Music (Reception)', estimate: (t, g) => Math.min(80000, t * 0.025) },
    { item: 'Photography (Reception)', estimate: (t, g) => Math.min(80000, t * 0.025) },
  ],
  'vidai':         [{ item: 'Vidai Decoration & Flowers', estimate: () => 20000 }],
  'vidaai':        [{ item: 'Vidai Decoration & Flowers', estimate: () => 20000 }],
  'grah pravesh':  [{ item: 'Puja Samagri & Decor', estimate: () => 20000 }],
}

// ─── Shared helpers ────────────────────────────────────────────────────────────
function setHeader(ws: ExcelJS.Worksheet, col: number, label: string, required: boolean, width: number) {
  const cell = ws.getCell(1, col)
  cell.value = required ? `${label} *` : label
  cell.fill = fill(required ? C.rose800 : C.stone800)
  cell.font = font(C.white, true, 10)
  cell.alignment = { vertical: 'middle', horizontal: 'left' }
  ws.getColumn(col).width = width
}

function addDropdown(ws: ExcelJS.Worksheet, col: string, values: string[], rows = 500) {
  const formulae = [`"${values.join(',')}"`]
  for (let r = 2; r <= rows + 1; r++) {
    ws.getCell(`${col}${r}`).dataValidation = {
      type: 'list', allowBlank: true, formulae,
      showErrorMessage: true, errorStyle: 'warning',
      errorTitle: 'Invalid value', error: `Pick from: ${values.join(', ')}`,
    }
  }
}

function addSummaryBox(ws: ExcelJS.Worksheet, startCol: number, startRow: number,
  items: { label: string; formula: string }[]) {
  items.forEach(({ label, formula }, i) => {
    const row = startRow + i
    const lc = ws.getCell(row, startCol), vc = ws.getCell(row, startCol + 1)
    lc.value = label; lc.font = font(C.stone600, true); lc.fill = fill(C.stone50)
    vc.value = { formula }; vc.font = font(C.rose800, true); vc.fill = fill(C.rose50)
    vc.numFmt = '#,##0'
    lc.border = { bottom: { style: 'hair', color: { argb: C.stone200 } } }
    vc.border = { bottom: { style: 'hair', color: { argb: C.stone200 } } }
    ws.getColumn(startCol).width = 18; ws.getColumn(startCol + 1).width = 12
  })
}

function styleDataRows(ws: ExcelJS.Worksheet, sampleCount: number, totalCols: number) {
  for (let r = 2; r <= sampleCount + 1; r++) {
    for (let c = 1; c <= totalCols; c++) {
      const cell = ws.getCell(r, c)
      cell.fill = fill(C.yellow50)
      if (!cell.font) cell.font = {}
      cell.font = { ...(cell.font as object), italic: true, color: { argb: C.stone600 } }
    }
  }
  for (let r = sampleCount + 2; r <= 502; r++) {
    if (r % 2 === 0) for (let c = 1; c <= totalCols; c++) ws.getCell(r, c).fill = fill(C.stone50)
  }
}

// ─── Instructions sheet ────────────────────────────────────────────────────────
function addInstructionsSheet(wb: ExcelJS.Workbook, ceremonies: string[]) {
  const ws = wb.addWorksheet('📋 How to use', { properties: { tabColor: { argb: C.stone800 } } })
  ws.getColumn(1).width = 22; ws.getColumn(2).width = 58

  const cList = ceremonies.length ? ceremonies.join(', ') : 'your ceremonies'
  const rows: [string, string][] = [
    ['Shaadi App — Event Setup Pack', ''],
    ['', ''],
    ['HOW IT WORKS', ''],
    ['STEP 1', 'Fill the 👥 Guests sheet — Name, Phone, Side (just 3 required cols)'],
    ['STEP 2', 'Fill the 🏪 Vendors sheet — Category + Vendor Name are required'],
    ['STEP 3', 'Fill the 💰 Budget sheet — Category + Item are required'],
    ['STEP 4', 'Save this file and upload in the app → Import Pack button'],
    ['', ''],
    ['THIS FILE IS PERSONALISED', `Pre-filled rows for: ${cList}`],
    ['', ''],
    ['QUICK TIPS', ''],
    ['Yellow rows',    'Pre-filled examples — delete or overwrite them freely'],
    ['Dropdowns',      'Rose (*) columns have dropdown menus — just click the cell'],
    ['Required (*)',   'Only columns marked * are mandatory — rest are optional'],
    ['Phone numbers',  '10-digit mobile, no country code (e.g. 9876543210)'],
    ['Amounts',        'Numbers — commas ok! (e.g. 1,50,000 or 150000 both work)'],
    ['Re-uploading',   'Completely safe — existing records are updated, nothing deleted'],
    ['', ''],
    ['SMART MATCHING', ''],
    ['Guests',  'Matched by phone first, then name — no duplicates ever created'],
    ['Vendors', 'Matched by name + category combination'],
    ['Budget',  'Matched by category + item description'],
  ]
  rows.forEach(([a, b], i) => {
    const r = ws.getRow(i + 1)
    r.getCell(1).value = a; r.getCell(2).value = b
    if (i === 0) r.getCell(1).font = font(C.rose800, true, 14)
    else if (a === 'HOW IT WORKS' || a === 'TIPS' || a === 'SAFE RE-IMPORT') { r.getCell(1).font = font(C.stone400, true, 9); r.height = 18 }
    else if (a.startsWith('STEP')) { r.getCell(1).font = font(C.rose800, true); r.getCell(2).font = font(C.stone800) }
    else if (a === 'THIS FILE IS PERSONALISED') { r.getCell(1).font = font(C.blue800, true); r.getCell(2).font = font(C.blue800) }
    else { r.getCell(1).font = font(C.stone600, true, 9); r.getCell(2).font = font(C.stone600, false, 9) }
  })
}

// ─── Guests sheet ──────────────────────────────────────────────────────────────
function addGuestsSheet(wb: ExcelJS.Workbook) {
  const ws = wb.addWorksheet('👥 Guests', { properties: { tabColor: { argb: C.rose800 } } })

  // Columns: required (rose) | optional (stone)
  const headers: [string, boolean, number][] = [
    ['Name',    true,  30], ['Phone',  true,  16], ['Side',    true,  14],
    ['VIP',     false,  9], ['Dietary',false, 14], ['Email',   false, 26],
    ['Notes',   false, 28],
  ]
  headers.forEach(([l, r, w], i) => setHeader(ws, i + 1, l, r, w))

  // Visual separator between required (A-C) and optional (D-G)
  ws.getCell('A1').border = { right: { style: 'thin', color: { argb: C.stone200 } } }

  addDropdown(ws, 'C', ['Bride', 'Groom', 'Both'])
  addDropdown(ws, 'D', ['Yes', 'No'])
  addDropdown(ws, 'E', ['Veg', 'Non-Veg', 'Jain', 'Other'])
  ws.views = [{ state: 'frozen', ySplit: 1 }]
  ws.autoFilter = { from: 'A1', to: 'G1' }

  // 3 sample rows (italic + yellow tint — delete freely)
  const samples = [
    ['Ramesh Maheshwari', '9810011001', 'Groom', 'Yes', 'Veg',     'ramesh@gmail.com', "Groom's father"],
    ['Sunita Maheshwari', '9810011002', 'Groom', 'Yes', 'Veg',     '',                 "Groom's mother"],
    ['Pooja Agarwal',     '9600166001', 'Bride', 'No',  'Jain',    'pooja@gmail.com',  "Bride's best friend"],
  ]
  samples.forEach((row, i) => { ws.getRow(i + 2).values = row })
  styleDataRows(ws, samples.length, headers.length)

  // Live count panel (off to the right)
  const lc = ws.getCell('I1')
  lc.value = '📊 Live Count'; lc.font = font(C.stone400, true); lc.fill = fill(C.stone50)
  addSummaryBox(ws, 9, 2, [
    { label: 'Total guests', formula: 'COUNTA(A2:A501)' },
    { label: 'Bride side',   formula: 'COUNTIF(C2:C501,"Bride")' },
    { label: 'Groom side',   formula: 'COUNTIF(C2:C501,"Groom")' },
    { label: 'VIP guests',   formula: 'COUNTIF(D2:D501,"Yes")' },
    { label: 'Veg',          formula: 'COUNTIF(E2:E501,"Veg")' },
    { label: 'Non-Veg',      formula: 'COUNTIF(E2:E501,"Non-Veg")' },
    { label: 'Jain',         formula: 'COUNTIF(E2:E501,"Jain")' },
  ])
  ws.getRow(1).height = 24
}

// ─── Vendors sheet ─────────────────────────────────────────────────────────────
function addVendorsSheet(
  wb: ExcelJS.Workbook,
  prefilledVendors: { category: string; name: string; status: string; notes: string }[],
) {
  const ws = wb.addWorksheet('🏪 Vendors', { properties: { tabColor: { argb: C.blue800 } } })
  const CATEGORIES = [
    'Photography','Videography','Catering','Decoration','Venue',
    'Music & DJ','Mehandi Artist','Makeup & Hair','Transportation',
    'Dhol & Band','Fireworks','Tent & Furniture','Lighting','Horse & Buggy',
    'Pandit','Florist','Choreographer','Event Management','Other',
  ]
  // Simplified: 6 core columns (drop Email, Contact Person)
  const headers: [string, boolean, number][] = [
    ['Category',         true,  20], ['Vendor Name',      true,  30],
    ['Contact Phone',    false, 16], ['Status',           false, 14],
    ['Total Amount (₹)', false, 18], ['Advance Paid (₹)', false, 18],
    ['Notes',            false, 28],
  ]
  headers.forEach(([l, r, w], i) => setHeader(ws, i + 1, l, r, w))
  addDropdown(ws, 'A', CATEGORIES)
  addDropdown(ws, 'D', ['Enquired', 'Confirmed', 'Booked', 'Cancelled'])
  ws.getColumn(5).numFmt = '#,##0'; ws.getColumn(6).numFmt = '#,##0'
  ws.views = [{ state: 'frozen', ySplit: 1 }]
  ws.autoFilter = { from: 'A1', to: 'G1' }

  prefilledVendors.forEach((v, i) => {
    const row = ws.getRow(i + 2)
    row.values = [v.category, v.name, '', v.status, 0, 0, v.notes]
    for (let c = 1; c <= 7; c++) {
      row.getCell(c).fill = fill(C.yellow50)
      row.getCell(c).font = { italic: true, color: { argb: C.stone600 }, size: 10 }
    }
  })

  ws.getCell('I1').value = '📊 Live Count'
  ws.getCell('I1').font = font(C.stone400, true)
  ws.getCell('I1').fill = fill(C.stone50)
  addSummaryBox(ws, 9, 2, [
    { label: 'Total vendors',    formula: 'COUNTA(B2:B501)' },
    { label: 'Booked',           formula: 'COUNTIF(D2:D501,"Booked")' },
    { label: 'Confirmed',        formula: 'COUNTIF(D2:D501,"Confirmed")' },
    { label: 'Enquired',         formula: 'COUNTIF(D2:D501,"Enquired")' },
    { label: 'Total budget (₹)', formula: 'SUM(E2:E501)' },
    { label: 'Paid so far (₹)',  formula: 'SUM(F2:F501)' },
  ])
  ws.getRow(1).height = 24
}

// ─── Budget sheet ──────────────────────────────────────────────────────────────
function addBudgetSheet(
  wb: ExcelJS.Workbook,
  prefilledBudget: { category: string; item: string; estimated: number }[],
) {
  const ws = wb.addWorksheet('💰 Budget', { properties: { tabColor: { argb: C.green800 } } })
  const CATEGORIES = [
    'Venue','Catering','Decoration','Photography & Video',
    'Music & Entertainment','Transportation','Makeup & Hair',
    'Invitations & Stationery','Accommodation','Mehandi','Miscellaneous',
  ]
  // Simplified: 4 core columns (Category, Item, Estimated, Notes)
  const headers: [string, boolean, number][] = [
    ['Category',      true,  24], ['Item',          true,  36],
    ['Estimated (₹)', false, 18], ['Actual (₹)',    false, 18],
    ['Notes',         false, 28],
  ]
  headers.forEach(([l, r, w], i) => setHeader(ws, i + 1, l, r, w))
  addDropdown(ws, 'A', CATEGORIES)
  ws.getColumn(3).numFmt = '#,##0'; ws.getColumn(4).numFmt = '#,##0'
  ws.views = [{ state: 'frozen', ySplit: 1 }]
  ws.autoFilter = { from: 'A1', to: 'E1' }

  prefilledBudget.forEach((b, i) => {
    const row = ws.getRow(i + 2)
    row.values = [b.category, b.item, b.estimated, 0, '']
    for (let c = 1; c <= 5; c++) {
      row.getCell(c).fill = fill(C.yellow50)
      row.getCell(c).font = { italic: true, color: { argb: C.stone600 }, size: 10 }
    }
  })

  ws.getCell('G1').value = '📊 Budget Summary'
  ws.getCell('G1').font = font(C.stone400, true)
  ws.getCell('G1').fill = fill(C.stone50)
  addSummaryBox(ws, 7, 2, [
    { label: 'Total items',     formula: 'COUNTA(B2:B201)' },
    { label: 'Total estimated', formula: 'SUM(C2:C201)' },
    { label: 'Total actual',    formula: 'SUM(D2:D201)' },
    { label: 'Remaining',       formula: 'H3-H4' },
  ])
  ws.getRow(1).height = 24
}

// ─── Sample data sheet (always present) ────────────────────────────────────────
function addSampleSheet(wb: ExcelJS.Workbook) {
  const ws = wb.addWorksheet('📄 Sample Data', { properties: { tabColor: { argb: C.stone400 } } })
  ws.getColumn(1).width = 24; ws.getColumn(2).width = 36

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const note: any[][] = [
    ['SAMPLE DATA SHEET', ''],
    ['Purpose', 'See what filled-in data looks like before you start'],
    ['', ''],
    ['HOW TO USE', 'Look at this sheet to understand the format, then fill the real sheets'],
    ['', ''],
    ['SAMPLE GUESTS (in 👥 Guests sheet format)', ''],
    ['Name *', 'Phone', 'Email', 'Side', 'VIP', 'Dietary', 'Dietary Notes', 'Family Group', 'Notes'],
    ['Ramesh Maheshwari', '9810011001', 'ramesh@gmail.com', 'Groom', 'Yes', 'Veg', '', 'Maheshwari Family', "Groom's father"],
    ['Sunita Maheshwari', '9810011002', '', 'Groom', 'Yes', 'Veg', '', 'Maheshwari Family', "Groom's mother"],
    ['Vikram Sharma', '9876543210', 'vikram@gmail.com', 'Groom', 'No', 'Non-Veg', '', 'Sharma Family', 'Family friend'],
    ['Kavita Sharma', '9876543211', '', 'Groom', 'No', 'Jain', 'No onion garlic', 'Sharma Family', "Vikram's wife"],
    ['Suresh Vijayvargia', '9820055001', 'suresh@gmail.com', 'Bride', 'Yes', 'Veg', '', 'Vijayvargia Family', "Bride's father"],
    ['Meena Vijayvargia', '9820055002', '', 'Bride', 'Yes', 'Veg', '', 'Vijayvargia Family', "Bride's mother"],
    ['Pooja Agarwal', '9600166001', 'pooja@gmail.com', 'Bride', 'No', 'Jain', 'No root vegetables', 'Friends', "Bride's best friend"],
    ['Amit Bansal', '9400188001', 'amit@gmail.com', 'Both', 'No', 'Non-Veg', '', 'Common Friends', 'Common friend'],
    ['Dr. Kamal Verma', '9300199001', 'drkamal@gmail.com', 'Both', 'Yes', 'Veg', 'Diabetic — no sugar', '', 'Family doctor'],
    ['', '', '', '', '', '', '', '', ''],
    ['SAMPLE VENDORS (in 🏪 Vendors sheet format)', ''],
    ['Category *', 'Vendor Name *', 'Contact Person', 'Phone', 'Email', 'Status', 'Total Amount (₹)', 'Advance Paid (₹)', 'Notes'],
    ['Photography', 'Raj Photography Studio', 'Raj Kumar', '9876543210', 'raj@photo.com', 'Booked', 150000, 50000, '2 photographers + 1 videographer'],
    ['Catering', 'Sharma Caterers', 'Mohan Sharma', '9765432109', '', 'Confirmed', 800000, 200000, 'Veg only, 250 pax'],
    ['Decoration', 'Royal Decorators', 'Priya Patel', '9654321098', 'priya@decor.com', 'Enquired', 0, 0, 'Flower decor preferred'],
    ['Music & DJ', 'DJ Hiten', 'Hiten Shah', '9543210987', '', 'Confirmed', 60000, 20000, 'Sound system included'],
    ['Mehandi Artist', 'Pooja Mehandi Art', 'Pooja', '9432109876', '', 'Booked', 15000, 5000, 'Full hands + legs'],
    ['', '', '', '', '', '', '', '', ''],
    ['SAMPLE BUDGET (in 💰 Budget sheet format)', ''],
    ['Category *', 'Item *', 'Estimated (₹)', 'Actual (₹)', 'Vendor Name', 'Notes'],
    ['Venue', 'Main venue rental — 2 days', 2500000, 2500000, 'Nahargarh Palace', 'Final confirmed'],
    ['Catering', 'Wedding dinner — 250 pax', 800000, 0, 'Sharma Caterers', 'Veg menu only'],
    ['Photography & Video', 'Full day photography + video', 150000, 150000, 'Raj Photography', 'Paid in full'],
    ['Decoration', 'Floral decoration — all ceremonies', 600000, 0, 'Royal Decorators', 'Quotation pending'],
    ['Makeup & Hair', 'Bridal makeup + hair — all ceremonies', 80000, 0, '', 'Artist TBD'],
  ]

  note.forEach(([a, ...rest], i) => {
    const r = ws.getRow(i + 1)
    r.getCell(1).value = a
    rest.forEach((v, j) => { r.getCell(j + 2).value = v })
    if (i === 0) r.getCell(1).font = font(C.rose800, true, 13)
    else if (['Purpose', 'HOW TO USE'].includes(a)) { r.getCell(1).font = font(C.stone600, true, 9); r.getCell(2).font = font(C.stone600, false, 9) }
    else if (a.startsWith('SAMPLE')) { r.getCell(1).font = font(C.blue800, true); r.height = 18 }
    else if (['Name *', 'Category *'].includes(a)) {
      for (let c = 1; c <= 9; c++) { r.getCell(c).fill = fill(C.stone800); r.getCell(c).font = font(C.white, true, 9) }
    } else if (a && a !== '') {
      for (let c = 1; c <= 9; c++) { r.getCell(c).fill = fill(C.stone50); r.getCell(c).font = font(C.stone600, false, 9) }
    }
  })
  for (let c = 1; c <= 9; c++) ws.getColumn(c).width = c === 2 ? 30 : c === 1 ? 24 : 16
}

// ─── Route handler ─────────────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ weddingId: string }> },
) {
  const { weddingId } = await params

  // Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single()
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const sc = createServiceClient()
  const { data: wedding } = await sc.from('weddings')
    .select('id, bride_name, groom_name, budget_total, primary_city')
    .eq('id', weddingId).eq('company_id', member.company_id).single()
  if (!wedding) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Fetch ceremonies for personalization
  const { data: events } = await sc
    .from('events').select('name, expected_count').eq('wedding_id', weddingId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ceremonyNames = (events ?? []).map((e: any) => e.name.toLowerCase().trim())
  const totalGuests   = Math.max(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (events ?? []).reduce((m: number, e: any) => Math.max(m, e.expected_count ?? 0), 0),
    100,
  )
  const budgetTotal = wedding.budget_total ?? totalGuests * 5000

  // Build vendor pre-fills from ceremonies (deduplicated)
  const seenVendors = new Set<string>()
  const prefilledVendors: { category: string; name: string; status: string; notes: string }[] = []
  for (const cname of ceremonyNames) {
    const vendorCats = CEREMONY_VENDORS[cname] ?? []
    for (const cat of vendorCats) {
      if (!seenVendors.has(cat)) {
        seenVendors.add(cat)
        prefilledVendors.push({
          category: cat, name: `[Enter ${cat} name]`,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          status: 'Enquired', notes: `For ${events?.find((e: any) => e.name.toLowerCase().trim() === cname)?.name ?? cname}`,
        })
      }
    }
  }
  // If no ceremonies, add default vendor suggestions
  if (prefilledVendors.length === 0) {
    ['Photography', 'Videography', 'Catering', 'Decoration', 'Music & DJ'].forEach(cat =>
      prefilledVendors.push({ category: cat, name: `[Enter ${cat} name]`, status: 'Enquired', notes: '' })
    )
  }

  // Build budget pre-fills
  const seenItems = new Set<string>()
  const prefilledBudget: { category: string; item: string; estimated: number }[] = []
  for (const cname of ceremonyNames) {
    const items = CEREMONY_BUDGET[cname] ?? []
    for (const { item, estimate } of items) {
      if (!seenItems.has(item)) {
        seenItems.add(item)
        prefilledBudget.push({
          category: getCategoryForItem(item),
          item,
          estimated: Math.round(estimate(budgetTotal, totalGuests) / 1000) * 1000,
        })
      }
    }
  }
  if (prefilledBudget.length === 0) {
    prefilledBudget.push(
      { category: 'Venue', item: 'Venue rental', estimated: Math.round(budgetTotal * 0.35 / 1000) * 1000 },
      { category: 'Catering', item: `Catering — ${totalGuests} pax`, estimated: totalGuests * 1000 },
      { category: 'Photography & Video', item: 'Photography package', estimated: Math.round(budgetTotal * 0.06 / 1000) * 1000 },
      { category: 'Decoration', item: 'Decoration — all ceremonies', estimated: Math.round(budgetTotal * 0.12 / 1000) * 1000 },
    )
  }

  // Generate workbook
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Shaadi App'; wb.created = new Date()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addInstructionsSheet(wb, events?.map((e: any) => e.name) ?? [])
  addGuestsSheet(wb)
  addVendorsSheet(wb, prefilledVendors)
  addBudgetSheet(wb, prefilledBudget)
  addSampleSheet(wb)

  const buffer = await wb.xlsx.writeBuffer()
  const name = `${wedding.bride_name}${wedding.groom_name ? `-${wedding.groom_name}` : ''}-setup-pack.xlsx`
    .replace(/\s+/g, '-').toLowerCase()

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${name}"`,
    },
  })
}

function getCategoryForItem(item: string): string {
  const map: [string[], string][] = [
    [['photo','video','cinema'],          'Photography & Video'],
    [['catering','food','meal','dinner','lunch','chai'], 'Catering'],
    [['decor','flower','floral','mandap'],'Decoration'],
    [['dj','music','band','dhol','sound'], 'Music & Entertainment'],
    [['transport','bus','horse','car'],   'Transportation'],
    [['pandit','puja','samagri'],         'Miscellaneous'],
    [['mehandi'],                         'Mehandi'],
    [['makeup','hair'],                   'Makeup & Hair'],
    [['firework'],                        'Miscellaneous'],
    [['choreograph'],                     'Music & Entertainment'],
    [['lighting'],                        'Decoration'],
  ]
  const l = item.toLowerCase()
  for (const [keywords, cat] of map) {
    if (keywords.some(k => l.includes(k))) return cat
  }
  return 'Miscellaneous'
}
