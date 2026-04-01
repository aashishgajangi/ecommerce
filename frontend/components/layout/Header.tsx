'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ShoppingCart, User, Menu, X, Search, Heart } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '../../lib/stores/authStore'
import { useCartStore } from '../../lib/stores/cartStore'
import { useOrdersStore } from '../../lib/stores/ordersStore'

interface HeaderProps {
  logoUrl?: string | null
  siteName?: string
}

export default function Header({ logoUrl, siteName = 'Hangout Cakes' }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { user, clearAuth } = useAuthStore()
  const { itemCount, guestItemCount, clearCart } = useCartStore()
  const { clearOrders } = useOrdersStore()
  // Authenticated → server cart count only. Guest → guest cart count only. Never add both.
  const totalCartCount = user ? itemCount : guestItemCount

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={siteName}
                width={140}
                height={40}
                className="h-9 w-auto object-contain"
                priority
              />
            ) : (
              <span className="text-xl font-bold text-rose-600 tracking-tight">{siteName}</span>
            )}
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-700">
            <Link href="/products" className="hover:text-rose-600 transition-colors">Shop</Link>
            <Link href="/categories" className="hover:text-rose-600 transition-colors">Categories</Link>
            <Link href="/products?featured=true" className="hover:text-rose-600 transition-colors">Featured</Link>
            <Link href="/stores" className="hover:text-rose-600 transition-colors">Our Stores</Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Link href="/products" className="hidden md:flex items-center text-gray-500 hover:text-rose-600 transition-colors">
              <Search size={20} />
            </Link>

            {user && (
              <Link href="/wishlist" className="hidden md:flex items-center text-gray-500 hover:text-rose-600 transition-colors">
                <Heart size={20} />
              </Link>
            )}

            <Link href="/cart" className="relative flex items-center text-gray-700 hover:text-rose-600 transition-colors">
              <ShoppingCart size={20} />
              {totalCartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-rose-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                  {totalCartCount > 99 ? '99+' : totalCartCount}
                </span>
              )}
            </Link>

            {user ? (
              <div className="relative group">
                <button className="flex items-center gap-1 text-gray-700 hover:text-rose-600 transition-colors text-sm">
                  <User size={20} />
                  <span className="hidden md:inline">{user.name.split(' ')[0]}</span>
                </button>
                <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-100 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all z-50">
                  <Link href="/account" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">My Account</Link>
                  <Link href="/orders" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">My Orders</Link>
                  <Link href="/wishlist" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">My Wishlist</Link>
                  <button
                    onClick={() => { clearAuth(); clearCart(); clearOrders() }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <Link href="/auth/login" className="hidden md:inline-flex items-center gap-1 text-sm text-gray-700 hover:text-rose-600 transition-colors">
                <User size={20} />
                <span>Login</span>
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button
              className="md:hidden text-gray-700"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-2 text-sm font-medium text-gray-700">
          <Link href="/products" className="block py-1 hover:text-rose-600" onClick={() => setMenuOpen(false)}>Shop</Link>
          <Link href="/categories" className="block py-1 hover:text-rose-600" onClick={() => setMenuOpen(false)}>Categories</Link>
          <Link href="/products?featured=true" className="block py-1 hover:text-rose-600" onClick={() => setMenuOpen(false)}>Featured</Link>
          <Link href="/stores" className="block py-1 hover:text-rose-600" onClick={() => setMenuOpen(false)}>Our Stores</Link>
          {user ? (
            <>
              <Link href="/account" className="block py-1 hover:text-rose-600" onClick={() => setMenuOpen(false)}>My Account</Link>
              <Link href="/orders" className="block py-1 hover:text-rose-600" onClick={() => setMenuOpen(false)}>My Orders</Link>
              <Link href="/wishlist" className="block py-1 hover:text-rose-600" onClick={() => setMenuOpen(false)}>My Wishlist</Link>
              <button onClick={() => { clearAuth(); clearCart(); clearOrders(); setMenuOpen(false) }} className="block py-1 text-red-600">Sign Out</button>
            </>
          ) : (
            <Link href="/auth/login" className="block py-1 hover:text-rose-600" onClick={() => setMenuOpen(false)}>Login / Register</Link>
          )}
        </div>
      )}
    </header>
  )
}
