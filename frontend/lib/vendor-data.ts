'use client'

import { fetchAPI } from '@/lib/api'

export type VendorContact = {
  id?: number
  name: string
  mobile_number: string
  email: string
}

export type VendorData = {
  id: number
  supplier_name: string
  vendor_id: string
  trn_no: string
  po_box: string
  country: string
  city: string
  contact_person_name: string
  mobile_number: string
  email: string
  company_telephone: string
  product_details: string
  review: string
  contacts: VendorContact[]
}

function normalizeVendorContact(contact: unknown): VendorContact {
  const item = typeof contact === 'object' && contact ? (contact as Record<string, unknown>) : {}

  return {
    id: typeof item.id === 'number' ? item.id : undefined,
    name: String(item.name || ''),
    mobile_number: String(item.mobile_number || ''),
    email: String(item.email || ''),
  }
}

export function normalizeVendorData(vendor: unknown): VendorData {
  const item = typeof vendor === 'object' && vendor ? (vendor as Record<string, unknown>) : {}
  const contacts = Array.isArray(item.contacts)
    ? item.contacts.map(normalizeVendorContact)
    : []

  return {
    id: Number(item.id || 0),
    supplier_name: String(item.supplier_name || ''),
    vendor_id: String(item.vendor_id || ''),
    trn_no: String(item.trn_no || ''),
    po_box: String(item.po_box || ''),
    country: String(item.country || ''),
    city: String(item.city || ''),
    contact_person_name: String(item.contact_person_name || ''),
    mobile_number: String(item.mobile_number || ''),
    email: String(item.email || ''),
    company_telephone: String(item.company_telephone || ''),
    product_details: String(item.product_details || ''),
    review: String(item.review || ''),
    contacts,
  }
}

export async function getVendorData(): Promise<VendorData[]> {
  const response = await fetchAPI('/procurement/vendor-data/')
  return Array.isArray(response) ? response.map(normalizeVendorData) : []
}

export async function createVendorData(payload: {
  supplier_name: string
  vendor_id?: string
  trn_no?: string
  po_box?: string
  country: string
  city: string
  contact_person_name?: string
  mobile_number?: string
  email?: string
  company_telephone?: string
  product_details?: string
  review?: string
  contacts?: VendorContact[]
}): Promise<VendorData> {
  const response = await fetchAPI('/procurement/vendor-data/entry/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return normalizeVendorData(response)
}

export async function updateVendorData(
  id: number,
  payload: {
    vendor_id?: string
    trn_no?: string
    po_box?: string
    contact_person_name?: string
    mobile_number?: string
    email?: string
    product_details?: string
    contacts?: VendorContact[]
  }
): Promise<VendorData> {
  const response = await fetchAPI(`/procurement/vendor-data/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return normalizeVendorData(response)
}
