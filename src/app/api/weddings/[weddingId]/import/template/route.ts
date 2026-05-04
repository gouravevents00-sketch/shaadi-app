import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'

// ─── Color tokens ────────────────────────────────────────────────────────────
const C = {
  rose800:  'FF9F1239',
  rose100:  'FFFFE4E6',
  rose50:   'FFFFF1F2',
  stone800: 'FF292524',
  stone700: 'FF44403C',
  stone600: 'FF57534E',
  stone400: 'FFA8A29E',
  stone200: 'FFE7E5E4',
  stone100: 'FFF5F5F4',
  stone50:  'FFFAFAF9',
  white:    'FFFFFFFF',
  yellow50: 'FFFEFCE8',
  amber100: 'FFFEF3C7',
  amber700: 'FFB45309',
  blue800:  'FF1E40AF',
  blue50:   'FFEFF6FF',
  green800: 'FF166534',
  green50:  'FFF0FDF4',
}

type FillType = 'pattern'
const fill = (argb: string): ExcelJS.Fill =>
  ({ type: 'pattern' as FillType, pattern: 'solid', fgColor: { argb } })

const font = (argb: string, bold = false, size = 10): Partial<ExcelJS.Font> =>
  ({ bold, color: { argb }, size })

interface WeddingMeta {
  coupleName: string
  dateStr: string
  venue: string
}

// ─── Brand header rows 1–3 ───────────────────────────────────────────────────
function addBrandHeader(
  ws: ExcelJS.Worksheet,
  sheetTitle: string,
  meta: WeddingMeta,
  totalCols: number,
) {
  // Row 1 — main title
  ws.getRow(1).height = 34
  ws.mergeCells(1, 1, 1, totalCols)
  const r1 = ws.getCell('A1')
  r1.value = `${meta.coupleName}  —  ${sheetTitle}`
  r1.font = { bold: true, color: { argb: C.white }, size: 13 }
  r1.fill = fill(C.rose800)
  r1.alignment = { vertical: 'middle', horizontal: 'left', indent: 2 }

  // Row 2 — wedding details
  ws.getRow(2).height = 20
  ws.mergeCells(2, 1, 2, totalCols)
  const r2 = ws.getCell('A2')
  r2.value = [meta.dateStr, meta.venue].filter(Boolean).join('  ·  ')
  r2.font = { bold: false, color: { argb: C.rose800 }, size: 9 }
  r2.fill = fill(C.rose50)
  r2.alignment = { vertical: 'middle', horizontal: 'left', indent: 2 }

  // Row 3 — delete-samples warning
  ws.getRow(3).height = 16
  ws.mergeCells(3, 1, 3, totalCols)
  const r3 = ws.getCell('A3')
  r3.value = '⚠  Yellow rows are sample data — overwrite or delete them before uploading this file'
  r3.font = { bold: false, color: { argb: C.amber700 }, size: 8 }
  r3.fill = fill(C.amber100)
  r3.alignment = { vertical: 'middle', horizontal: 'left', indent: 2 }
}

// ─── Column header row at row 4 ──────────────────────────────────────────────
// Each header: [label, isRequired, colWidth]
function setHeaderRow(ws: ExcelJS.Worksheet, headers: [string, boolean, number][]) {
  ws.getRow(4).height = 26
  headers.forEach(([label, required, width], i) => {
    const col = i + 1
    const cell = ws.getCell(4, col)
    cell.value = required ? `${label}  *` : label
    cell.fill = fill(required ? C.rose800 : C.stone800)
    cell.font = { bold: true, color: { argb: C.white }, size: 9 }
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
    cell.border = { right: { style: 'thin', color: { argb: C.stone700 } } }
    ws.getColumn(col).width = width
  })
}

// ─── Dropdown validation (data starts row 5) ─────────────────────────────────
function addDropdown(ws: ExcelJS.Worksheet, col: string, values: string[]) {
  const formulae = [`"${values.join(',')}"`]
  for (let r = 5; r <= 504; r++) {
    ws.getCell(`${col}${r}`).dataValidation = {
      type: 'list', allowBlank: true, formulae,
      showErrorMessage: true, errorStyle: 'warning',
      errorTitle: 'Invalid selection',
      error: `Choose from: ${values.join(', ')}`,
    }
  }
}

// ─── Style data rows (samples yellow, rest alternating) ──────────────────────
function styleDataRows(ws: ExcelJS.Worksheet, sampleCount: number, totalCols: number) {
  for (let r = 5; r < 5 + sampleCount; r++) {
    ws.getRow(r).height = 18
    for (let c = 1; c <= totalCols; c++) {
      const cell = ws.getCell(r, c)
      cell.fill = fill(C.yellow50)
      cell.font = { italic: true, color: { argb: C.stone600 }, size: 10 }
      cell.alignment = { vertical: 'middle' }
    }
  }
  for (let r = 5 + sampleCount; r <= 5 + 500; r++) {
    if (r % 2 === 0) for (let c = 1; c <= totalCols; c++) ws.getCell(r, c).fill = fill(C.stone50)
  }
}

