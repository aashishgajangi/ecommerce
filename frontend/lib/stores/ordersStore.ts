'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Order } from '../types'

interface OrdersState {
  orders: Order[]
  setOrders: (orders: Order[]) => void
  clearOrders: () => void
}

export const useOrdersStore = create<OrdersState>()(
  persist(
    (set) => ({
      orders: [],
      setOrders: (orders) => set({ orders }),
      clearOrders: () => set({ orders: [] }),
    }),
    { name: 'hc-orders' }
  )
)
