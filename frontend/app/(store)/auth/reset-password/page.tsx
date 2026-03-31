'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { authApi } from '../../../../lib/api/auth'

function ResetPasswordForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [form, setForm]     = useState({ password: '', password_confirmation: '' })
  const [done, setDone]     = useState(false)
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const token = searchParams.get('token') ?? ''
  const email = searchParams.get('email') ?? ''

  useEffect(() => {
    if (!token || !email) setError('Invalid or expired reset link. Please request a new one.')
  }, [token, email])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.password_confirmation) {
      setError('Passwords do not match.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await authApi.resetPassword({ token, email, ...form })
      setDone(true)
      setTimeout(() => router.push('/auth/login'), 3000)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Reset failed. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-4 text-sm text-center">
      <p className="font-semibold mb-1">Password reset!</p>
      <p>Redirecting you to login…</p>
    </div>
  )

  return (
    <>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm mb-4">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
          <input
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            placeholder="Minimum 8 characters"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
          <input
            type="password"
            required
            value={form.password_confirmation}
            onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !token}
          className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
        >
          {loading ? 'Resetting…' : 'Reset password'}
        </button>
      </form>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Set new password</h1>
        <p className="text-sm text-gray-500 mb-6">Choose a strong password for your account.</p>
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
        <p className="text-center text-sm text-gray-500 mt-6">
          <Link href="/auth/login" className="text-rose-600 hover:underline font-medium">Back to login</Link>
        </p>
      </div>
    </div>
  )
}
