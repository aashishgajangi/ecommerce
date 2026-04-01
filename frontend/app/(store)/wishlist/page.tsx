'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart, ShoppingBag, Trash2 } from 'lucide-react'
import { useAuthStore } from '../../../lib/stores/authStore'
import { wishlistApi } from '../../../lib/api/wishlist'
import { cartApi } from '../../../lib/api/cart'
import { useCartStore } from '../../../lib/stores/cartStore'
import type { Product } from '../../../lib/types'
import { useRouter } from 'next/navigation'

export default function WishlistPage() {
  const { isAuthenticated, user } = useAuthStore()
  const { setCart } = useCartStore()
  const router = useRouter()

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<number | null>(null)
  const [addingToCart, setAddingToCart] = useState<number | null>(null)

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/auth/login'); return }
    wishlistApi.list()
      .then((res) => {
        const d = res.data as unknown as { data: Product[] }
        setProducts(d.data ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function remove(productId: number) {
    setRemoving(productId)
    try {
      await wishlistApi.toggle(productId)
      setProducts((prev) => prev.filter((p) => p.id !== productId))
    } catch { /* silent */ }
    finally { setRemoving(null) }
  }

  async function addToCart(product: Product) {
    setAddingToCart(product.id)
    try {
      const res = await cartApi.addItem({ product_id: product.id, quantity: 1 })
      setCart(res.data)
    } catch { /* silent */ }
    finally { setAddingToCart(null) }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="h-8 bg-gray-200 rounded w-32 mb-6 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map((i) => (
            <div key={i} className="rounded-xl bg-gray-100 aspect-square animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <Heart className="mx-auto mb-4 text-gray-200" size={56} />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Your wishlist is empty</h2>
        <p className="text-gray-500 mb-6 text-sm">Save products you love and come back to them anytime.</p>
        <Link href="/products" className="bg-rose-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-rose-700 transition-colors text-sm">
          Browse Products
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Wishlist</h1>
        <span className="text-sm text-gray-400">{products.length} item{products.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((product) => {
          const image = product.primary_image ?? product.images?.[0]
          return (
            <div key={product.id} className="group relative bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-rose-200 hover:shadow-md transition-all">
              <Link href={`/products/${product.slug}`} className="block">
                <div className="relative aspect-square bg-gray-50">
                  {image?.url ? (
                    <Image src={image.url} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 640px) 50vw, 25vw" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No image</div>
                  )}
                </div>
                <div className="p-3">
                  {product.brand && <p className="text-xs text-gray-400 mb-0.5">{product.brand.name}</p>}
                  <p className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-rose-600 transition-colors">{product.name}</p>
                  <p className="mt-1 text-rose-600 font-bold text-sm">₹{product.base_price.toLocaleString('en-IN')}</p>
                </div>
              </Link>

              {/* Actions */}
              <div className="px-3 pb-3 flex gap-2">
                <button
                  onClick={() => addToCart(product)}
                  disabled={addingToCart === product.id}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-rose-600 text-white text-xs font-semibold py-2 rounded-full hover:bg-rose-700 disabled:opacity-60 transition-colors"
                >
                  <ShoppingBag size={13} />
                  {addingToCart === product.id ? 'Adding…' : 'Add to Cart'}
                </button>
                <button
                  onClick={() => remove(product.id)}
                  disabled={removing === product.id}
                  className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 disabled:opacity-60 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
