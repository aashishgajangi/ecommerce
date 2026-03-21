import { catalogApi } from '../../../lib/api/catalog'
import ProductCard from '../../../components/product/ProductCard'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Shop All Products' }

interface Props {
  searchParams: Promise<{ category?: string; brand?: string; search?: string; sort?: string; page?: string; featured?: string }>
}

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams
  const res = await catalogApi.getProducts({
    category: params.category,
    brand: params.brand,
    search: params.search,
    sort: params.sort,
    page: params.page ? Number(params.page) : 1,
    featured: params.featured === 'true' ? true : undefined,
    per_page: 12,
  }).catch(() => null)

  const products = res?.data?.data ?? []
  const meta = res?.data?.meta

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {params.featured === 'true' ? 'Featured Products' : params.search ? `Results for "${params.search}"` : 'All Products'}
        </h1>
        {meta && <p className="text-sm text-gray-500">{meta.total} products</p>}
      </div>

      {products.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <p className="text-lg">No products found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.last_page > 1 && (
        <div className="mt-10 flex justify-center gap-2">
          {Array.from({ length: meta.last_page }, (_, i) => i + 1).map((page) => (
            <a
              key={page}
              href={`?page=${page}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                page === meta.current_page
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'border-gray-200 text-gray-700 hover:border-rose-400'
              }`}
            >
              {page}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
