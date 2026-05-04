'use server'

import { createServiceClient } from '@/lib/supabase/server'

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') +
    '-' + Math.random().toString(36).slice(2, 5)
}

export type VendorRegisterForm = {
  name: string
  category: string
  city: string
  tagline: string
  description: string
  phone: string
  email: string
  website: string
  instagram: string
  specializations: string[]   // derived from multi-select during registration
  yearsActive: string
  servesDestination: boolean
}

export async function submitVendorRegistration(form: VendorRegisterForm) {
  if (!form.name.trim() || !form.city.trim() || !form.email.trim()) {
    return { error: 'Name, city and email are required' }
  }

  const sc = createServiceClient()

  // Check duplicate by email
  const { data: existing } = await sc
    .from('marketplace_vendors')
    .select('id')
    .eq('email', form.email.trim())
    .maybeSingle()
  if (existing) return { error: 'A listing with this email already exists. Contact us to update it.' }

  const tags = [
    ...form.specializations,
    ...(form.servesDestination ? ['destination'] : []),
    ...(form.yearsActive ? [`${form.yearsActive}+ years experience`] : []),
  ]

  const { data, error } = await sc.from('marketplace_vendors').insert({
    name: form.name.trim(),
    slug: toSlug(form.name),
    category: form.category,
    city: form.city.trim(),
    tagline: form.tagline.trim() || null,
    description: form.description.trim() || null,
    phone: form.phone.trim() || null,
    email: form.email.trim(),
    website: form.website.trim() || null,
    instagram: form.instagram.trim() || null,
    tags,
    is_verified: false,
    is_featured: false,
    is_active: false,   // Pending admin approval
    price_from: null,
    price_unit: null,
  }).select('id, slug').single()

  if (error) return { error: error.message }
  return { slug: data.slug }
}
