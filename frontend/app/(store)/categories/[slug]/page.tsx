import Link from 'next/link'
import { catalogApi } from '../../../../lib/api/catalog'
import ProductCard from '../../../../components/product/ProductCard'
import SortSelect from '../../../../components/category/SortSelect'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { Category } from '../../../../lib/types'
import { ChevronRight } from 'lucide-react'

export const revalidate = 120

export async function generateStaticParams() {
  try {
    const res = await catalogApi.getCategories()
    return (res.data ?? []).map((c: { slug: string }) => ({ slug: c.slug }))
  } catch {
    return []
  }
}

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string; sort?: string }>
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://order.hangoutcakes.com'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const res = await catalogApi.getCategory(slug)
    const cat = res.data
    const title = `${cat.name} — Hangout Cakes`
    const description = cat.description ?? `Shop ${cat.name} — handcrafted cakes and desserts from Hangout Cakes, delivered fresh to your door.`
    const canonical = `${SITE_URL}/categories/${slug}`
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: { title, description, url: canonical, type: 'website' },
      twitter: { card: 'summary_large_image', title, description },
    }
  } catch { return {} }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { page: pageParam, sort = 'newest' } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)

  let category: Category
  let products: unknown[] = []
  let meta = { total: 0, last_page: 1, current_page: 1 }

  try {
    const [catRes, prodRes] = await Promise.all([
      catalogApi.getCategory(slug),
      catalogApi.getProducts({ category: slug, per_page: 12, page, sort }),
    ])
    category = catRes.data as Category
    products = prodRes.data.data ?? []
    meta = prodRes.data.meta
  } catch {
    notFound()
  }

  const subs = (category!.children ?? []) as Category[]
  const isSubcategory = !!category!.parent_id
  const canonical = `${SITE_URL}/categories/${slug}`

  const breadcrumbItems = [
    { '@type': 'ListItem', position: 1, name: 'Home',       item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Categories', item: `${SITE_URL}/categories` },
    { '@type': 'ListItem', position: 3, name: category!.name, item: canonical },
  ]
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems,
  }

  function buildHref(p: number, s?: string) {
    const params = new URLSearchParams()
    if (p > 1) params.set('page', String(p))
    if (s && s !== 'newest') params.set('sort', s)
    else if (!s && sort !== 'newest') params.set('sort', sort)
    const q = params.toString()
    return `/categories/${slug}${q ? '?' + q : ''}`
  }

  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-gray-400 mb-6">
        <Link href="/" className="hover:text-rose-600 transition-colors">Home</Link>
        <ChevronRight size={14} />
        <Link href="/categories" className="hover:text-rose-600 transition-colors">Categories</Link>
        {isSubcategory && (
          <>
            <ChevronRight size={14} />
            <span className="text-gray-700 font-medium">{category!.name}</span>
          </>
        )}
        {!isSubcategory && (
          <>
            <ChevronRight size={14} />
            <span className="text-gray-700 font-medium">{category!.name}</span>
          </>
        )}
      </nav>

      {/* Category header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">{category!.name}</h1>
        {category!.description && (
          <p className="mt-1 text-gray-500 text-sm">{category!.description}</p>
        )}
      </div>

      {/* Subcategory filter chips */}
      {subs.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <Link
            href={`/categories/${slug}`}
            className="px-4 py-1.5 rounded-full text-sm font-medium border border-rose-500 bg-rose-500 text-white transition-colors"
          >
            All
          </Link>
          {subs.map((sub) => (
            <Link
              key={sub.id}
              href={`/categories/${sub.slug}`}
              className="px-4 py-1.5 rounded-full text-sm font-medium border border-gray-200 text-gray-600 hover:border-rose-400 hover:text-rose-600 transition-colors bg-white"
            >
              {sub.name}
            </Link>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-gray-500">
          {meta.total > 0
            ? `Showing ${(page - 1) * 12 + 1}–${Math.min(page * 12, meta.total)} of ${meta.total} products`
            : 'No products found'}
        </p>
        <SortSelect current={sort} />
      </div>

      {/* Products */}
      {products.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium mb-1">No products here yet</p>
          <p className="text-sm">Check back soon or browse other categories.</p>
          <Link href="/categories" className="mt-4 inline-block text-sm text-rose-600 hover:underline">
            ← Back to Categories
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {(products as Parameters<typeof ProductCard>[0]['product'][]).map((p) => (
            <ProductCard key={(p as { id: number }).id} product={p as Parameters<typeof ProductCard>[0]['product']} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta.last_page > 1 && (
        <div className="mt-10 flex items-center justify-center gap-1.5">
          {page > 1 && (
            <Link
              href={buildHref(page - 1)}
              className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:border-rose-400 hover:text-rose-600 transition-colors"
            >
              ← Prev
            </Link>
          )}

          {Array.from({ length: meta.last_page }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === meta.last_page || Math.abs(p - page) <= 1)
            .reduce<(number | '...')[]>((acc, p, i, arr) => {
              if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...')
              acc.push(p)
              return acc
            }, [])
            .map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="px-3 py-2 text-sm text-gray-400">…</span>
              ) : (
                <Link
                  key={p}
                  href={buildHref(p as number)}
                  className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-colors ${
                    p === page
                      ? 'bg-rose-600 text-white border border-rose-600'
                      : 'border border-gray-200 hover:border-rose-400 hover:text-rose-600'
                  }`}
                >
                  {p}
                </Link>
              )
            )}

          {page < meta.last_page && (
            <Link
              href={buildHref(page + 1)}
              className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg hover:border-rose-400 hover:text-rose-600 transition-colors"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
    </>
  )
}
