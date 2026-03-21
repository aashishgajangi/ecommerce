import { catalogApi } from '../../../../lib/api/catalog'
import ProductCard from '../../../../components/product/ProductCard'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const res = await catalogApi.getCategory(slug)
    return { title: res.data.data.name }
  } catch { return {} }
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params
  let category; let products = []

  try {
    const [catRes, prodRes] = await Promise.all([
      catalogApi.getCategory(slug),
      catalogApi.getProducts({ category: slug, per_page: 12 }),
    ])
    category = catRes.data.data
    products = prodRes.data.data ?? []
  } catch {
    notFound()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{category.name}</h1>
      {category.description && <p className="text-gray-500 text-sm mb-6">{category.description}</p>}

      {products.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No products in this category yet.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  )
}
