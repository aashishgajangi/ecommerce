import { catalogApi } from '../../../../lib/api/catalog'
import Image from 'next/image'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ProductActions from '../../../../components/product/ProductActions'
import ProductReviews from '../../../../components/product/ProductReviews'

// Pre-build every active product page at deploy time; re-generate in background every 5 min
export const revalidate = 300

export async function generateStaticParams() {
  try {
    const res = await catalogApi.getProducts({ per_page: 200 })
    return (res.data.data ?? []).map((p: { slug: string }) => ({ slug: p.slug }))
  } catch {
    return []
  }
}

interface Props { params: Promise<{ slug: string }> }

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://order.hangoutcakes.com'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const res = await catalogApi.getProduct(slug)
    const p = res.data
    const title = p.meta_title ?? p.name
    const description = p.meta_description ?? p.short_description ?? `Buy ${p.name} online from Hangout Cakes. Fresh, handcrafted and delivered to your door.`
    const imageUrl = p.primary_image?.url ?? p.images?.[0]?.url
    const canonical = `${SITE_URL}/products/${slug}`

    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title,
        description,
        url: canonical,
        type: 'website',
        ...(imageUrl ? { images: [{ url: imageUrl, width: 1200, height: 630, alt: p.name }] } : {}),
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        ...(imageUrl ? { images: [imageUrl] } : {}),
      },
    }
  } catch {
    return { title: 'Product Not Found' }
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params

  let product
  try {
    const res = await catalogApi.getProduct(slug)
    product = res.data
  } catch {
    notFound()
  }

  const images = product.images ?? []
  const primaryImage = product.primary_image ?? images[0]
  const variants = product.variants ?? []
  const canonical = `${SITE_URL}/products/${slug}`

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',     item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Products', item: `${SITE_URL}/products` },
      { '@type': 'ListItem', position: 3, name: product.name, item: canonical },
    ],
  }

  const productSchema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.meta_description ?? product.short_description ?? product.name,
    url: canonical,
    ...(images.length > 0 ? { image: images.map((i) => i.url) } : {}),
    ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand.name } } : {}),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: product.base_price.toFixed(2),
      availability: 'https://schema.org/InStock',
      url: canonical,
      seller: { '@type': 'Organization', name: 'Hangout Cakes' },
    },
  }

  if (product.reviews_count && product.reviews_count > 0 && product.average_rating) {
    productSchema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.average_rating,
      reviewCount: product.reviews_count,
      bestRating: 5,
      worstRating: 1,
    }
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }} />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Images */}
        <div className="space-y-3">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100">
            {primaryImage?.url ? (
              <Image
                src={primaryImage.url}
                alt={primaryImage.alt_text ?? product.name}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">No image</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img) => (
                <div key={img.id} className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border border-gray-100">
                  <Image src={img.url} alt={img.alt_text ?? ''} fill className="object-cover" sizes="80px" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          {product.brand && (
            <p className="text-sm text-gray-400 mb-1">{product.brand.name}</p>
          )}
          <h1 className="text-3xl font-bold text-gray-900 mb-3">{product.name}</h1>

          {product.short_description && (
            <p className="text-gray-600 mb-6 leading-relaxed">{product.short_description}</p>
          )}

          <ProductActions
            productId={product.id}
            productName={product.name}
            productSlug={product.slug}
            productImage={product.images?.[0] ?? null}
            basePrice={product.base_price}
            variants={variants}
          />

          {product.description && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <h2 className="text-base font-semibold text-gray-900 mb-3">Description</h2>
              <div className="text-gray-600 text-sm leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: product.description }} />
            </div>
          )}
        </div>
      </div>

      <ProductReviews
        productId={product.id}
        averageRating={product.average_rating}
        reviewsCount={product.reviews_count}
      />
    </div>
    </>
  )
}