// ─── Boxed summary panel ──────────────────────────────────────────────────────
function addBoxedSummary(
  ws: ExcelJS.Worksheet,
  startCol: number,
  title: string,
  items: { label: string; formula: string; isAmount?: boolean }[],
) {
  const lc = startCol, vc = startCol + 1
  ws.getColumn(lc).width = 22
  ws.getColumn(vc).width = 14

  // Header (row 4, same level as column headers)
  const headerRow = 4
  ws.getRow(headerRow) // ensure row exists
  ws.mergeCells(headerRow, lc, headerRow, vc)
  const hCell = ws.getCell(headerRow, lc)
  hCell.value = title
  hCell.font = { bold: true, color: { argb: C.rose800 }, size: 9 }
  hCell.fill = fill(C.rose50)
  hCell.alignment = { horizontal: 'center', vertical: 'middle' }
  hCell.border = {
    top:    { style: 'medium', color: { argb: C.rose800 } },
    left:   { style: 'medium', color: { argb: C.rose800 } },
    right:  { style: 'medium', color: { argb: C.rose800 } },
    bottom: { style: 'hair',   color: { argb: C.stone200 } },
  }

  // Data rows
  items.forEach(({ label, formula, isAmount }, i) => {
    const row = headerRow + 1 + i
    const isLast = i === items.length - 1
    const bg = i % 2 === 0 ? C.white : C.stone50

    const labelCell = ws.getCell(row, lc)
    labelCell.value = label
    labelCell.font = font(C.stone600, false, 9)
    labelCell.fill = fill(bg)
    labelCell.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 }
    labelCell.border = {
      left:   { style: 'medium', color: { argb: C.rose800 } },
      bottom: isLast ? { style: 'medium', color: { argb: C.rose800 } } : { style: 'hair', color: { argb: C.stone200 } },
      right:  { style: 'hair',   color: { argb: C.stone200 } },
    }

    const valCell = ws.getCell(row, vc)
    valCell.value = { formula }
    valCell.font = font(C.stone800, true, 10)
    valCell.fill = fill(bg)
    valCell.numFmt = isAmount ? '#,##0' : '#,##0'
    valCell.alignment = { horizontal: 'center', vertical: 'middle' }
    valCell.border = {
      right:  { style: 'medium', color: { argb: C.rose800 } },
      bottom: isLast ? { style: 'medium', color: { argb: C.rose800 } } : { style: 'hair', color: { argb: C.stone200 } },
    }

    ws.getRow(row).height = 18
  })
}

// ─── Ceremony lookup tables ──────────────────────────────────────────────────
const CEREMONY_VENDORS: Record<string, string[]> = {
  'mehandi':       ['Mehandi Artist'],
  'haldi':         ['Florist (Haldi Decor)', 'Photography'],
  'ganesh poojan': ['Pandit', 'Florist'],
  'mayera':        ['Catering', 'Decoration'],
  'sham-e-mehfil': ['Music & DJ', 'Catering', 'Lighting'],
  'sham e mehfil': ['Music & DJ', 'Catering', 'Lighting'],
  'sangeet':       ['Choreographer', 'Music & DJ', 'Catering', 'Lighting'],
  'sagai':         ['Photography', 'Videography', 'Catering', 'Decoration'],
  'baraat':        ['Dhol & Band', 'Horse & Buggy', 'Fireworks', 'Transportation', 'Lighting'],
  'pheras':        ['Pandit', 'Decoration', 'Photography', 'Videography', 'Catering'],
  'vidaai':        ['Transportation'],
  'vidai':         ['Transportation'],
  'reception':     ['Music & DJ', 'Catering', 'Decoration', 'Photography', 'Videography', 'Lighting'],
  'cocktail':      ['Music & DJ', 'Catering'],
  'grah pravesh':  ['Pandit', 'Florist'],
}

