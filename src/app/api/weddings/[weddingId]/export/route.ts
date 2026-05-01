import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'

type FillType = 'pattern'
const fill = (argb: string): ExcelJS.Fill => ({ type: 'pattern' as FillType, pattern: 'solid', fgColor: { argb } })
const HEADER_FILL = fill('FF292524')
const WHITE_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
const STONE50 = fill('FFFAFAF9')

function headerRow(ws: ExcelJS.Worksheet, cols: { label: string; width: number }[]) {
  cols.forEach(({ label, width }, i) => {
    const cell = ws.getCell(1, i + 1)
    cell.value = label
    cell.fill = HEADER_FILL
    cell.font = WHITE_FONT
    cell.alignment = { vertical: 'middle', horizontal: 'left' }
    ws.getColumn(i + 1).width = width
  })
  ws.getRow(1).height = 20
  ws.views = [{ state: 'frozen', ySplit: 1 }]
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } }
}

function styleDataRows(ws: ExcelJS.Worksheet, rowCount: number, colCount: number) {
  for (let r = 2; r <= rowCount + 1; r++) {
    if (r % 2 === 0) for (let col = 1; col <= colCount; col++) ws.getCell(r, col).fill = STONE50
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ weddingId: string }> },
) {
  const { weddingId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single()
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const sc = createServiceClient()
  const { data: wedding } = await sc.from('weddings')
    .select('id, bride_name, groom_name')
    .eq('id', weddingId).eq('company_id', member.company_id).single()
  if (!wedding) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const [
    { data: guests },
    { data: vendors },
    { data: categories },
    { data: budgetItems },
  ] = await Promise.all([
    sc.from('guests').select('name, phone, email, side, is_vip, dietary, dietary_notes, family_group, notes').eq('wedding_id', weddingId).order('name'),
    sc.from('vendors').select('category, name, contact_name, phone, email, status, total_amount, paid_amount, notes').eq('wedding_id', weddingId).order('category'),
    sc.from('budget_categories').select('id, name').eq('wedding_id', weddingId),
    sc.from('budget_items').select('category_id, description, estimated, quoted, paid').eq('wedding_id', weddingId),
  ])

  // Build category lookup
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const catMap = new Map<string, string>((categories ?? []).map((c: any) => [c.id, c.name]))

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Shaadi App Export'; wb.created = new Date()

  // ── Guests sheet ──────────────────────────────────────────────────────────────
  const wsG = wb.addWorksheet('👥 Guests', { properties: { tabColor: { argb: 'FF9F1239' } } })
  headerRow(wsG, [
    { label: 'Name *', width: 28 }, { label: 'Phone', width: 16 }, { label: 'Email', width: 26 },
    { label: 'Side', width: 12 }, { label: 'VIP', width: 8 }, { label: 'Dietary', width: 14 },
    { label: 'Dietary Notes', width: 22 }, { label: 'Family Group', width: 22 }, { label: 'Notes', width: 25 },
  ])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(guests ?? []).forEach((g: any, idx: number) => {
    wsG.getRow(idx + 2).values = [
      g.name, g.phone ?? '', g.email ?? '',
      g.side ? (g.side.charAt(0).toUpperCase() + g.side.slice(1)) : 'Both',
      g.is_vip ? 'Yes' : 'No',
      g.dietary === 'non_veg' ? 'Non-Veg' : g.dietary ? (g.dietary.charAt(0).toUpperCase() + g.dietary.slice(1)) : 'Veg',
      g.dietary_notes ?? '', g.family_group ?? '', g.notes ?? '',
    ]
  })
  styleDataRows(wsG, (guests ?? []).length, 9)

  // ── Vendors sheet ──────────────────────────────────────────────────────────────
  const wsV = wb.addWorksheet('🏪 Vendors', { properties: { tabColor: { argb: 'FF1E40AF' } } })
  headerRow(wsV, [
    { label: 'Category *', width: 20 }, { label: 'Vendor Name *', width: 28 }, { label: 'Contact Person', width: 20 },
    { label: 'Phone', width: 16 }, { label: 'Email', width: 26 }, { label: 'Status', width: 14 },
    { label: 'Total Amount (₹)', width: 18 }, { label: 'Advance Paid (₹)', width: 18 }, { label: 'Notes', width: 28 },
  ])
  wsV.getColumn(7).numFmt = '#,##0'; wsV.getColumn(8).numFmt = '#,##0'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(vendors ?? []).forEach((v: any, idx: number) => {
    wsV.getRow(idx + 2).values = [
      v.category, v.name, v.contact_name ?? '', v.phone ?? '', v.email ?? '',
      v.status ? (v.status.charAt(0).toUpperCase() + v.status.slice(1)) : 'Enquired',
      v.total_amount ?? 0, v.paid_amount ?? 0, v.notes ?? '',
    ]
  })
  styleDataRows(wsV, (vendors ?? []).length, 9)

  // ── Budget sheet ──────────────────────────────────────────────────────────────
  const wsB = wb.addWorksheet('💰 Budget', { properties: { tabColor: { argb: 'FF166534' } } })
  headerRow(wsB, [
    { label: 'Category *', width: 24 }, { label: 'Item *', width: 32 },
    { label: 'Estimated (₹)', width: 16 }, { label: 'Actual (₹)', width: 16 },
    { label: 'Vendor Name', width: 24 }, { label: 'Notes', width: 28 },
  ])
  wsB.getColumn(3).numFmt = '#,##0'; wsB.getColumn(4).numFmt = '#,##0'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(budgetItems ?? []).forEach((b: any, idx: number) => {
    wsB.getRow(idx + 2).values = [
      catMap.get(b.category_id) ?? 'Uncategorised',
      b.description, b.estimated ?? 0, b.quoted ?? 0, '', '',
    ]
  })
  styleDataRows(wsB, (budgetItems ?? []).length, 6)

  const buffer = await wb.xlsx.writeBuffer()
  const name = `${wedding.bride_name}${wedding.groom_name ? `-${wedding.groom_name}` : ''}-export-${new Date().toISOString().slice(0, 10)}.xlsx`
    .replace(/\s+/g, '-').toLowerCase()

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${name}"`,
    },
  })
}
