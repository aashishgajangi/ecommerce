'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react'
import { cartApi } from '../../../lib/api/cart'
import { useCartStore } from '../../../lib/stores/cartStore'
import { useAuthStore } from '../../../lib/stores/authStore'
import type { Cart } from '../../../lib/types'

export default function CartPage() {
  const { isAuthenticated } = useAuthStore()
  const { setCart } = useCartStore()
  const [cart, setLocalCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [coupon, setCoupon] = useState('')
  const [couponError, setCouponError] = useState('')

  async function fetchCart() {
    if (!isAuthenticated()) { setLoading(false); return }
    try {
      const res = await cartApi.get()
      setLocalCart(res.data.data)
      setCart(res.data.data)
    } catch {
      setLocalCart(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCart() }, [])

  async function updateQty(itemId: number, qty: number) {
    if (qty < 1) return removeItem(itemId)
    const res = await cartApi.updateItem(itemId, qty)
    setLocalCart(res.data.data); setCart(res.data.data)
  }

  async function removeItem(itemId: number) {
    const res = await cartApi.removeItem(itemId)
    setLocalCart(res.data.data); setCart(res.data.data)
  }

  async function applyCoupon() {
    setCouponError('')
    try {
      const res = await cartApi.applyCoupon(coupon)
      setLocalCart(res.data.data); setCart(res.data.data); setCoupon('')
    } catch (err: unknown) {
      setCouponError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Invalid coupon')
    }
  }

  async function removeCoupon() {
    const res = await cartApi.removeCoupon()
    setLocalCart(res.data.data); setCart(res.data.data)
  }

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-400">Loading cart...</div>
  )

  if (!isAuthenticated()) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <ShoppingBag className="mx-auto mb-4 text-gray-300" size={48} />
      <p className="text-gray-600 mb-4">Please sign in to view your cart.</p>
      <Link href="/auth/login" className="bg-rose-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-rose-700 transition-colors">Sign In</Link>
    </div>
  )

  if (!cart || cart.items.length === 0) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <ShoppingBag className="mx-auto mb-4 text-gray-300" size={48} />
      <p className="text-gray-600 mb-4">Your cart is empty.</p>
      <Link href="/products" className="bg-rose-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-rose-700 transition-colors">Continue Shopping</Link>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Your Cart</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item) => {
            const img = item.product.primary_image ?? item.product.images?.[0]
            return (
              <div key={item.id} className="flex gap-4 bg-white border border-gray-100 rounded-xl p-4">
                <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0">
                  {img?.url ? (
                    <Image src={img.url} alt={item.product.name} fill className="object-cover" sizes="80px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No img</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm line-clamp-1">{item.product.name}</p>
                  {item.variant && <p className="text-xs text-gray-400 mt-0.5">{item.variant.sku}</p>}
                  <p className="text-rose-600 font-bold mt-1">₹{item.unit_price.toLocaleString('en-IN')}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button onClick={() => updateQty(item.id, item.quantity - 1)} className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 transition-colors">
                      <Minus size={12} />
                    </button>
                    <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateQty(item.id, item.quantity + 1)} className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 transition-colors">
                      <Plus size={12} />
                    </button>
                    <button onClick={() => removeItem(item.id)} className="ml-2 text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">₹{item.subtotal.toLocaleString('en-IN')}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Summary */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Order Summary</h2>

            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between"><span>Subtotal</span><span>₹{cart.subtotal.toLocaleString('en-IN')}</span></div>
              {cart.discount_amount > 0 && (
                <div className="flex justify-between text-green-600"><span>Discount</span><span>−₹{cart.discount_amount.toLocaleString('en-IN')}</span></div>
              )}
              <div className="flex justify-between"><span>Tax</span><span>₹{cart.tax_amount.toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-100 pt-2 mt-2">
                <span>Total</span><span>₹{cart.total.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="mt-4 w-full block text-center bg-rose-600 text-white font-semibold py-3 rounded-full hover:bg-rose-700 transition-colors"
            >
              Proceed to Checkout
            </Link>
          </div>

          {/* Coupon */}
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Coupon Code</h3>
            {cart.coupon_code ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm">
                <span className="text-green-700 font-medium">{cart.coupon_code} applied</span>
                <button onClick={removeCoupon} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <input
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                    placeholder="Enter code"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <button onClick={applyCoupon} className="bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors">Apply</button>
                </div>
                {couponError && <p className="text-red-500 text-xs mt-1">{couponError}</p>}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