type BudgetHint = { item: string; estimate: (total: number, guests: number) => number }
const CEREMONY_BUDGET: Record<string, BudgetHint[]> = {
  'mehandi':       [{ item: 'Mehandi Artist', estimate: (t) => Math.min(25000, t * 0.01) }],
  'haldi':         [{ item: 'Haldi Decor & Flowers', estimate: (t) => Math.min(40000, t * 0.015) }],
  'ganesh poojan': [{ item: 'Pandit Dakshina + Samagri', estimate: () => 15000 }],
  'sangeet':       [
    { item: 'DJ / Music Setup', estimate: (t) => Math.min(80000, t * 0.03) },
    { item: 'Choreographer', estimate: () => 30000 },
    { item: 'Catering (Sangeet)', estimate: (_, g) => g * 600 },
    { item: 'Lighting (Sangeet)', estimate: (t) => Math.min(60000, t * 0.02) },
  ],
  'sham-e-mehfil': [
    { item: 'DJ / Music (Mehfil)', estimate: (t) => Math.min(50000, t * 0.02) },
    { item: 'Catering (Mehfil)', estimate: (_, g) => g * 500 },
  ],
  'sham e mehfil': [
    { item: 'DJ / Music (Mehfil)', estimate: (t) => Math.min(50000, t * 0.02) },
    { item: 'Catering (Mehfil)', estimate: (_, g) => g * 500 },
  ],
  'sagai':         [
    { item: 'Catering (Sagai)', estimate: (_, g) => g * 700 },
    { item: 'Decoration (Sagai)', estimate: (t) => Math.min(100000, t * 0.04) },
    { item: 'Photography (Sagai)', estimate: (t) => Math.min(50000, t * 0.02) },
  ],
  'baraat':        [
    { item: 'Dhol & Band', estimate: () => 30000 },
    { item: 'Horse & Buggy', estimate: () => 35000 },
    { item: 'Fireworks', estimate: () => 25000 },
    { item: 'Baraat Lighting', estimate: (t) => Math.min(50000, t * 0.015) },
    { item: 'Baraat Transport', estimate: (t) => Math.min(80000, t * 0.02) },
  ],
  'pheras':        [
    { item: 'Pandit Fees', estimate: () => 21000 },
    { item: 'Mandap Decoration', estimate: (t) => Math.min(300000, t * 0.1) },
    { item: 'Catering (Wedding Day)', estimate: (_, g) => g * 1200 },
    { item: 'Photography Package', estimate: (t) => Math.min(200000, t * 0.07) },
    { item: 'Videography Package', estimate: (t) => Math.min(100000, t * 0.04) },
  ],
  'reception':     [
    { item: 'Reception Decoration', estimate: (t) => Math.min(400000, t * 0.12) },
    { item: 'Catering (Reception)', estimate: (_, g) => g * 1000 },
    { item: 'DJ / Music (Reception)', estimate: (t) => Math.min(80000, t * 0.025) },
    { item: 'Photography (Reception)', estimate: (t) => Math.min(80000, t * 0.025) },
  ],
  'vidai':         [{ item: 'Vidai Decoration & Flowers', estimate: () => 20000 }],
  'vidaai':        [{ item: 'Vidai Decoration & Flowers', estimate: () => 20000 }],
  'grah pravesh':  [{ item: 'Puja Samagri & Decor', estimate: () => 20000 }],
}

function budgetCategory(item: string): string {
  const map: [string[], string][] = [
    [['photo', 'video', 'cinema'], 'Photography & Video'],
    [['catering', 'food', 'meal', 'dinner', 'lunch'], 'Catering'],
    [['decor', 'flower', 'floral', 'mandap'], 'Decoration'],
    [['dj', 'music', 'band', 'dhol', 'sound', 'choreograph'], 'Music & Entertainment'],
    [['transport', 'bus', 'horse', 'car'], 'Transportation'],
    [['pandit', 'puja', 'samagri'], 'Miscellaneous'],
    [['mehandi'], 'Mehandi'],
    [['makeup', 'hair'], 'Makeup & Hair'],
    [['firework', 'lighting'], 'Decoration'],
  ]
  const l = item.toLowerCase()
  for (const [keys, cat] of map) if (keys.some(k => l.includes(k))) return cat
  return 'Miscellaneous'
}

