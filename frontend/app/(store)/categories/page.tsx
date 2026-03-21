import Link from 'next/link'
import { catalogApi } from '../../../lib/api/catalog'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Categories' }

export default async function CategoriesPage() {
  const res = await catalogApi.getCategories().catch(() => null)
  const all = res?.data?.data ?? []
  const roots = all.filter((c) => !c.parent_id)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Categories</h1>
      <div className="space-y-10">
        {roots.map((root) => {
          const children = all.filter((c) => c.parent_id === root.id)
          return (
            <div key={root.id}>
              <Link href={`/categories/${root.slug}`} className="group inline-flex items-center gap-2 mb-4">
                <h2 className="text-lg font-bold text-gray-900 group-hover:text-rose-600 transition-colors">{root.name}</h2>
                <span className="text-rose-600 text-sm opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </Link>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {children.map((child) => (
                  <Link
                    key={child.id}
                    href={`/categories/${child.slug}`}
                    className="border border-gray-100 rounded-xl p-4 text-center hover:border-rose-200 hover:bg-rose-50 transition-all group"
                  >
                    <p className="text-sm font-medium text-gray-700 group-hover:text-rose-600 transition-colors">{child.name}</p>
                  </Link>
                ))}
                {children.length === 0 && (
                  <Link
                    href={`/categories/${root.slug}`}
                    className="border border-gray-100 rounded-xl p-4 text-center hover:border-rose-200 hover:bg-rose-50 transition-all"
                  >
                    <p className="text-sm font-medium text-gray-700">{root.name}</p>
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
