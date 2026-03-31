'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authApi } from '../../../../lib/api/auth'
import { useAuthStore } from '../../../../lib/stores/authStore'
import { useCartStore } from '../../../../lib/stores/cartStore'
import { cartApi } from '../../../../lib/api/cart'

export default function RegisterPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const { guestItems, clearGuestCart, setCart } = useCartStore()
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [registered, setRegistered] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password !== form.password_confirmation) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const res = await authApi.register(form)
      setAuth(res.data.user, res.data.token)
      // Merge guest cart silently
      if (guestItems.length > 0) {
        try {
          for (const item of guestItems) {
            await cartApi.addItem({ product_id: item.product_id, variant_id: item.variant_id ?? undefined, quantity: item.quantity })
          }
          const cartRes = await cartApi.get()
          setCart(cartRes.data)
          clearGuestCart()
        } catch { /* silently ignore */ }
      }
      setRegistered(true)
      setTimeout(() => router.push('/'), 4000)
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data
      const msg = data?.message ?? Object.values(data?.errors ?? {})[0]?.[0]
      setError(msg ?? 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Create account</h1>
        <p className="text-sm text-gray-500 mb-6">Join Hangout Cakes for a sweeter experience</p>

        {registered && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-4 text-sm mb-4 text-center">
            <p className="font-semibold mb-1">Account created!</p>
            <p>We sent a verification email to <strong>{form.email}</strong>.</p>
            <p className="mt-1 text-xs text-green-600">Check your inbox (and spam) to verify your account.</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        {!registered && <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              placeholder="Min. 8 characters"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              type="password"
              required
              value={form.password_confirmation}
              onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rose-600 text-white font-semibold py-3 rounded-full hover:bg-rose-700 disabled:opacity-60 transition-colors"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>}

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-rose-600 font-medium hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