// ─── Guests sheet ─────────────────────────────────────────────────────────────
// Columns A–K (11 cols). Parser (ImportPackWizard) expects these exact names.
function addGuestsSheet(wb: ExcelJS.Workbook, meta: WeddingMeta) {
  const ws = wb.addWorksheet('👥 Guests', { properties: { tabColor: { argb: C.rose800 } } })

  const TOTAL_COLS = 11
  addBrandHeader(ws, 'Guest List', meta, TOTAL_COLS)

  const headers: [string, boolean, number][] = [
    ['Name',          true,  28],
    ['Phone',         true,  16],
    ['Side',          true,  14],
    ['Family Group',  false, 22],
    ['Plus Count',    false, 13],
    ['VIP',           false,  9],
    ['Dietary',       false, 14],
    ['Dietary Notes', false, 22],
    ['Email',         false, 26],
    ['Notes',         false, 28],
    // Col K: intentionally blank — visual gap before summary
  ]
  setHeaderRow(ws, headers)

  addDropdown(ws, 'C', ['Bride', 'Groom', 'Both', 'Shared'])
  addDropdown(ws, 'F', ['Yes', 'No'])
  addDropdown(ws, 'G', ['Veg', 'Non-Veg', 'Jain', 'Other'])

  ws.getColumn(5).numFmt = '#,##0'  // Plus Count
  ws.getColumn(11).width = 2        // visual gap

  ws.views = [{ state: 'frozen', ySplit: 4 }]
  ws.autoFilter = { from: 'A4', to: 'J4' }

  // 3 sample rows
  const samples = [
    ['Ramesh Maheshwari', '9810011001', 'Groom', 'Maheshwari Family', 1, 'Yes', 'Veg',     '',                     'ramesh@gmail.com', "Groom's father"],
    ['Sunita Maheshwari', '9810011002', 'Groom', 'Maheshwari Family', 1, 'Yes', 'Veg',     '',                     '',                 "Groom's mother"],
    ['Pooja Agarwal',     '9600166001', 'Bride', 'Friends',           0, 'No',  'Jain',    'No onion, no garlic',  'pooja@gmail.com',  "Bride's best friend"],
  ]
  samples.forEach((row, i) => ws.getRow(5 + i).values = [undefined, ...row])
  styleDataRows(ws, samples.length, TOTAL_COLS - 1) // -1 for gap col

  // Summary box at col 13 (M)
  addBoxedSummary(ws, 13, '📊 LIVE COUNT', [
    { label: 'Total guests',       formula: 'COUNTA(A5:A504)' },
    { label: 'Bride side',         formula: 'COUNTIF(C5:C504,"Bride")' },
    { label: 'Groom side',         formula: 'COUNTIF(C5:C504,"Groom")' },
    { label: 'Both / Shared',      formula: 'COUNTIF(C5:C504,"Both")+COUNTIF(C5:C504,"Shared")' },
    { label: 'VIP',                formula: 'COUNTIF(F5:F504,"Yes")' },
    { label: 'Total pax (inc +1)', formula: 'COUNTA(A5:A504)+SUMIF(A5:A504,"<>",E5:E504)' },
    { label: 'Veg',                formula: 'COUNTIF(G5:G504,"Veg")' },
    { label: 'Non-Veg',            formula: 'COUNTIF(G5:G504,"Non-Veg")' },
    { label: 'Jain',               formula: 'COUNTIF(G5:G504,"Jain")' },
  ])

  ws.pageSetup.orientation = 'landscape'
  ws.pageSetup.fitToPage   = true
  ws.pageSetup.fitToWidth  = 1
}

// ─── Vendors sheet ────────────────────────────────────────────────────────────
// Columns A–I (9 cols). Parser expects these exact column names.
function addVendorsSheet(
  wb: ExcelJS.Workbook,
  meta: WeddingMeta,
  prefilled: { category: string; name: string; status: string; notes: string }[],
) {
  const ws = wb.addWorksheet('🏪 Vendors', { properties: { tabColor: { argb: C.blue800 } } })

  const TOTAL_COLS = 10 // 9 data + 1 gap
  addBrandHeader(ws, 'Vendor List', meta, TOTAL_COLS)

  const CATEGORIES = [
    'Photography', 'Videography', 'Catering', 'Decoration', 'Venue',
    'Music & DJ', 'Mehandi Artist', 'Makeup & Hair', 'Transportation',
    'Dhol & Band', 'Fireworks', 'Tent & Furniture', 'Lighting', 'Horse & Buggy',
    'Pandit', 'Florist', 'Choreographer', 'Event Management', 'Other',
  ]

  const headers: [string, boolean, number][] = [
    ['Category',         true,  22],
    ['Vendor Name',      true,  30],
    ['Contact Person',   false, 20],
    ['Phone',            false, 16],
    ['Email',            false, 24],
    ['Status',           false, 14],
    ['Total Amount (₹)', false, 18],
    ['Advance Paid (₹)', false, 18],
    ['Notes',            false, 28],
    // Col J: gap
  ]
  setHeaderRow(ws, headers)

  addDropdown(ws, 'A', CATEGORIES)
  addDropdown(ws, 'F', ['Enquired', 'Confirmed', 'Booked', 'Cancelled'])

  ws.getColumn(7).numFmt = '#,##0'
  ws.getColumn(8).numFmt = '#,##0'
  ws.getColumn(10).width = 2

  ws.views = [{ state: 'frozen', ySplit: 4 }]
  ws.autoFilter = { from: 'A4', to: 'I4' }

  prefilled.forEach((v, i) => {
    const row = ws.getRow(5 + i)
    row.values = [undefined, v.category, v.name, '', '', '', v.status, 0, 0, v.notes]
    for (let c = 1; c <= 9; c++) {
      row.getCell(c).fill = fill(C.yellow50)
      row.getCell(c).font = { italic: true, color: { argb: C.stone600 }, size: 10 }
      row.getCell(c).alignment = { vertical: 'middle' }
    }
    row.height = 18
  })

  // Alternating rows after prefilled
  for (let r = 5 + prefilled.length; r <= 504; r++) {
    if (r % 2 === 0) for (let c = 1; c <= 9; c++) ws.getCell(r, c).fill = fill(C.stone50)
  }

  addBoxedSummary(ws, 12, '📊 LIVE COUNT', [
    { label: 'Total vendors',    formula: 'COUNTA(B5:B504)' },
    { label: 'Booked',           formula: 'COUNTIF(F5:F504,"Booked")' },
    { label: 'Confirmed',        formula: 'COUNTIF(F5:F504,"Confirmed")' },
    { label: 'Enquired',         formula: 'COUNTIF(F5:F504,"Enquired")' },
    { label: 'Total budget (₹)', formula: 'SUM(G5:G504)', isAmount: true },
    { label: 'Advance paid (₹)', formula: 'SUM(H5:H504)', isAmount: true },
    { label: 'Balance due (₹)',  formula: 'SUM(G5:G504)-SUM(H5:H504)', isAmount: true },
  ])

  ws.pageSetup.orientation = 'landscape'
  ws.pageSetup.fitToPage   = true
  ws.pageSetup.fitToWidth  = 1
}

