import Link from 'next/link'
import { MapPin, Phone, Clock } from 'lucide-react'
import { branchApi } from '../../../lib/api/branches'
import type { Metadata } from 'next'
import type { Branch } from '../../../lib/types'

export const revalidate = 300

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://order.hangoutcakes.com'

export const metadata: Metadata = {
  title: 'Our Stores — Hangout Cakes',
  description: 'Find a Hangout Cakes store near you. We deliver fresh cakes and desserts from multiple locations across the city.',
  alternates: { canonical: `${SITE_URL}/stores` },
  openGraph: {
    title: 'Our Stores — Hangout Cakes',
    description: 'Find a Hangout Cakes store near you.',
    url: `${SITE_URL}/stores`,
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
}

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

export default async function StoresPage() {
  const res = await branchApi.list().catch(() => null)
  const branches = (res?.data ?? []) as Branch[]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Our Stores</h1>
        <p className="mt-1 text-gray-500 text-sm">Find us near you — we deliver fresh to your door</p>
      </div>

      {branches.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <p className="text-lg">No store locations found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {branches.map((b) => (
            <Link
              key={b.id}
              href={`/stores/${b.slug}`}
              className="group flex flex-col rounded-2xl border border-gray-200 bg-white p-6 hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
                  <MapPin size={20} className="text-rose-500" />
                </div>
              </div>

              <h2 className="text-lg font-bold text-gray-900 group-hover:text-rose-600 transition-colors">
                {b.name}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">{b.city}, {b.state} — {b.pincode}</p>

              <div className="mt-3 space-y-1.5 text-xs text-gray-500">
                {b.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone size={12} />
                    <span>{b.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Clock size={12} />
                  <span>{formatTime(b.opening_time)} – {formatTime(b.closing_time)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin size={12} />
                  <span>Delivery within {b.service_radius_km} km</span>
                </div>
              </div>

              <div className="mt-4 text-sm font-semibold text-gray-600 group-hover:text-rose-600 transition-colors flex items-center gap-1">
                View Store
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
