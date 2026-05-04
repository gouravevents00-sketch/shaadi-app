import { createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { vendorId, rating, title, body } = await req.json()
    if (!vendorId || !rating || !body?.trim()) {
      return NextResponse.json({ error: 'vendorId, rating and body are required' }, { status: 400 })
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be 1–5' }, { status: 400 })
    }

    const sc = createServiceClient()

    // Insert review (pending = not yet shown; for now insert directly — admin can add moderation later)
    const { error } = await sc.from('marketplace_vendor_reviews').insert({
      vendor_id: vendorId,
      rating,
      title: title?.trim() || null,
      body: body.trim(),
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Recalculate vendor rating avg
    const { data: reviews } = await sc
      .from('marketplace_vendor_reviews')
      .select('rating')
      .eq('vendor_id', vendorId)

    if (reviews && reviews.length > 0) {
      const avg = reviews.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / reviews.length
      await sc.from('marketplace_vendors').update({
        rating: Math.round(avg * 10) / 10,
        review_count: reviews.length,
      }).eq('id', vendorId)
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
