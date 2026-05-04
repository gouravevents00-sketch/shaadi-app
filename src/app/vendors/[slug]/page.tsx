import { createClient, createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { MapPin, Star, CheckCircle2, Phone, Mail, Globe, ArrowLeft } from 'lucide-react'
import AddToEventButton from './AddToEventButton'
import ReviewForm from './ReviewForm'

export default async function VendorProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const sc = createServiceClient()

  const { data: vendor } = await sc
    .from('marketplace_vendors')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!vendor) notFound()

  const { data: reviews } = await sc
    .from('marketplace_vendor_reviews')
    .select('id, rating, title, body, created_at, user_id')
    .eq('vendor_id', vendor.id)
    .order('created_at', { ascending: false })
    .limit(10)

  // Check if user is logged in for "Add to event"
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get user's weddings for the "Add to event" dropdown
  let userWeddings: { id: string; label: string; date: string | null }[] = []
  if (user) {
    const { data: member } = await sc.from('company_members')
      .select('company_id').eq('user_id', user.id).single()
    if (member) {
      const { data: weddings } = await sc.from('weddings')
        .select('id, bride_name, groom_name, wedding_date')
        .eq('company_id', member.company_id)
        .order('wedding_date', { ascending: true })
        .limit(10)
      userWeddings = (weddings ?? []).map((w: { id: string; bride_name: string; groom_name: string; wedding_date: string | null }) => ({
        id: w.id,
        label: w.groom_name ? `${w.bride_name} & ${w.groom_name}` : w.bride_name,
        date: w.wedding_date,
      }))
    }
  }

  const ratingStars = (r: number) => '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r))

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <Link href="/vendors" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to vendors
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-stone-900">{vendor.name}</h1>
                {vendor.is_verified && (
                  <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Verified
                  </span>
                )}
                {vendor.is_featured && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Featured</span>
                )}
              </div>
              <p className="text-stone-500 mt-0.5">{vendor.category}</p>
              {vendor.tagline && <p className="text-stone-600 mt-2 text-sm leading-relaxed">{vendor.tagline}</p>}

              <div className="flex items-center gap-4 mt-3 flex-wrap text-sm text-stone-500">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {vendor.cities?.length > 1 ? vendor.cities.join(', ') : vendor.city}
                </span>
                {vendor.review_count > 0 && (
                  <span className="flex items-center gap-1.5 text-amber-600">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    {Number(vendor.rating).toFixed(1)} ({vendor.review_count} review{vendor.review_count !== 1 ? 's' : ''})
                  </span>
                )}
              </div>
            </div>

            {/* Add to event */}
            <div className="flex-shrink-0">
              <AddToEventButton
                vendorId={vendor.id}
                vendorName={vendor.name}
                weddings={userWeddings}
                isLoggedIn={!!user}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Images */}
          {vendor.images?.length > 0 && (
            <div className="grid grid-cols-2 gap-2 rounded-xl overflow-hidden">
              {vendor.images.slice(0, 4).map((img: string, i: number) => (
                <img key={i} src={img} alt={`${vendor.name} ${i + 1}`}
                  className={`w-full object-cover bg-stone-100 ${i === 0 ? 'col-span-2 h-56' : 'h-32'}`} />
              ))}
            </div>
          )}

          {/* Description */}
          {vendor.description && (
            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <h2 className="font-semibold text-stone-800 mb-2">About</h2>
              <p className="text-stone-600 text-sm leading-relaxed whitespace-pre-line">{vendor.description}</p>
            </div>
          )}

          {/* Tags */}
          {vendor.tags?.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-xl p-5">
              <h2 className="font-semibold text-stone-800 mb-3">Specialties</h2>
              <div className="flex flex-wrap gap-2">
                {(vendor.tags as string[]).map(tag => (
                  <span key={tag} className="text-sm bg-rose-50 text-rose-700 border border-rose-100 px-3 py-1 rounded-full">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          <div className="bg-white border border-stone-200 rounded-xl p-5">
            <h2 className="font-semibold text-stone-800 mb-4">
              Reviews {reviews && reviews.length > 0 && <span className="text-stone-400 font-normal">({reviews.length})</span>}
            </h2>
            {!reviews || reviews.length === 0 ? (
              <p className="text-stone-400 text-sm mb-4">No reviews yet — be the first!</p>
            ) : (
              <div className="space-y-4 mb-4">
                {reviews.map((r: { id: string; rating: number; title: string | null; body: string | null; created_at: string }) => (
                  <div key={r.id} className="border-b border-stone-100 last:border-0 pb-4 last:pb-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-amber-500 text-sm">{ratingStars(r.rating)}</span>
                      <span className="text-xs text-stone-400">
                        {new Date(r.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    {r.title && <p className="font-medium text-stone-800 text-sm">{r.title}</p>}
                    {r.body && <p className="text-stone-600 text-sm mt-0.5 leading-relaxed">{r.body}</p>}
                  </div>
                ))}
              </div>
            )}
            <ReviewForm vendorId={vendor.id} vendorSlug={vendor.slug} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Contact */}
          <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-3">
            <h2 className="font-semibold text-stone-800">Contact</h2>
            {vendor.phone && (
              <a href={`tel:${vendor.phone}`} className="flex items-center gap-2.5 text-sm text-stone-700 hover:text-rose-700 transition-colors">
                <Phone className="w-4 h-4 text-stone-400" /> {vendor.phone}
              </a>
            )}
            {vendor.email && (
              <a href={`mailto:${vendor.email}`} className="flex items-center gap-2.5 text-sm text-stone-700 hover:text-rose-700 transition-colors">
                <Mail className="w-4 h-4 text-stone-400" /> {vendor.email}
              </a>
            )}
            {vendor.website && (
              <a href={vendor.website} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-sm text-stone-700 hover:text-rose-700 transition-colors">
                <Globe className="w-4 h-4 text-stone-400" /> Website
              </a>
            )}
            {vendor.instagram && (
              <a href={`https://instagram.com/${(vendor.instagram as string).replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-sm text-stone-700 hover:text-rose-700 transition-colors">
                <span className="w-4 h-4 text-stone-400 text-center leading-4 text-xs font-bold">IG</span> @{(vendor.instagram as string).replace('@', '')}
              </a>
            )}
            {!vendor.phone && !vendor.email && !vendor.website && (
              <p className="text-xs text-stone-400">Contact details coming soon</p>
            )}
          </div>

          {/* WhatsApp enquiry */}
          {vendor.phone && (
            <a href={`https://wa.me/${vendor.phone.replace(/[^0-9]/g, '')}?text=Hi, I'm interested in your services for my wedding. Could you please share your availability and packages?`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-green-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 transition-colors">
              💬 WhatsApp Enquiry
            </a>
          )}

        </div>
      </div>
    </div>
  )
}
