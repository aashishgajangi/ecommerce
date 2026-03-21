import { catalogApi } from '../../../../lib/api/catalog'
import Image from 'next/image'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const res = await catalogApi.getProduct(slug)
    const p = res.data.data
    return { title: p.meta_title ?? p.name, description: p.meta_description ?? p.short_description }
  } catch {
    return { title: 'Product Not Found' }
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params

  let product
  try {
    const res = await catalogApi.getProduct(slug)
    product = res.data.data
  } catch {
    notFound()
  }

  const images = product.images ?? []
  const primaryImage = product.primary_image ?? images[0]
  const variants = product.variants ?? []

  return (
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

          {/* Price */}
          <div className="mb-4">
            <span className="text-3xl font-extrabold text-rose-600">
              ₹{product.base_price.toLocaleString('en-IN')}
            </span>
            <span className="text-gray-400 text-sm ml-2">onwards · incl. GST</span>
          </div>

          {product.short_description && (
            <p className="text-gray-600 mb-6 leading-relaxed">{product.short_description}</p>
          )}

          {/* Variants */}
          {variants.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-2">Available Options</p>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => (
                  <div key={v.id} className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700">
                    <span className="font-medium text-gray-900">{v.sku.split('-').slice(-1)[0]}</span>
                    <span className="mx-2 text-gray-300">·</span>
                    <span className="text-rose-600 font-semibold">₹{v.price.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add to cart placeholder */}
          <button className="w-full bg-rose-600 text-white font-semibold py-4 rounded-full hover:bg-rose-700 transition-colors text-base shadow-lg">
            Add to Cart
          </button>

          {product.description && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <h2 className="text-base font-semibold text-gray-900 mb-3">Description</h2>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{product.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
