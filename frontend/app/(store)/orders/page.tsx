'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Package } from 'lucide-react'
import { ordersApi } from '../../../lib/api/orders'
import { useAuthStore } from '../../../lib/stores/authStore'
import { useOrdersStore } from '../../../lib/stores/ordersStore'
import type { Order } from '../../../lib/types'

const statusColors: Record<string, string> = {
  pending:    'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  shipped:    'bg-purple-100 text-purple-700',
  delivered:  'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-700',
}

export default function OrdersPage() {
  const { isAuthenticated } = useAuthStore()
  const { setOrders: storeOrders } = useOrdersStore()
  const [mounted, setMounted] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')

  useEffect(() => {
    if (!isAuthenticated()) { setMounted(true); setLoading(false); return }
    const cached = useOrdersStore.getState().orders
    // Batch: mounted + cache in one render
    setMounted(true)
    if (cached.length > 0) { setOrders(cached); setLoading(false) }
    ordersApi.list()
      .then((r) => {
        const data = (r.data as unknown as { data: Order[] }).data ?? []
        storeOrders(data)
        setOrders(data)
      })
      .catch(() => setFetchError('Failed to load orders. Please refresh the page.'))
      .finally(() => setLoading(false))
  }, [])

  if (!mounted) return null

  if (!isAuthenticated()) return (
    <div className="max-w-3xl mx-auto px-4 py-16 text-center">
      <p className="text-gray-600 mb-4">Please sign in to view your orders.</p>
      <Link href="/auth/login" className="bg-rose-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-rose-700 transition-colors">Sign In</Link>
    </div>
  )

  if (loading) return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-36 mb-6" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-24" />
                <div className="h-3 bg-gray-200 rounded w-20" />
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="h-6 bg-gray-200 rounded-full w-20" />
                <div className="h-4 bg-gray-200 rounded w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Orders</h1>

      {fetchError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 text-center">
          {fetchError}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Package className="mx-auto mb-4" size={48} />
          <p>No orders yet.</p>
          <Link href="/products" className="mt-4 inline-block text-rose-600 hover:underline font-medium">Start Shopping</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="block bg-white border border-gray-100 rounded-xl p-5 hover:border-rose-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">#{order.order_number}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(order.placed_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-1.5">
                  <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[order.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                  <p className="font-bold text-gray-900">₹{order.total.toLocaleString('en-IN')}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
