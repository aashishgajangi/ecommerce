'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { profileApi } from '../../../lib/api/profile'
import { useAuthStore } from '../../../lib/stores/authStore'
import type { User } from '../../../lib/types'

export default function AccountPage() {
  const { isAuthenticated, clearAuth } = useAuthStore()
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [form, setForm] = useState({ name: '', phone: '' })
  const [pwForm, setPwForm] = useState({ current_password: '', password: '', password_confirmation: '' })
  const [saving, setSaving] = useState(false)
  const [savingPw, setSavingPw] = useState(false)
  const [msg, setMsg] = useState('')
  const [pwMsg, setPwMsg] = useState('')

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/auth/login'); return }
    profileApi.get()
      .then((r) => {
        setUser(r.data.data)
        setForm({ name: r.data.data.name, phone: r.data.data.phone ?? '' })
      })
      .catch(() => {})
  }, [])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setMsg('')
    try {
      const r = await profileApi.update(form)
      setUser(r.data.data)
      setMsg('Profile updated.')
    } catch {
      setMsg('Failed to update.')
    } finally {
      setSaving(false)
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    if (pwForm.password !== pwForm.password_confirmation) { setPwMsg('Passwords do not match.'); return }
    setSavingPw(true); setPwMsg('')
    try {
      await profileApi.changePassword(pwForm)
      setPwMsg('Password updated.')
      setPwForm({ current_password: '', password: '', password_confirmation: '' })
    } catch (err: unknown) {
      setPwMsg((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed.')
    } finally {
      setSavingPw(false)
    }
  }

  if (!user) return <div className="max-w-xl mx-auto px-4 py-16 text-center text-gray-400">Loading...</div>

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Account</h1>
        <Link href="/orders" className="text-sm text-rose-600 hover:underline">My Orders →</Link>
      </div>

      {/* Profile */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Profile</h2>
        {msg && <p className={`text-sm mb-3 ${msg.includes('updated') ? 'text-green-600' : 'text-red-500'}`}>{msg}</p>}
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input value={user.email} disabled className="w-full border border-gray-100 rounded-lg px-4 py-2.5 text-sm bg-gray-50 text-gray-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
              placeholder="+91 00000 00000"
            />
          </div>
          <button type="submit" disabled={saving} className="bg-rose-600 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-rose-700 disabled:opacity-60 transition-colors">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Change Password</h2>
        {pwMsg && <p className={`text-sm mb-3 ${pwMsg.includes('updated') ? 'text-green-600' : 'text-red-500'}`}>{pwMsg}</p>}
        <form onSubmit={changePassword} className="space-y-4">
          {(['current_password', 'password', 'password_confirmation'] as const).map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field === 'current_password' ? 'Current Password' : field === 'password' ? 'New Password' : 'Confirm New Password'}
              </label>
              <input
                type="password"
                required
                value={pwForm[field]}
                onChange={(e) => setPwForm({ ...pwForm, [field]: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="••••••••"
              />
            </div>
          ))}
          <button type="submit" disabled={savingPw} className="bg-rose-600 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-rose-700 disabled:opacity-60 transition-colors">
            {savingPw ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Sign out */}
      <button
        onClick={() => { clearAuth(); router.push('/') }}
        className="w-full text-sm text-red-500 hover:underline py-2"
      >
        Sign Out
      </button>
    </div>
  )
}
