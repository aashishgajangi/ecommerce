'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Cart } from '../types'

export interface GuestCartItem {
  localId: string
  product_id: number
  variant_id?: number | null
  quantity: number
  unit_price: number
  product: {
    id: number
    name: string
    slug: string
    primary_image: { url: string; alt_text?: string | null } | null
  }
  variant: { id: number; sku: string } | null
}

interface CartState {
  cart: Cart | null
  itemCount: number
  setCart: (cart: Cart) => void
  clearCart: () => void

  guestItems: GuestCartItem[]
  guestItemCount: number
  addGuestItem: (item: Omit<GuestCartItem, 'localId'>) => void
  updateGuestItem: (localId: string, quantity: number) => void
  removeGuestItem: (localId: string) => void
  clearGuestCart: () => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: null,
      itemCount: 0,
      setCart: (cart) =>
        set({
          cart,
          itemCount: cart.items.reduce((n, i) => n + i.quantity, 0),
          // User is authenticated — wipe any stale guest items
          guestItems: [],
          guestItemCount: 0,
        }),
      clearCart: () => set({ cart: null, itemCount: 0, guestItems: [], guestItemCount: 0 }),

      guestItems: [],
      guestItemCount: 0,

      addGuestItem: (item) => {
        const items = get().guestItems
        const existing = items.find(
          (i) => i.product_id === item.product_id && i.variant_id === item.variant_id
        )
        let updated: GuestCartItem[]
        if (existing) {
          updated = items.map((i) =>
            i.localId === existing.localId ? { ...i, quantity: i.quantity + item.quantity } : i
          )
        } else {
          updated = [...items, { ...item, localId: `${Date.now()}-${Math.random()}` }]
        }
        set({ guestItems: updated, guestItemCount: updated.reduce((n, i) => n + i.quantity, 0) })
      },

      updateGuestItem: (localId, quantity) => {
        const items =
          quantity <= 0
            ? get().guestItems.filter((i) => i.localId !== localId)
            : get().guestItems.map((i) => (i.localId === localId ? { ...i, quantity } : i))
        set({ guestItems: items, guestItemCount: items.reduce((n, i) => n + i.quantity, 0) })
      },

      removeGuestItem: (localId) => {
        const items = get().guestItems.filter((i) => i.localId !== localId)
        set({ guestItems: items, guestItemCount: items.reduce((n, i) => n + i.quantity, 0) })
      },

      clearGuestCart: () => set({ guestItems: [], guestItemCount: 0 }),
    }),
    {
      name: 'hc-cart',
      partialize: (s) => ({
        cart: s.cart,
        itemCount: s.itemCount,
        guestItems: s.guestItems,
        guestItemCount: s.guestItemCount,
      }),
    }
  )
)