// ─── Budget sheet ─────────────────────────────────────────────────────────────
// Columns A–F (5 data + 1 gap). Parser expects these exact column names.
function addBudgetSheet(
  wb: ExcelJS.Workbook,
  meta: WeddingMeta,
  prefilled: { category: string; item: string; estimated: number }[],
) {
  const ws = wb.addWorksheet('💰 Budget', { properties: { tabColor: { argb: C.green800 } } })

  const TOTAL_COLS = 7 // 6 data + 1 gap
  addBrandHeader(ws, 'Budget Planner', meta, TOTAL_COLS)

  const CATEGORIES = [
    'Venue', 'Catering', 'Decoration', 'Photography & Video',
    'Music & Entertainment', 'Transportation', 'Makeup & Hair',
    'Invitations & Stationery', 'Accommodation', 'Mehandi', 'Miscellaneous',
  ]

  const headers: [string, boolean, number][] = [
    ['Category',         true,  26],
    ['Item',             true,  38],
    ['Estimated (₹)',    false, 18],
    ['Vendor Quote (₹)', false, 18],
    ['Vendor Name',      false, 24],
    ['Notes',            false, 28],
    // Col G: gap
  ]
  setHeaderRow(ws, headers)

  addDropdown(ws, 'A', CATEGORIES)
  ws.getColumn(3).numFmt = '#,##0'
  ws.getColumn(4).numFmt = '#,##0'
  ws.getColumn(7).width  = 2

  ws.views = [{ state: 'frozen', ySplit: 4 }]
  ws.autoFilter = { from: 'A4', to: 'F4' }

  prefilled.forEach((b, i) => {
    const row = ws.getRow(5 + i)
    row.values = [undefined, b.category, b.item, b.estimated, 0, '', '']
    for (let c = 1; c <= 6; c++) {
      row.getCell(c).fill = fill(C.yellow50)
      row.getCell(c).font = { italic: true, color: { argb: C.stone600 }, size: 10 }
      row.getCell(c).alignment = { vertical: 'middle' }
    }
    row.getCell(3).numFmt = '#,##0'
    row.getCell(4).numFmt = '#,##0'
    row.height = 18
  })

  for (let r = 5 + prefilled.length; r <= 204; r++) {
    if (r % 2 === 0) for (let c = 1; c <= 6; c++) ws.getCell(r, c).fill = fill(C.stone50)
  }

  addBoxedSummary(ws, 9, '📊 BUDGET SUMMARY', [
    { label: 'Total items',          formula: 'COUNTA(B5:B204)' },
    { label: 'Total estimated (₹)',  formula: 'SUM(C5:C204)', isAmount: true },
    { label: 'Total quoted (₹)',     formula: 'SUM(D5:D204)', isAmount: true },
    { label: 'Variance (₹)',         formula: 'SUM(C5:C204)-SUM(D5:D204)', isAmount: true },
  ])

  ws.pageSetup.orientation = 'landscape'
  ws.pageSetup.fitToPage   = true
  ws.pageSetup.fitToWidth  = 1
}

