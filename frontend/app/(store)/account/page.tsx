'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { profileApi, addressApi } from '../../../lib/api/profile'
import type { SavedAddress } from '../../../lib/api/profile'
import type { PickedAddress } from '../../../components/checkout/MapAddressPicker'
import { useAuthStore } from '../../../lib/stores/authStore'
import { useCartStore } from '../../../lib/stores/cartStore'
import { useOrdersStore } from '../../../lib/stores/ordersStore'
import type { User } from '../../../lib/types'

const MapAddressPicker = dynamic(
  () => import('../../../components/checkout/MapAddressPicker'),
  { ssr: false, loading: () => <div className="h-72 rounded-2xl bg-gray-100 animate-pulse" /> }
)

const TYPE_ICONS: Record<string, React.ReactElement> = {
  Home: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  Work: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  Other: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
}

interface NewAddrContact { name: string; phone: string; is_default: boolean }

export default function AccountPage() {
  const { isAuthenticated, clearAuth } = useAuthStore()
  const { clearCart } = useCartStore()
  const { clearOrders } = useOrdersStore()
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [form, setForm] = useState({ name: '', phone: '' })
  const [pwForm, setPwForm] = useState({ current_password: '', password: '', password_confirmation: '' })
  const [saving, setSaving] = useState(false)
  const [savingPw, setSavingPw] = useState(false)
  const [msg, setMsg] = useState('')
  const [pwMsg, setPwMsg] = useState('')

  // Addresses
  const [addresses, setAddresses] = useState<SavedAddress[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [pickedAddr, setPickedAddr] = useState<PickedAddress | null>(null)
  const [contact, setContact] = useState<NewAddrContact>({ name: '', phone: '', is_default: false })
  const [savingAddr, setSavingAddr] = useState(false)
  const [addrMsg, setAddrMsg] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/auth/login'); return }
    profileApi.get().then((r) => {
      setUser(r.data)
      setForm({ name: r.data.name, phone: r.data.phone ?? '' })
      // Normalize phone to last 10 digits (strip +91, country code, spaces, dashes)
      const rawPhone = r.data.phone ?? ''
      const tenDigits = rawPhone.replace(/\D/g, '').slice(-10)
      setContact((c) => ({ ...c, name: r.data.name ?? '', phone: tenDigits }))
    }).catch(() => {})
    addressApi.list().then((r) => setAddresses(r.data)).catch(() => {})
  }, [])

  async function saveProfile(e: { preventDefault(): void }) {
    e.preventDefault()
    setSaving(true); setMsg('')
    try {
      const r = await profileApi.update(form)
      setUser(r.data)
      setMsg('Profile updated.')
    } catch {
      setMsg('Failed to update.')
    } finally { setSaving(false) }
  }

  async function changePassword(e: { preventDefault(): void }) {
    e.preventDefault()
    if (pwForm.password !== pwForm.password_confirmation) { setPwMsg('Passwords do not match.'); return }
    setSavingPw(true); setPwMsg('')
    try {
      await profileApi.changePassword(pwForm)
      setPwMsg('Password updated.')
      setPwForm({ current_password: '', password: '', password_confirmation: '' })
    } catch (err: unknown) {
      setPwMsg((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed.')
    } finally { setSavingPw(false) }
  }

  function handleMapPick(picked: PickedAddress) {
    setPickedAddr(picked)
  }

  async function saveAddress(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!pickedAddr) return
    setSavingAddr(true); setAddrMsg('')
    try {
      const payload = {
        label: null,
        name: contact.name,
        phone: `+91${contact.phone.replace(/\D/g, '').slice(-10)}`,
        address_line1: pickedAddr.line1 || pickedAddr.area || 'N/A',
        address_line2: null,
        city: pickedAddr.city || '',
        state: pickedAddr.state || '',
        pincode: pickedAddr.pincode || '',
        type: pickedAddr.type,
        is_default: contact.is_default,
      }
      const r = await addressApi.create(payload)
      setAddresses((prev) => contact.is_default
        ? [r.data, ...prev.map((a) => ({ ...a, is_default: false }))]
        : [...prev, r.data]
      )
      resetAddForm()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data
      if (msg?.errors) {
        setAddrMsg(Object.values(msg.errors).flat().join(' '))
      } else {
        setAddrMsg(msg?.message ?? 'Failed to save address.')
      }
    } finally { setSavingAddr(false) }
  }

  function resetAddForm() {
    setShowAddForm(false)
    setPickedAddr(null)
    setAddrMsg('')
    setContact((c) => ({ ...c, is_default: false }))
  }

  async function deleteAddress(id: number) {
    setDeletingId(id)
    try {
      await addressApi.remove(id)
      setAddresses((prev) => prev.filter((a) => a.id !== id))
    } catch { /* ignore */ }
    finally { setDeletingId(null) }
  }

  async function makeDefault(id: number) {
    try {
      await addressApi.setDefault(id)
      setAddresses((prev) => prev.map((a) => ({ ...a, is_default: a.id === id })))
    } catch { /* ignore */ }
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
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input value={user.email} disabled className="w-full border border-gray-100 rounded-lg px-4 py-2.5 text-sm bg-gray-50 text-gray-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500" placeholder="+91 00000 00000" />
          </div>
          <button type="submit" disabled={saving}
            className="bg-rose-600 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-rose-700 disabled:opacity-60 transition-colors">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Saved Addresses */}
      <div className="bg-white border border-gray-100 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Saved Addresses</h2>
          {!showAddForm && (
            <button onClick={() => setShowAddForm(true)}
              className="flex items-center gap-1 text-sm font-medium text-rose-600 hover:text-rose-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Address
            </button>
          )}
        </div>

        {/* Add address flow — single scrollable form */}
        {showAddForm && (
          <form onSubmit={saveAddress} className="mb-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">
                {pickedAddr ? 'Confirm your address' : 'Pick your location'}
              </p>
              <button type="button" onClick={resetAddForm} className="text-xs text-gray-400 hover:text-gray-600 font-medium">
                Cancel
              </button>
            </div>

            {/* Map picker — always visible */}
            <MapAddressPicker onConfirm={handleMapPick} />

            {/* Contact & save — appears after location is confirmed on map */}
            {pickedAddr && (
              <>
                {addrMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
                    {addrMsg}
                  </div>
                )}

                {/* Confirmed address + receiver details card */}
                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  {/* Address preview */}
                  <div className="flex items-start gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
                    <svg className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 leading-snug">
                        {pickedAddr.line1 || pickedAddr.area || 'Selected location'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {[pickedAddr.city, pickedAddr.state, pickedAddr.pincode].filter(Boolean).join(', ')}
                        {pickedAddr.type && <span className="ml-1 text-gray-400">· {pickedAddr.type}</span>}
                      </p>
                    </div>
                    <button type="button" onClick={() => setPickedAddr(null)}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex-shrink-0">
                      Change
                    </button>
                  </div>

                  {/* Receiver details */}
                  <div className="px-4 py-4 space-y-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Receiver details</p>

                    <input
                      required
                      value={contact.name}
                      onChange={(e) => setContact({ ...contact, name: e.target.value })}
                      placeholder="Full name"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />

                    <div>
                      <div className="flex">
                        <span className="flex items-center px-3 border border-r-0 border-gray-200 rounded-l-xl bg-gray-50 text-sm text-gray-600 select-none whitespace-nowrap">
                          🇮🇳 +91
                        </span>
                        <input
                          required
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          value={contact.phone}
                          onChange={(e) => setContact({ ...contact, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                          placeholder="10-digit mobile number"
                          className="flex-1 border border-gray-200 rounded-r-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                      </div>
                      {contact.phone.length > 0 && contact.phone.length < 10 && (
                        <p className="text-xs text-red-500 mt-1.5 ml-1">Enter a valid 10-digit mobile number</p>
                      )}
                    </div>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={contact.is_default}
                    onChange={(e) => setContact({ ...contact, is_default: e.target.checked })}
                    className="accent-rose-600" />
                  Set as default address
                </label>

                <button
                  type="submit"
                  disabled={savingAddr || (contact.phone.length > 0 && contact.phone.length < 10)}
                  className="w-full bg-rose-600 text-white py-3.5 rounded-2xl text-sm font-bold hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {savingAddr ? 'Saving...' : 'Save Address'}
                </button>
              </>
            )}
          </form>
        )}

        {/* Address list */}
        {addresses.length === 0 && !showAddForm && (
          <div className="text-center py-8">
            <svg className="w-10 h-10 text-gray-200 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <p className="text-sm text-gray-400">No saved addresses yet</p>
            <button onClick={() => setShowAddForm(true)} className="mt-2 text-sm text-rose-600 font-medium hover:underline">
              Add your first address
            </button>
          </div>
        )}

        <div className="space-y-3">
          {addresses.map((addr) => (
            <div key={addr.id} className={`border rounded-xl p-4 transition-colors ${addr.is_default ? 'border-rose-200 bg-rose-50/40' : 'border-gray-100 bg-white'}`}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${addr.is_default ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-600'}`}>
                  {TYPE_ICONS[addr.type] ?? TYPE_ICONS.Other}
                  {addr.label || addr.type}
                </span>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {addr.is_default && <span className="text-xs text-rose-600 font-medium">Default</span>}
                  {!addr.is_default && (
                    <button onClick={() => makeDefault(addr.id)} className="text-xs text-gray-500 hover:text-rose-600 transition-colors">
                      Set default
                    </button>
                  )}
                  <button onClick={() => deleteAddress(addr.id)} disabled={deletingId === addr.id}
                    className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40 transition-colors">
                    {deletingId === addr.id ? '...' : 'Delete'}
                  </button>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-900">{addr.name} · {addr.phone}</p>
              <p className="text-sm text-gray-500 mt-0.5">
                {addr.address_line1}{addr.address_line2 ? `, ${addr.address_line2}` : ''}, {addr.city}, {addr.state} — {addr.pincode}
              </p>
            </div>
          ))}
        </div>
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
              <input type="password" required value={pwForm[field]}
                onChange={(e) => setPwForm({ ...pwForm, [field]: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="••••••••" />
            </div>
          ))}
          <button type="submit" disabled={savingPw}
            className="bg-rose-600 text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-rose-700 disabled:opacity-60 transition-colors">
            {savingPw ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Sign out */}
      <button onClick={() => { clearAuth(); clearCart(); clearOrders(); router.push('/') }}
        className="w-full text-sm text-red-500 hover:underline py-2">
        Sign Out
      </button>
    </div>
  )
}
