'use server'

import { createServiceClient } from '@/lib/supabase/server'

export type VendorForm = {
  name: string
  category: string
  city: string
  tagline: string
  description: string
  priceFrom: string
  priceUnit: string
  phone: string
  email: string
  website: string
  instagram: string
  tags: string        // comma-separated
  isVerified: boolean
  isFeatured: boolean
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') +
    '-' + Math.random().toString(36).slice(2, 5)
}

export async function createMarketplaceVendor(form: VendorForm) {
  const sc = createServiceClient()
  const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
  const { data, error } = await sc.from('marketplace_vendors').insert({
    name: form.name.trim(),
    slug: toSlug(form.name),
    category: form.category,
    city: form.city.trim(),
    tagline: form.tagline.trim() || null,
    description: form.description.trim() || null,
    price_from: form.priceFrom ? parseInt(form.priceFrom) : null,
    price_unit: form.priceUnit || 'per event',
    phone: form.phone.trim() || null,
    email: form.email.trim() || null,
    website: form.website.trim() || null,
    instagram: form.instagram.trim() || null,
    tags,
    is_verified: form.isVerified,
    is_featured: form.isFeatured,
    is_active: true,
  }).select('id').single()

  return error ? { error: error.message } : { id: data.id }
}

export async function updateMarketplaceVendor(id: string, form: VendorForm) {
  const sc = createServiceClient()
  const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean)
  const { error } = await sc.from('marketplace_vendors').update({
    name: form.name.trim(),
    category: form.category,
    city: form.city.trim(),
    tagline: form.tagline.trim() || null,
    description: form.description.trim() || null,
    price_from: form.priceFrom ? parseInt(form.priceFrom) : null,
    price_unit: form.priceUnit || 'per event',
    phone: form.phone.trim() || null,
    email: form.email.trim() || null,
    website: form.website.trim() || null,
    instagram: form.instagram.trim() || null,
    tags,
    is_verified: form.isVerified,
    is_featured: form.isFeatured,
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  return error ? { error: error.message } : { ok: true }
}

export async function toggleVendorActive(id: string, isActive: boolean) {
  const sc = createServiceClient()
  const { error } = await sc.from('marketplace_vendors').update({ is_active: isActive }).eq('id', id)
  return error ? { error: error.message } : { ok: true }
}

export async function deleteMarketplaceVendor(id: string) {
  const sc = createServiceClient()
  const { error } = await sc.from('marketplace_vendors').delete().eq('id', id)
  return error ? { error: error.message } : { ok: true }
}
