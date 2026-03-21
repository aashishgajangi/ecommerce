import Link from 'next/link'
import { catalogApi } from '../../lib/api/catalog'
import ProductCard from '../../components/product/ProductCard'
import type { Product, Category } from '../../lib/types'

async function getHomeData() {
  try {
    const [productsRes, categoriesRes] = await Promise.all([
      catalogApi.getProducts({ featured: true, per_page: 8 }),
      catalogApi.getCategories(),
    ])
    return {
      featured: productsRes.data.data ?? [],
      categories: categoriesRes.data.data ?? [],
    }
  } catch {
    return { featured: [], categories: [] }
  }
}

export default async function HomePage() {
  const { featured, categories } = await getHomeData()
  const rootCategories = (categories as Category[]).filter((c) => !c.parent_id).slice(0, 6)

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-rose-50 to-pink-100 py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
            Cakes crafted with <span className="text-rose-600">love</span>
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Custom cakes, cupcakes & desserts — freshly baked and delivered to your door.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/products"
              className="inline-block bg-rose-600 text-white font-semibold px-8 py-3 rounded-full hover:bg-rose-700 transition-colors shadow-lg"
            >
              Shop Now
            </Link>
            <Link
              href="/categories"
              className="inline-block border-2 border-rose-600 text-rose-600 font-semibold px-8 py-3 rounded-full hover:bg-rose-50 transition-colors"
            >
              Browse Categories
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      {rootCategories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Shop by Category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {rootCategories.map((cat) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="flex flex-col items-center p-4 rounded-xl border border-gray-100 hover:border-rose-200 hover:bg-rose-50 transition-all text-center group"
              >
                <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-2 group-hover:bg-rose-200 transition-colors">
                  <span className="text-rose-600 text-lg">🎂</span>
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-rose-600 transition-colors">{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      {(featured as Product[]).length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Featured</h2>
            <Link href="/products?featured=true" className="text-sm text-rose-600 hover:underline font-medium">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {(featured as Product[]).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </>
  )
}
