'use client'

import { useState } from 'react'
import { ShoppingCart, Plus, Minus, Check } from 'lucide-react'
import { cartApi } from '../../lib/api/cart'
import { useCartStore } from '../../lib/stores/cartStore'
import { useAuthStore } from '../../lib/stores/authStore'
import type { ProductVariant } from '../../lib/types'

interface Props {
  productId: number
  productName: string
  productSlug: string
  productImage: { url: string; alt_text?: string | null } | null
  basePrice: number
  variants: ProductVariant[]
}

export default function ProductActions({ productId, productName, productSlug, productImage, basePrice, variants }: Props) {
  const { isAuthenticated } = useAuthStore()
  const { setCart, addGuestItem } = useCartStore()

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    variants.length === 1 ? variants[0] : null
  )
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading]   = useState(false)
  const [added, setAdded]       = useState(false)
  const [cartError, setCartError] = useState('')

  const displayPrice = selectedVariant?.price ?? basePrice

  async function addToCart() {
    if (variants.length > 0 && !selectedVariant) return

    if (!isAuthenticated()) {
      addGuestItem({
        product_id: productId,
        variant_id: selectedVariant?.id ?? null,
        quantity,
        unit_price: displayPrice,
        product: { id: productId, name: productName, slug: productSlug, primary_image: productImage },
        variant: selectedVariant ? { id: selectedVariant.id, sku: selectedVariant.sku } : null,
      })
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
      return
    }

    setLoading(true)
    try {
      const res = await cartApi.addItem({
        product_id: productId,
        variant_id: selectedVariant?.id,
        quantity,
      })
      setCart(res.data)
      setAdded(true)
      setTimeout(() => setAdded(false), 2000)
    } catch {
      setCartError('Failed to add to cart. Please try again.')
      setTimeout(() => setCartError(''), 4000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <span className="text-3xl font-extrabold text-rose-600">
          ₹{displayPrice.toLocaleString('en-IN')}
        </span>
        <span className="text-gray-400 text-sm ml-2">incl. GST</span>
      </div>

      {variants.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">
            Choose an option
            {!selectedVariant && <span className="text-rose-500 font-normal ml-1">*</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedVariant(v)}
                className={`border rounded-lg px-3 py-2 text-sm transition-all ${
                  selectedVariant?.id === v.id
                    ? 'border-rose-500 bg-rose-50 text-rose-700 font-semibold shadow-sm'
                    : 'border-gray-200 text-gray-700 hover:border-rose-300'
                }`}
              >
                <span className="font-medium">{v.sku.split('-').slice(-1)[0]}</span>
                <span className="mx-1.5 text-gray-300">·</span>
                <span>₹{v.price.toLocaleString('en-IN')}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {cartError && (
        <p className="text-sm text-red-500">{cartError}</p>
      )}

      <div className="flex items-center gap-3">
        <div className="flex items-center border border-gray-200 rounded-full overflow-hidden">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Minus size={14} />
          </button>
          <span className="w-10 text-center font-semibold text-gray-900 text-sm">{quantity}</span>
          <button
            onClick={() => setQuantity((q) => Math.min(20, q + 1))}
            className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>

        <button
          onClick={addToCart}
          disabled={loading || (variants.length > 0 && !selectedVariant)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-full font-semibold text-base shadow-lg transition-all ${
            added
              ? 'bg-green-500 text-white'
              : loading
              ? 'bg-rose-400 text-white cursor-wait'
              : variants.length > 0 && !selectedVariant
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-dashed border-gray-300'
              : 'bg-rose-600 text-white hover:bg-rose-700'
          }`}
        >
          {added ? <><Check size={18} /> Added!</> : loading ? 'Adding…' : <><ShoppingCart size={18} /> Add to Cart</>}
        </button>
      </div>
    </div>
  )
}
