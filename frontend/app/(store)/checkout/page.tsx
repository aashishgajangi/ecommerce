'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cartApi } from '../../../lib/api/cart'
import { useAuthStore } from '../../../lib/stores/authStore'
import { useCartStore } from '../../../lib/stores/cartStore'
import type { Cart } from '../../../lib/types'

export default function CheckoutPage() {
  const { isAuthenticated } = useAuthStore()
  const { clearCart } = useCartStore()
  const router = useRouter()
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [address, setAddress] = useState({ name: '', phone: '', line1: '', city: '', state: '', pincode: '' })
  const [method, setMethod] = useState<'cod' | 'razorpay'>('cod')
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/auth/login'); return }
    cartApi.get()
      .then((r) => setCart(r.data.data))
      .catch(() => router.push('/cart'))
      .finally(() => setLoading(false))
  }, [])

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setPlacing(true)
    try {
      // POST /checkout/place — Razorpay integration coming in Phase 2B
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/checkout/place`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          shipping_address: address,
          billing_address: address,
          payment_method: method,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Failed to place order')
      clearCart()
      router.push(`/orders/${data.data.id}`)
    } catch (err: unknown) {
      setError((err as Error).message)
    } finally {
      setPlacing(false)
    }
  }

  if (loading || !cart) return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-400">Loading...</div>

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>
      <form onSubmit={placeOrder}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Shipping */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-gray-100 rounded-xl p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Shipping Address</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {([
                  { key: 'name', label: 'Full Name', span: 1 },
                  { key: 'phone', label: 'Phone', span: 1 },
                  { key: 'line1', label: 'Address', span: 2 },
                  { key: 'city', label: 'City', span: 1 },
                  { key: 'state', label: 'State', span: 1 },
                  { key: 'pincode', label: 'Pincode', span: 1 },
                ] as const).map(({ key, label, span }) => (
                  <div key={key} className={span === 2 ? 'sm:col-span-2' : ''}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <input
                      required
                      value={address[key]}
                      onChange={(e) => setAddress({ ...address, [key]: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Payment */}
            <div className="bg-white border border-gray-100 rounded-xl p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Payment Method</h2>
              <div className="space-y-3">
                {([
                  { value: 'cod', label: 'Cash on Delivery', desc: 'Pay when your order arrives' },
                  { value: 'razorpay', label: 'Pay Online (Razorpay)', desc: 'Cards, UPI, Net Banking, Wallets' },
                ] as const).map((opt) => (
                  <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${method === opt.value ? 'border-rose-400 bg-rose-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input type="radio" name="payment" value={opt.value} checked={method === opt.value} onChange={() => setMethod(opt.value)} className="mt-0.5 accent-rose-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                      <p className="text-xs text-gray-400">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <h2 className="font-semibold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-2 text-sm text-gray-600">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span className="line-clamp-1 flex-1 mr-2">{item.product.name} ×{item.quantity}</span>
                    <span className="flex-shrink-0">₹{item.subtotal.toLocaleString('en-IN')}</span>
                  </div>
                ))}
                <div className="border-t border-gray-100 pt-2 mt-2 space-y-1">
                  {cart.discount_amount > 0 && (
                    <div className="flex justify-between text-green-600"><span>Discount</span><span>−₹{cart.discount_amount.toLocaleString('en-IN')}</span></div>
                  )}
                  <div className="flex justify-between"><span>Tax</span><span>₹{cart.tax_amount.toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between font-bold text-gray-900 text-base pt-1">
                    <span>Total</span><span>₹{cart.total.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {error && <p className="text-red-500 text-xs mt-3">{error}</p>}

              <button
                type="submit"
                disabled={placing}
                className="mt-4 w-full bg-rose-600 text-white font-semibold py-3 rounded-full hover:bg-rose-700 disabled:opacity-60 transition-colors"
              >
                {placing ? 'Placing Order...' : `Place Order · ₹${cart.total.toLocaleString('en-IN')}`}
              </button>
              <p className="text-xs text-gray-400 text-center mt-2">Razorpay integration coming soon</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
