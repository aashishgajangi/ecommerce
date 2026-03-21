'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { ordersApi } from '../../../../lib/api/orders'
import { useAuthStore } from '../../../../lib/stores/authStore'
import type { Order } from '../../../../lib/types'

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/auth/login'); return }
    ordersApi.get(Number(id))
      .then((r) => setOrder(r.data.data))
      .catch(() => router.push('/orders'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-16 text-center text-gray-400">Loading...</div>
  if (!order) return null

  return (
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
      </div>

      {/* Cancel */}
      {['pending', 'processing'].includes(order.status) && (
        <button
          onClick={async () => {
            await ordersApi.cancel(order.id)
            setOrder({ ...order, status: 'cancelled' })
          }}
          className="mt-4 text-sm text-red-500 hover:underline"
        >
          Cancel Order
        </button>
      )}
    </div>
  )
}
