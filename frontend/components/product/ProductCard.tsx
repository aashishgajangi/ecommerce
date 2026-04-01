import Link from 'next/link'
import Image from 'next/image'
import type { Product } from '../../lib/types'
import WishlistButton from './WishlistButton'

interface Props {
  product: Product
}

export default function ProductCard({ product }: Props) {
  const image = product.primary_image ?? product.images?.[0]
  const price = product.base_price

  return (
    <div className="group relative rounded-xl overflow-hidden border border-gray-100 hover:border-rose-200 hover:shadow-md transition-all bg-white">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-square bg-gray-50">
          {image?.url ? (
            <Image
              src={image.url}
              alt={image.alt_text ?? product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">No image</div>
          )}
          {product.is_featured && (
            <span className="absolute top-2 left-2 bg-rose-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">Featured</span>
          )}
        </div>
        <div className="p-3">
          {product.brand && (
            <p className="text-xs text-gray-400 mb-0.5">{product.brand.name}</p>
          )}
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-rose-600 transition-colors">
            {product.name}
          </h3>
          <p className="mt-1.5 text-rose-600 font-bold text-sm">
            ₹{(price ?? 0).toLocaleString('en-IN')}
            <span className="text-gray-400 font-normal text-xs ml-1">onwards</span>
          </p>
        </div>
      </Link>
      <WishlistButton productId={product.id} />
    </div>
  )
}
