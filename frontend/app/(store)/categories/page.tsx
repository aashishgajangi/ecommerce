import Link from 'next/link'
import { Cake, CakeSlice, Croissant, Dessert, Gift, ShoppingBag } from 'lucide-react'
import { catalogApi } from '../../../lib/api/catalog'
import type { Metadata } from 'next'
import type { Category } from '../../../lib/types'
import type { LucideIcon } from 'lucide-react'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://order.hangoutcakes.com'

export const metadata: Metadata = {
  title: 'Categories',
  description: 'Explore all cake and dessert categories at Hangout Cakes — from custom cakes and cupcakes to brownies, pastries and more.',
  alternates: { canonical: `${SITE_URL}/categories` },
  openGraph: {
    title: 'Categories — Hangout Cakes',
    description: 'Explore all cake and dessert categories at Hangout Cakes.',
    url: `${SITE_URL}/categories`,
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
}
export const revalidate = 120

const CATEGORY_STYLE: Record<string, { icon: LucideIcon; bg: string; border: string; iconColor: string; badge: string }> = {
  'Cakes':    { icon: Cake,      bg: 'bg-rose-50',   border: 'border-rose-100',  iconColor: 'text-rose-500',   badge: 'bg-rose-100 text-rose-700' },
  'Cupcakes': { icon: CakeSlice, bg: 'bg-pink-50',   border: 'border-pink-100',  iconColor: 'text-pink-500',   badge: 'bg-pink-100 text-pink-700' },
  'Pastries': { icon: Croissant, bg: 'bg-orange-50', border: 'border-orange-100',iconColor: 'text-orange-500', badge: 'bg-orange-100 text-orange-700' },
  'Desserts': { icon: Dessert,   bg: 'bg-violet-50', border: 'border-violet-100',iconColor: 'text-violet-500', badge: 'bg-violet-100 text-violet-700' },
  'Gifting':  { icon: Gift,      bg: 'bg-amber-50',  border: 'border-amber-100', iconColor: 'text-amber-500',  badge: 'bg-amber-100 text-amber-700' },
}
const DEFAULT_STYLE = { icon: ShoppingBag, bg: 'bg-gray-50', border: 'border-gray-100', iconColor: 'text-gray-500', badge: 'bg-gray-100 text-gray-700' }

export default async function CategoriesPage() {
  const res = await catalogApi.getCategories().catch(() => null)
  const all = (res?.data ?? []) as Category[]
  const roots = all.filter((c) => !c.parent_id)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">Shop by Category</h1>
        <p className="mt-1 text-gray-500 text-sm">Fresh bakes for every craving — find what you love</p>
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {roots.map((cat) => {
          const style = CATEGORY_STYLE[cat.name] ?? DEFAULT_STYLE
          const Icon = style.icon
          const subs = (cat.children ?? all.filter((c) => c.parent_id === cat.id))

          return (
            <Link
              key={cat.id}
              href={`/categories/${cat.slug}`}
              className={`group relative flex flex-col rounded-2xl border ${style.border} ${style.bg} p-6 hover:shadow-md transition-all hover:-translate-y-0.5`}
            >
              {/* Icon */}
              <div className={`w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon size={28} className={style.iconColor} />
              </div>

              {/* Name + description */}
              <h2 className="text-lg font-bold text-gray-900 group-hover:text-rose-600 transition-colors">
                {cat.name}
              </h2>
              {cat.description && (
                <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{cat.description}</p>
              )}

              {/* Subcategory chips */}
              {subs.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {subs.slice(0, 4).map((sub) => (
                    <span key={sub.id} className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.badge}`}>
                      {sub.name}
                    </span>
                  ))}
                  {subs.length > 4 && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.badge} opacity-60`}>
                      +{subs.length - 4} more
                    </span>
                  )}
                </div>
              )}

              {/* CTA */}
              <div className="mt-4 flex items-center text-sm font-semibold text-gray-600 group-hover:text-rose-600 transition-colors">
                Browse {cat.name}
                <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