// ─── Instructions sheet ───────────────────────────────────────────────────────
function addInstructionsSheet(wb: ExcelJS.Workbook, meta: WeddingMeta, ceremonies: string[]) {
  const ws = wb.addWorksheet('📋 Guide', { properties: { tabColor: { argb: C.stone800 } } })
  ws.getColumn(1).width = 4
  ws.getColumn(2).width = 24
  ws.getColumn(3).width = 52
  ws.getColumn(4).width = 32

  function sectionHeader(row: number, text: string, bgArgb: string) {
    ws.getRow(row).height = 22
    ws.mergeCells(row, 1, row, 4)
    const cell = ws.getCell(row, 1)
    cell.value = text
    cell.font  = { bold: true, color: { argb: C.white }, size: 10 }
    cell.fill  = fill(bgArgb)
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 2 }
  }

  function dataRow(row: number, col: string, desc: string, example: string, alt = false) {
    ws.getRow(row).height = 18
    const bg = alt ? C.stone50 : C.white
    const c1 = ws.getCell(row, 2)
    const c2 = ws.getCell(row, 3)
    const c3 = ws.getCell(row, 4)
    c1.value = col;  c1.font = { bold: true,  color: { argb: C.stone800 }, size: 9 }; c1.fill = fill(bg); c1.alignment = { vertical: 'middle', indent: 1 }
    c2.value = desc; c2.font = { bold: false, color: { argb: C.stone600 }, size: 9 }; c2.fill = fill(bg); c2.alignment = { vertical: 'middle' }
    c3.value = example; c3.font = { italic: true, color: { argb: C.stone400 }, size: 9 }; c3.fill = fill(bg); c3.alignment = { vertical: 'middle' }
  }

  function stepRow(row: number, step: string, text: string) {
    ws.getRow(row).height = 20
    const c1 = ws.getCell(row, 2)
    const c2 = ws.getCell(row, 3)
    c1.value = step; c1.font = { bold: true, color: { argb: C.rose800 }, size: 10 }; c1.fill = fill(C.rose50); c1.alignment = { vertical: 'middle', horizontal: 'center' }
    c2.value = text; c2.font = { bold: false, color: { argb: C.stone700 }, size: 9 };  c2.fill = fill(C.rose50); c2.alignment = { vertical: 'middle', indent: 1 }
    c1.border = { right: { style: 'hair', color: { argb: C.rose100 } } }
  }

  function tipRow(row: number, icon: string, text: string, alt = false) {
    ws.getRow(row).height = 18
    const bg = alt ? C.stone50 : C.white
    const c1 = ws.getCell(row, 2)
    const c2 = ws.getCell(row, 3)
    c1.value = icon; c1.font = { size: 11 }; c1.fill = fill(bg); c1.alignment = { horizontal: 'center', vertical: 'middle' }
    c2.value = text; c2.font = { color: { argb: C.stone600 }, size: 9 }; c2.fill = fill(bg); c2.alignment = { vertical: 'middle' }
    ws.mergeCells(row, 3, row, 4)
  }

  function emptyRow(row: number, height = 8) {
    ws.getRow(row).height = height
  }

  let r = 1

  // ── Top header ──
  ws.getRow(r).height = 36
  ws.mergeCells(r, 1, r, 4)
  const top = ws.getCell(r, 1)
  top.value = `${meta.coupleName}  —  Wedding Setup Guide`
  top.font  = { bold: true, color: { argb: C.white }, size: 14 }
  top.fill  = fill(C.rose800)
  top.alignment = { vertical: 'middle', horizontal: 'left', indent: 3 }
  r++

  ws.getRow(r).height = 20
  ws.mergeCells(r, 1, r, 4)
  const sub = ws.getCell(r, 1)
  sub.value = [meta.dateStr, meta.venue, 'Powered by UtsavOS'].filter(Boolean).join('  ·  ')
  sub.font  = { color: { argb: C.rose800 }, size: 9 }
  sub.fill  = fill(C.rose50)
  sub.alignment = { vertical: 'middle', horizontal: 'left', indent: 3 }
  r++

  emptyRow(r++, 10)

  // ── How to use ──
  sectionHeader(r++, 'HOW TO USE THIS FILE', C.stone800)
  stepRow(r++, 'Step 1', 'Open the 👥 Guests sheet — fill in Name, Phone, Side (min required)')
  stepRow(r++, 'Step 2', 'Open the 🏪 Vendors sheet — fill in Category and Vendor Name')
  stepRow(r++, 'Step 3', 'Open the 💰 Budget sheet — fill in Category and Item with estimates')
  stepRow(r++, 'Step 4', 'Save this file · Go to app → wedding → Overview → Import Pack → Upload')
  emptyRow(r++, 10)

  // ── Quick tips ──
  sectionHeader(r++, 'QUICK TIPS', C.stone700)
  tipRow(r++, '🟡', 'Yellow rows are sample data — overwrite them or delete before uploading')
  tipRow(r++, '↓',  'Columns marked   *   are required — all others are optional', true)
  tipRow(r++, '🔄', 'Re-uploading is safe — existing records are updated, nothing deleted')
  tipRow(r++, '📞', 'Phone numbers: 10 digits, no country code  (e.g. 9876543210)', true)
  tipRow(r++, '₹',  'Amounts: numbers only — commas are ok  (150000 or 1,50,000 both work)')
  tipRow(r++, '📊', 'Live count panel on the right updates automatically as you fill data', true)
  emptyRow(r++, 10)

  // ── Ceremonies ──
  if (ceremonies.length > 0) {
    sectionHeader(r++, 'PERSONALISED FOR YOUR CEREMONIES', C.rose800)
    ws.getRow(r).height = 18
    ws.mergeCells(r, 1, r, 4)
    const cCell = ws.getCell(r, 1)
    cCell.value = `Pre-filled vendor + budget rows for: ${ceremonies.join(', ')}`
    cCell.font  = { color: { argb: C.stone600 }, size: 9, italic: true }
    cCell.fill  = fill(C.rose50)
    cCell.alignment = { vertical: 'middle', indent: 3 }
    r++
    emptyRow(r++, 10)
  }

  // ── Guest columns ──
  sectionHeader(r++, '👥 GUEST SHEET  —  COLUMN REFERENCE', C.rose800)
  ws.getRow(r).height = 16
  for (let c = 2; c <= 4; c++) {
    ws.getCell(r, c).fill = fill(C.stone100)
    ws.getCell(r, c).font = { bold: true, color: { argb: C.stone400 }, size: 8 }
  }
  ws.getCell(r, 2).value = 'Column'
  ws.getCell(r, 3).value = 'What to enter'
  ws.getCell(r, 4).value = 'Example'
  r++

  const guestCols: [string, string, string][] = [
    ['Name  *',        'Full name of the guest',                                    'Ramesh Maheshwari'],
    ['Phone  *',       '10-digit mobile number',                                    '9810011001'],
    ['Side  *',        'Bride / Groom / Both / Shared',                            'Groom'],
    ['Family Group',   'Group name — used for filtering and seating',               'Maheshwari Family'],
    ['Plus Count',     'How many additional people in this booking (0 if solo)',    '1 (family of 2 total)'],
    ['VIP',            'Yes or No',                                                 'Yes'],
    ['Dietary',        'Veg / Non-Veg / Jain / Other',                             'Veg'],
    ['Dietary Notes',  'Any special requirement',                                   'No onion, no garlic'],
    ['Email',          'Email address (optional)',                                  'ramesh@gmail.com'],
    ['Notes',          'Anything else worth noting',                                "Groom's father"],
  ]
  guestCols.forEach(([col, desc, ex], i) => { dataRow(r++, col, desc, ex, i % 2 === 1); })
  emptyRow(r++, 10)

  // ── Vendor columns ──
  sectionHeader(r++, '🏪 VENDOR SHEET  —  COLUMN REFERENCE', C.blue800)
  ws.getRow(r).height = 16
  for (let c = 2; c <= 4; c++) {
    ws.getCell(r, c).fill = fill(C.stone100)
    ws.getCell(r, c).font = { bold: true, color: { argb: C.stone400 }, size: 8 }
  }
  ws.getCell(r, 2).value = 'Column'
  ws.getCell(r, 3).value = 'What to enter'
  ws.getCell(r, 4).value = 'Example'
  r++

  const vendorCols: [string, string, string][] = [
    ['Category  *',      'Pick from dropdown — Photography, Catering, etc.',         'Photography'],
    ['Vendor Name  *',   'Business or artist name',                                  'Raj Photography Studio'],
    ['Contact Person',   'Name of the point of contact',                             'Raj Kumar'],
    ['Phone',            '10-digit mobile of the vendor',                            '9876543210'],
    ['Email',            'Vendor email',                                             'raj@photo.com'],
    ['Status',           'Enquired / Confirmed / Booked / Cancelled',               'Booked'],
    ['Total Amount (₹)', 'Full agreed amount',                                       '150000'],
    ['Advance Paid (₹)', 'Amount already paid',                                      '50000'],
    ['Notes',            'Any notes — contract terms, inclusions, etc.',             '2 cameras, drone included'],
  ]
  vendorCols.forEach(([col, desc, ex], i) => { dataRow(r++, col, desc, ex, i % 2 === 1) })
  emptyRow(r++, 10)

  // ── Budget columns ──
  sectionHeader(r++, '💰 BUDGET SHEET  —  COLUMN REFERENCE', C.green800)
  ws.getRow(r).height = 16
  for (let c = 2; c <= 4; c++) {
    ws.getCell(r, c).fill = fill(C.stone100)
    ws.getCell(r, c).font = { bold: true, color: { argb: C.stone400 }, size: 8 }
  }
  ws.getCell(r, 2).value = 'Column'
  ws.getCell(r, 3).value = 'What to enter'
  ws.getCell(r, 4).value = 'Example'
  r++

  const budgetCols: [string, string, string][] = [
    ['Category  *',     'Pick from dropdown — Venue, Catering, etc.',   'Catering'],
    ['Item  *',         'Description of the budget item',                'Wedding dinner — 250 pax'],
    ['Estimated (₹)',   'Your estimated cost',                           '800000'],
    ['Actual (₹)',      'Actual/quoted amount from vendor',              '750000'],
    ['Vendor Name',     'Which vendor this belongs to',                  'Sharma Caterers'],
    ['Notes',           'Any remarks',                                   'Veg menu only'],
  ]
  budgetCols.forEach(([col, desc, ex], i) => { dataRow(r++, col, desc, ex, i % 2 === 1) })
  emptyRow(r++, 10)

  // ── Smart matching ──
  sectionHeader(r++, 'SMART MATCHING — WHAT HAPPENS ON RE-UPLOAD', C.stone700)
  tipRow(r++, '👥', 'Guests matched by phone first → name second. No duplicates ever created.')
  tipRow(r++, '🏪', 'Vendors matched by category + vendor name combination.', true)
  tipRow(r++, '💰', 'Budget items matched by category + item description.', false)
  tipRow(r++, '✅', 'All existing records are updated in-place — nothing deleted.', true)
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ weddingId: string }> },
) {
  const { weddingId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase.from('company_members')
    .select('company_id').eq('user_id', user.id).single()
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const sc = createServiceClient()
  const { data: wedding } = await sc.from('weddings')
    .select('id, bride_name, groom_name, budget_total, primary_city, primary_venue, wedding_date')
    .eq('id', weddingId).eq('company_id', member.company_id).single()
  if (!wedding) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: events } = await sc.from('events')
    .select('name, expected_count, date').eq('wedding_id', weddingId).order('date')

  // Build wedding metadata for headers
  const coupleName = [wedding.bride_name, wedding.groom_name].filter(Boolean).join(' & ')
  const dateStr = wedding.wedding_date
    ? new Date(wedding.wedding_date + 'T00:00:00').toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : ''
  const venue = [wedding.primary_venue, wedding.primary_city].filter(Boolean).join(', ')
  const meta: WeddingMeta = { coupleName, dateStr, venue }

  const ceremonyNames = (events ?? []).map((e: { name: string }) => e.name.toLowerCase().trim())
  const totalGuests = Math.max(
    (events ?? []).reduce((m: number, e: { expected_count: number }) => Math.max(m, e.expected_count ?? 0), 0),
    100,
  )
  const budgetTotal = wedding.budget_total ?? totalGuests * 5000

  // Pre-fill vendors from ceremonies
  const seenVendors = new Set<string>()
  const prefilledVendors: { category: string; name: string; status: string; notes: string }[] = []
  for (const cname of ceremonyNames) {
    for (const cat of CEREMONY_VENDORS[cname] ?? []) {
      if (!seenVendors.has(cat)) {
        seenVendors.add(cat)
        const evName = (events ?? []).find((e: { name: string }) => e.name.toLowerCase().trim() === cname)?.name ?? cname
        prefilledVendors.push({ category: cat, name: '', status: 'Enquired', notes: `For ${evName}` })
      }
    }
  }
  if (prefilledVendors.length === 0) {
    ['Photography', 'Videography', 'Catering', 'Decoration', 'Music & DJ'].forEach(cat =>
      prefilledVendors.push({ category: cat, name: '', status: 'Enquired', notes: '' })
    )
  }

  // Pre-fill budget from ceremonies
  const seenItems = new Set<string>()
  const prefilledBudget: { category: string; item: string; estimated: number }[] = []
  for (const cname of ceremonyNames) {
    for (const { item, estimate } of CEREMONY_BUDGET[cname] ?? []) {
      if (!seenItems.has(item)) {
        seenItems.add(item)
        prefilledBudget.push({
          category: budgetCategory(item),
          item,
          estimated: Math.round(estimate(budgetTotal, totalGuests) / 1000) * 1000,
        })
      }
    }
  }
  if (prefilledBudget.length === 0) {
    prefilledBudget.push(
      { category: 'Venue',                item: 'Venue rental', estimated: Math.round(budgetTotal * 0.35 / 1000) * 1000 },
      { category: 'Catering',             item: `Catering — ${totalGuests} pax`, estimated: totalGuests * 1000 },
      { category: 'Photography & Video',  item: 'Photography package', estimated: Math.round(budgetTotal * 0.06 / 1000) * 1000 },
      { category: 'Decoration',           item: 'Decoration — all ceremonies', estimated: Math.round(budgetTotal * 0.12 / 1000) * 1000 },
    )
  }

  // Build workbook
  const wb = new ExcelJS.Workbook()
  wb.creator  = 'UtsavOS'
  wb.created  = new Date()
  wb.modified = new Date()

  addInstructionsSheet(wb, meta, (events ?? []).map((e: { name: string }) => e.name))
  addGuestsSheet(wb, meta)
  addVendorsSheet(wb, meta, prefilledVendors)
  addBudgetSheet(wb, meta, prefilledBudget)

  const buffer = await wb.xlsx.writeBuffer()
  const slug = coupleName.replace(/\s+/g, '-').replace(/&/g, 'and').toLowerCase()
  const fileName = `${slug}-setup-pack.xlsx`

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  })
}
