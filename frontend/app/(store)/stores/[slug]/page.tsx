import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MapPin, Phone, Mail, Clock, ExternalLink } from 'lucide-react'
import { branchApi } from '../../../../lib/api/branches'
import type { Metadata } from 'next'
import type { Branch } from '../../../../lib/types'

export const revalidate = 300

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://order.hangoutcakes.com'

const DAY_LABELS: Record<string, string> = {
  Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday',
  Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
}

export async function generateStaticParams() {
  try {
    const res = await branchApi.list()
    return (res.data ?? []).map((b: Branch) => ({ slug: b.slug }))
  } catch {
    return []
  }
}

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const res = await branchApi.get(slug)
    const b = res.data
    const title = `${b.name} — Hangout Cakes`
    const description = `Order fresh cakes and desserts from Hangout Cakes ${b.name} in ${b.city}. Online ordering with home delivery.`
    const canonical = `${SITE_URL}/stores/${slug}`
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: { title, description, url: canonical, type: 'website' },
      twitter: { card: 'summary_large_image', title, description },
    }
  } catch {
    return {}
  }
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

export default async function StorePage({ params }: Props) {
  const { slug } = await params

  let branch: Branch
  try {
    const res = await branchApi.get(slug)
    branch = res.data as Branch & { address_line1?: string; address_line2?: string; email?: string }
  } catch {
    notFound()
  }

  const b = branch as Branch & { address_line1?: string; address_line2?: string; email?: string }
  const canonical = `${SITE_URL}/stores/${slug}`
  const addressStr = [b.address_line1, b.address_line2, b.city, b.state, b.pincode].filter(Boolean).join(', ')

  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'Bakery',
    name: `Hangout Cakes — ${b.name}`,
    url: canonical,
    ...(b.phone ? { telephone: b.phone } : {}),
    ...(b.email ? { email: b.email } : {}),
    address: {
      '@type': 'PostalAddress',
      streetAddress: b.address_line1 ?? '',
      addressLocality: b.city,
      addressRegion: b.state,
      postalCode: b.pincode,
      addressCountry: 'IN',
    },
    ...(b.lat && b.lng ? {
      geo: { '@type': 'GeoCoordinates', latitude: b.lat, longitude: b.lng },
    } : {}),
    openingHoursSpecification: (b.days_open ?? []).map((day) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: `https://schema.org/${DAY_LABELS[day] ?? day}`,
      opens: b.opening_time,
      closes: b.closing_time,
    })),
    hasMap: b.google_maps_url ?? undefined,
    servesCuisine: ['Cakes', 'Cupcakes', 'Desserts', 'Bakery'],
    priceRange: '₹₹',
    parentOrganization: { '@type': 'Organization', name: 'Hangout Cakes', url: SITE_URL },
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-6">
          <Link href="/" className="hover:text-rose-600 transition-colors">Home</Link>
          <span>›</span>
          <Link href="/stores" className="hover:text-rose-600 transition-colors">Our Stores</Link>
          <span>›</span>
          <span className="text-gray-700 font-medium">{b.name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Info card */}
          <div className="md:col-span-3 space-y-6">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">Hangout Cakes — {b.name}</h1>
              <p className="mt-1 text-gray-500 text-sm">{b.city}, {b.state}</p>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl divide-y divide-gray-100">
              {/* Address */}
              <div className="flex items-start gap-3 p-4">
                <MapPin size={18} className="text-rose-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Address</p>
                  <p className="text-sm text-gray-500 mt-0.5">{addressStr}</p>
                  {b.google_maps_url && (
                    <a
                      href={b.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-flex items-center gap-1 text-xs text-rose-600 hover:underline"
                    >
                      Open in Google Maps <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>

              {/* Phone */}
              {b.phone && (
                <div className="flex items-center gap-3 p-4">
                  <Phone size={18} className="text-rose-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Phone</p>
                    <a href={`tel:${b.phone}`} className="text-sm text-gray-500 hover:text-rose-600">{b.phone}</a>
                  </div>
                </div>
              )}

              {/* Email */}
              {b.email && (
                <div className="flex items-center gap-3 p-4">
                  <Mail size={18} className="text-rose-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email</p>
                    <a href={`mailto:${b.email}`} className="text-sm text-gray-500 hover:text-rose-600">{b.email}</a>
                  </div>
                </div>
              )}

              {/* Hours */}
              <div className="flex items-start gap-3 p-4">
                <Clock size={18} className="text-rose-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Opening Hours</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {formatTime(b.opening_time)} — {formatTime(b.closing_time)}
                  </p>
                  {b.days_open && b.days_open.length < 7 && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {b.days_open.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Delivery info */}
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
              <p className="text-sm font-semibold text-rose-800 mb-1">Delivery from this store</p>
              <p className="text-sm text-rose-700">
                We deliver within <strong>{b.service_radius_km} km</strong>.
                Base fee ₹{b.delivery_base_fee}
                {Number(b.delivery_per_km_fee) > 0 && ` + ₹${b.delivery_per_km_fee}/km`}.
                {b.free_delivery_above && ` Free delivery on orders above ₹${b.free_delivery_above}.`}
              </p>
            </div>

            {/* CTA */}
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-6 py-3 text-sm font-semibold text-white hover:bg-rose-700 transition-colors"
            >
              Order Now →
            </Link>
          </div>

          {/* Map embed */}
          {b.lat && b.lng && (
            <div className="md:col-span-2">
              <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm aspect-square">
                <iframe
                  title={`Map of Hangout Cakes ${b.name}`}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps?q=${b.lat},${b.lng}&z=15&output=embed`}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
