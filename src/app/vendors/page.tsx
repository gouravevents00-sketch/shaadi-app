import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Search, Star, MapPin, Phone, ExternalLink, CheckCircle2, Sparkles } from 'lucide-react'

const CATEGORIES = [
  'All', 'Photographer', 'Videographer', 'Caterer', 'Decorator', 'Florist',
  'Makeup Artist', 'DJ / Band', 'Venue', 'Pandit', 'Mehendi Artist',
  'Wedding Planner', 'Invitation Designer', 'Transport', 'Accommodation',
]

type MarketplaceVendor = {
  id: string
  name: string
  slug: string
  category: string
  city: string
  tagline: string | null
  price_from: number | null
  price_unit: string | null
  rating: number
  review_count: number
  is_verified: boolean
  is_featured: boolean
  tags: string[]
}

export default async function VendorMarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; city?: string; q?: string }>
}) {
  const params = await searchParams
  const category = params.category || ''
  const city = params.city || ''
  const q = params.q || ''

  const sc = createServiceClient()
  let query = sc
    .from('marketplace_vendors')
    .select('id, name, slug, category, city, tagline, price_from, price_unit, rating, review_count, is_verified, is_featured, tags')
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('rating', { ascending: false })
    .limit(48)

  if (category && category !== 'All') query = query.eq('category', category)
  if (city) query = query.ilike('city', `%${city}%`)
  if (q) query = query.ilike('name', `%${q}%`)

  const { data: vendors } = await query

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-stone-900">Find Vendors</h1>
              <p className="text-stone-500 text-sm mt-0.5">Discover trusted vendors for your celebration</p>
            </div>
            <Link href="/celebrate" className="text-xs text-stone-400 hover:text-stone-700">← Back to planning</Link>
          </div>

          {/* Search */}
          <form method="GET" className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Search vendors..."
                className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-rose-300"
              />
            </div>
            <input
              name="city"
              defaultValue={city}
              placeholder="City"
              className="w-32 px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-rose-300"
            />
            <button type="submit" className="bg-rose-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-rose-800 transition-colors">
              Search
            </button>
          </form>
        </div>

        {/* Category tabs */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-0">
          <div className="flex gap-1 overflow-x-auto pb-0 hide-scrollbar">
            {CATEGORIES.map(cat => (
              <Link
                key={cat}
                href={`/vendors?category=${cat === 'All' ? '' : cat}${city ? `&city=${city}` : ''}${q ? `&q=${q}` : ''}`}
                className={`flex-shrink-0 text-xs font-medium px-3 py-2 border-b-2 transition-colors ${
                  (cat === 'All' && !category) || cat === category
                    ? 'border-rose-600 text-rose-700'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Vendor grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {!vendors || vendors.length === 0 ? (
          <div className="text-center py-20">
            <Sparkles className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-600 font-semibold">No vendors listed yet</p>
            <p className="text-stone-400 text-sm mt-1">We&apos;re onboarding vendors — check back soon!</p>
            <p className="text-stone-400 text-xs mt-4">
              Are you a vendor?{' '}
              <a href="mailto:vendors@creativeeraos.com" className="text-rose-600 hover:underline">List your business →</a>
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-stone-400 mb-4">{vendors.length} vendor{vendors.length !== 1 ? 's' : ''} found</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(vendors as MarketplaceVendor[]).map(v => (
                <div key={v.id} className="bg-white border border-stone-200 rounded-xl p-4 hover:border-stone-300 hover:shadow-sm transition-all">
                  {/* Top */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-stone-900 text-sm truncate">{v.name}</p>
                        {v.is_verified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-stone-400">{v.category}</p>
                    </div>
                    {v.is_featured && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">Featured</span>
                    )}
                  </div>

                  {v.tagline && <p className="text-xs text-stone-600 mb-2.5 leading-relaxed">{v.tagline}</p>}

                  {/* Meta */}
                  <div className="flex items-center gap-3 text-xs text-stone-400 mb-3">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {v.city}
                    </span>
                    {v.review_count > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        {v.rating.toFixed(1)} ({v.review_count})
                      </span>
                    )}
                    {v.price_from && (
                      <span className="text-emerald-600 font-medium">
                        from ₹{v.price_from.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  {v.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {v.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">{tag}</span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2 border-t border-stone-50">
                    <Link href={`/vendors/${v.slug}`}
                      className="flex-1 text-center text-xs font-medium bg-rose-700 text-white py-2 rounded-lg hover:bg-rose-800 transition-colors">
                      View profile
                    </Link>
                    <a href={`tel:${v.id}`}
                      className="w-9 h-9 flex items-center justify-center border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors">
                      <Phone className="w-3.5 h-3.5 text-stone-500" />
                    </a>
                    <a href={`/vendors/${v.slug}`}
                      className="w-9 h-9 flex items-center justify-center border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors">
                      <ExternalLink className="w-3.5 h-3.5 text-stone-500" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* CTA for vendors to list */}
        <div className="mt-10 bg-white border border-stone-200 rounded-2xl p-6 text-center">
          <p className="font-semibold text-stone-800">Are you a wedding vendor?</p>
          <p className="text-stone-500 text-sm mt-1 mb-4">List your business on Creative Era OS and reach thousands of couples planning their celebrations</p>
          <a href="mailto:vendors@creativeeraos.com?subject=List my business"
            className="inline-flex items-center gap-2 bg-rose-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-rose-800 transition-colors">
            List your business for free →
          </a>
        </div>
      </div>
    </div>
  )
}
