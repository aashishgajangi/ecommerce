'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Trash2, Plus, Minus, ShoppingBag, LogIn } from 'lucide-react'
import { cartApi } from '../../../lib/api/cart'
import { useCartStore, type GuestCartItem } from '../../../lib/stores/cartStore'
import { useAuthStore } from '../../../lib/stores/authStore'
import type { Cart } from '../../../lib/types'

// ── Guest cart view ──────────────────────────────────────────────────────────

function GuestCart() {
  const { guestItems, updateGuestItem, removeGuestItem } = useCartStore()

  if (guestItems.length === 0) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <ShoppingBag className="mx-auto mb-4 text-gray-300" size={48} />
      <p className="text-gray-600 mb-4">Your cart is empty.</p>
      <Link href="/products" className="bg-rose-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-rose-700 transition-colors">
        Continue Shopping
      </Link>
    </div>
  )

  const subtotal = guestItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Your Cart</h1>
      <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm mb-6 flex items-center gap-2">
        <LogIn size={16} className="flex-shrink-0" />
        <span>
          You&apos;re browsing as a guest.{' '}
          <Link href="/auth/login?redirect=/checkout" className="font-semibold underline">Sign in</Link>
          {' '}or{' '}
          <Link href="/auth/register" className="font-semibold underline">create an account</Link>
          {' '}to place your order.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {guestItems.map((item: GuestCartItem) => (
            <div key={item.localId} className="flex gap-4 bg-white border border-gray-100 rounded-xl p-4">
              <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-50 flex-shrink-0">
                {item.product.primary_image?.url ? (
                  <Image src={item.product.primary_image.url} alt={item.product.name} fill className="object-cover" sizes="80px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No img</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm line-clamp-1">{item.product.name}</p>
                {item.variant && <p className="text-xs text-gray-400 mt-0.5">{item.variant.sku}</p>}
                <p className="text-rose-600 font-bold mt-1">₹{item.unit_price.toLocaleString('en-IN')}</p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => updateGuestItem(item.localId, item.quantity - 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
                  ><Minus size={12} /></button>
                  <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateGuestItem(item.localId, item.quantity + 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
                  ><Plus size={12} /></button>
                  <button
                    onClick={() => removeGuestItem(item.localId)}
                    className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
                  ><Trash2 size={15} /></button>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">₹{(item.unit_price * item.quantity).toLocaleString('en-IN')}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-5 h-fit">
          <h2 className="font-semibold text-gray-900 mb-4">Order Summary</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Subtotal ({guestItems.reduce((n, i) => n + i.quantity, 0)} items)</span>
              <span>₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-100 pt-2 mt-2">
              <span>Total</span><span>₹{subtotal.toLocaleString('en-IN')}</span>
            </div>
          </div>
          <Link
            href="/auth/login?redirect=/checkout"
            className="mt-4 w-full block text-center bg-rose-600 text-white font-semibold py-3 rounded-full hover:bg-rose-700 transition-colors"
          >
            Sign in to Checkout
          </Link>
          <p className="text-xs text-center text-gray-400 mt-2">Taxes and shipping calculated at checkout</p>
        </div>
      </div>
    </div>
  )
}

// ── Auth cart view ───────────────────────────────────────────────────────────

export default function CartPage() {
  const { isAuthenticated, token } = useAuthStore()
  const { setCart } = useCartStore()
  const [mounted, setMounted] = useState(false)
  const [cart, setLocalCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [coupon, setCoupon] = useState('')
  const [couponError, setCouponError] = useState('')

  async function fetchCart() {
    const authed = isAuthenticated() || !!localStorage.getItem('token')
    if (!authed) { setLoading(false); return }
    try {
      const res = await cartApi.get()
      setLocalCart(res.data)
      setCart(res.data)
    } catch {
      setLocalCart(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Batch: mark mounted + load cache in one render (React 18 auto-batches)
    setMounted(true)
    const cached = useCartStore.getState().cart
    if (cached) { setLocalCart(cached); setLoading(false) }
    fetchCart()
  }, [token])

  async function updateQty(itemId: number, qty: number) {
    if (qty < 1) return removeItem(itemId)
    // Optimistic update — reflect change immediately
    setLocalCart(prev => prev ? {
      ...prev,
      items: prev.items.map(i => i.id === itemId ? { ...i, quantity: qty, subtotal: i.unit_price * qty } : i)
    } : prev)
    try {
      const res = await cartApi.updateItem(itemId, qty)
      setLocalCart(res.data); setCart(res.data)
    } catch { fetchCart() } // revert on error
  }

  async function removeItem(itemId: number) {
    // Optimistic update — remove instantly
    setLocalCart(prev => prev ? { ...prev, items: prev.items.filter(i => i.id !== itemId) } : prev)
    try {
      const res = await cartApi.removeItem(itemId)
      setLocalCart(res.data); setCart(res.data)
    } catch { fetchCart() } // revert on error
  }

  async function applyCoupon() {
    setCouponError('')
    try {
      const res = await cartApi.applyCoupon(coupon)
      setLocalCart(res.data); setCart(res.data); setCoupon('')
    } catch (err: unknown) {
      setCouponError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Invalid coupon')
    }
  }

  async function removeCoupon() {
    const res = await cartApi.removeCoupon()
    setLocalCart(res.data); setCart(res.data)
  }

  if (!mounted) return null

  if (loading) return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-32 mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 bg-white border border-gray-100 rounded-xl p-4">
              <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/4" />
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="flex gap-2 mt-2">
                  <div className="w-7 h-7 bg-gray-200 rounded-full" />
                  <div className="w-6 h-7 bg-gray-200 rounded" />
                  <div className="w-7 h-7 bg-gray-200 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-3 h-fit">
          <div className="h-5 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded w-4/5" />
          <div className="h-11 bg-gray-200 rounded-full mt-4" />
        </div>
      </div>
    </div>
  )

  // Show guest cart if not authenticated
  if (!isAuthenticated() && !(typeof window !== 'undefined' && localStorage.getItem('token'))) {
    return <GuestCart />
  }

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
                    <button onClick={() => updateQty(item.id, item.quantity - 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 transition-colors">
                      <Minus size={12} />
                    </button>
                    <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateQty(item.id, item.quantity + 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 transition-colors">
                      <Plus size={12} />
                    </button>
                    <button onClick={() => removeItem(item.id)}
                      className="ml-2 text-gray-400 hover:text-red-500 transition-colors">
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
            <Link href="/checkout" className="mt-4 w-full block text-center bg-rose-600 text-white font-semibold py-3 rounded-full hover:bg-rose-700 transition-colors">
              Proceed to Checkout
            </Link>
          </div>

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
                  <input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="Enter code"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" />
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
