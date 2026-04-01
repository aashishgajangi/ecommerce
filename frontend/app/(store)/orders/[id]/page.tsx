'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Script from 'next/script'
import { ChevronLeft } from 'lucide-react'
import { ordersApi } from '../../../../lib/api/orders'
import { useAuthStore } from '../../../../lib/stores/authStore'
import { useOrdersStore } from '../../../../lib/stores/ordersStore'
import type { Order } from '../../../../lib/types'

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: Record<string, unknown>) => { open(): void }
  }
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-blue-100 text-blue-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState('')

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/auth/login'); return }
    const cached = useOrdersStore.getState().orders.find((o) => o.id === Number(id))
    setMounted(true)
    if (cached) { setOrder(cached); setLoading(false) }
    ordersApi.get(Number(id))
      .then((r) => setOrder(r.data))
      .catch(() => router.push('/orders'))
      .finally(() => setLoading(false))
  }, [id])

  async function openRazorpayModal() {
    if (!order) return
    setPaying(true)
    setPayError('')
    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/payments/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ order_id: order.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Failed to initiate payment')

      const { razorpay_order_id, amount, currency } = data.data
      setPaying(false)

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount,
          currency,
          order_id: razorpay_order_id,
          name: 'Hangout Cakes',
          description: `Order ${order.order_number}`,
          theme: { color: '#e11d48' },
          handler: async (response: {
            razorpay_payment_id: string
            razorpay_order_id: string
            razorpay_signature: string
          }) => {
            try {
              const vRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/payments/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                  order_id: order.id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              })
              if (!vRes.ok) {
                const vData = await vRes.json()
                reject(new Error(vData.message ?? 'Payment verification failed'))
              } else {
                resolve()
                // Refresh order from API to show updated status
                ordersApi.get(order.id).then((r) => setOrder(r.data)).catch(() => {})
              }
            } catch (err) {
              reject(err)
            }
          },
          modal: {
            ondismiss: () => reject(new Error('Payment cancelled')),
          },
        })
        rzp.open()
      })
    } catch (err: unknown) {
      setPayError((err as Error).message)
      setPaying(false)
    }
  }

  if (!mounted) return null

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-28 mb-6" />
      <div className="flex items-start justify-between mb-6">
        <div className="space-y-2">
          <div className="h-7 bg-gray-200 rounded w-52" />
          <div className="h-3 bg-gray-200 rounded w-36" />
        </div>
        <div className="h-7 bg-gray-200 rounded-full w-24" />
      </div>
      <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50 mb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between items-center px-5 py-4">
            <div className="space-y-1.5">
              <div className="h-4 bg-gray-200 rounded w-44" />
              <div className="h-3 bg-gray-200 rounded w-28" />
            </div>
            <div className="h-4 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  )
  if (!order) return null

  const needsPayment =
    order.status === 'pending' &&
    order.payment?.method === 'razorpay' &&
    order.payment?.status === 'pending'

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <Link href="/orders" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-rose-600 mb-6 transition-colors">
          <ChevronLeft size={16} /> Back to Orders
        </Link>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order #{order.order_number}</h1>
            <p className="text-sm text-gray-400 mt-1">{new Date(order.placed_at).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
          <span className={`text-sm font-semibold px-3 py-1.5 rounded-full ${statusColors[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </span>
        </div>

        {/* Pay Now banner — shown when Razorpay payment is still pending */}
        {needsPayment && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-yellow-800">Payment pending</p>
              <p className="text-xs text-yellow-700 mt-0.5">Complete your payment to confirm this order.</p>
            </div>
            <button
              onClick={openRazorpayModal}
              disabled={paying}
              className="shrink-0 bg-rose-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {paying ? 'Opening…' : `Pay ₹${order.total.toLocaleString('en-IN')}`}
            </button>
          </div>
        )}
        {payError && (
          <p className="mb-4 text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">{payError}</p>
        )}

        {/* Items */}
        {order.items && order.items.length > 0 && (
          <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50 mb-4">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between items-center px-5 py-4">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{item.product_name}</p>
                  {item.variant_sku && <p className="text-xs text-gray-400 mt-0.5">{item.variant_sku}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">Qty: {item.quantity} × ₹{item.unit_price.toLocaleString('en-IN')}</p>
                </div>
                <p className="font-semibold text-gray-900">₹{item.subtotal.toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>
        )}

        {/* Delivery info */}
        {(order.branch || order.shipping_address) && (
          <div className="bg-white border border-gray-100 rounded-xl p-5 mb-4 grid sm:grid-cols-2 gap-4 text-sm">
            {order.branch && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Delivering From</p>
                <p className="font-medium text-gray-900">{order.branch.name}</p>
                {order.branch.address && <p className="text-gray-500 text-xs mt-0.5">{order.branch.address}</p>}
                {order.branch.phone && <p className="text-gray-400 text-xs mt-0.5">{order.branch.phone}</p>}
              </div>
            )}
            {order.shipping_address && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Delivery Address</p>
                {order.shipping_address.name && <p className="font-medium text-gray-900">{order.shipping_address.name}</p>}
                {order.shipping_address.phone && <p className="text-gray-500 text-xs mt-0.5">{order.shipping_address.phone}</p>}
                {order.shipping_address.line1 && <p className="text-gray-500 text-xs mt-0.5">{order.shipping_address.line1}</p>}
                {(order.shipping_address.city || order.shipping_address.pincode) && (
                  <p className="text-gray-400 text-xs">{[order.shipping_address.city, order.shipping_address.pincode].filter(Boolean).join(' – ')}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Totals */}
        <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-2 text-sm">
          <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>₹{order.subtotal.toLocaleString('en-IN')}</span></div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between text-green-600"><span>Discount</span><span>−₹{order.discount_amount.toLocaleString('en-IN')}</span></div>
          )}
          <div className="flex justify-between text-gray-600"><span>Tax</span><span>₹{order.tax_amount.toLocaleString('en-IN')}</span></div>
          <div className="flex justify-between text-gray-600"><span>Shipping</span><span>{order.shipping_amount > 0 ? `₹${order.shipping_amount.toLocaleString('en-IN')}` : 'Free'}</span></div>
          <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-100 pt-2 mt-2">
            <span>Total</span><span>₹{order.total.toLocaleString('en-IN')}</span>
          </div>
          {order.payment && (
            <div className="flex justify-between text-gray-400 text-xs pt-1">
              <span>Payment</span>
              <span className="capitalize">{order.payment.method === 'razorpay' ? 'Online (Razorpay)' : 'Cash on Delivery'} · {order.payment.status}</span>
            </div>
          )}
        </div>

        {/* Cancel */}
        {['pending', 'confirmed'].includes(order.status) && (
          <div className="mt-4">
            {cancelError && <p className="text-xs text-red-500 mb-2">{cancelError}</p>}
            <button
              disabled={cancelling}
              onClick={async () => {
                if (!window.confirm('Are you sure you want to cancel this order?')) return
                setCancelling(true)
                setCancelError('')
                try {
                  await ordersApi.cancel(order.id)
                  setOrder({ ...order, status: 'cancelled' })
                } catch {
                  setCancelError('Failed to cancel order. Please try again.')
                } finally {
                  setCancelling(false)
                }
              }}
              className="text-sm text-red-500 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelling ? 'Cancelling…' : 'Cancel Order'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
