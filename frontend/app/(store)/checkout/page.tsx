'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import { cartApi } from '../../../lib/api/cart'
import { addressApi } from '../../../lib/api/profile'
import { branchApi } from '../../../lib/api/branches'
import type { SavedAddress } from '../../../lib/api/profile'
import { useAuthStore } from '../../../lib/stores/authStore'
import { useCartStore } from '../../../lib/stores/cartStore'
import { useLocationStore } from '../../../lib/stores/locationStore'
import type { SelectedBranch } from '../../../lib/stores/locationStore'
import type { Cart, NearbyBranch } from '../../../lib/types'

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: Record<string, unknown>) => { open(): void }
  }
}

interface AddressState {
  name: string
  phone: string
  line1: string
  city: string
  state: string
  pincode: string
}

function StepBadge({ n }: { n: number }) {
  return (
    <span className="w-6 h-6 rounded-full bg-rose-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
      {n}
    </span>
  )
}

export default function CheckoutPage() {
  const { isAuthenticated, user } = useAuthStore()
  const { clearCart } = useCartStore()
  const { userLocation, selectedBranch, setSelectedBranch, openLocationBar } = useLocationStore()
  const router = useRouter()

  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])

  const [address, setAddress] = useState<AddressState>({
    name: user?.name ?? '',
    phone: (user?.phone ?? '').replace(/\D/g, '').slice(-10),
    line1: '', city: '', state: '', pincode: '',
  })
  const [phoneError, setPhoneError] = useState('')
  const [method, setMethod] = useState<'cod' | 'razorpay'>('cod')
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')

  const [branchList, setBranchList] = useState<NearbyBranch[]>([])       // within-radius only
  const [allBranches, setAllBranches] = useState<NearbyBranch[]>([])     // all stores for picker
  const [loadingBranches, setLoadingBranches] = useState(false)
  const [loadingAllBranches, setLoadingAllBranches] = useState(false)
  const [showStorePicker, setShowStorePicker] = useState(false)

  // Ref avoids stale-closure bugs when auto-selecting nearest branch
  const selectedBranchRef = useRef(selectedBranch)
  useEffect(() => { selectedBranchRef.current = selectedBranch }, [selectedBranch])

  // Auto-fill address fields from location coordinates via Google Geocoding REST API
  useEffect(() => {
    if (!userLocation) return
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
    if (!key) return

    fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${userLocation.lat},${userLocation.lng}&key=${key}`)
      .then(r => r.json())
      .then((data: { results: Array<{ address_components: Array<{ long_name: string; types: string[] }> }> }) => {
        const comps = data.results?.[0]?.address_components ?? []
        const get = (type: string) => comps.find(c => c.types.includes(type))?.long_name ?? ''
        const sub   = get('sublocality_level_1') || get('sublocality') || get('neighborhood')
        const city  = get('locality') || get('administrative_area_level_2')
        const state = get('administrative_area_level_1')
        const pin   = get('postal_code')
        setAddress(a => ({
          ...a,
          city:    a.city    || city  || sub,
          state:   a.state   || state,
          pincode: a.pincode || pin,
        }))
      })
      .catch(() => {
        // Fallback: parse city from label
        if (!userLocation.label) return
        const parts = userLocation.label.split(',')
        const detectedCity = (parts.length > 1 ? parts[parts.length - 1] : parts[0]).trim()
        setAddress(a => ({ ...a, city: a.city || detectedCity }))
      })
  }, [userLocation?.lat, userLocation?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  function validatePhone(value: string) {
    if (value.length === 0) { setPhoneError(''); return }
    if (value.length !== 10 || !/^[6-9]/.test(value)) {
      setPhoneError('Enter a valid 10-digit Indian mobile number')
    } else { setPhoneError('') }
  }

  async function loadBranches(lat: number, lng: number, cartTotal = 0) {
    setLoadingBranches(true)
    try {
      const res = await branchApi.deliveryOptions(lat, lng, cartTotal)
      const list: NearbyBranch[] = res.data.branches
      setBranchList(list)
      if (!selectedBranchRef.current && list.length > 0) {
        const b = list[0]
        setSelectedBranch({
          branch_id: b.id, branch_name: b.name, branch_slug: b.slug,
          address: b.address, distance_km: b.distance_km,
          delivery_fee: b.delivery_fee, eta_minutes: b.eta_minutes,
          opening_time: b.opening_time, closing_time: b.closing_time,
          lat: b.lat ?? 0, lng: b.lng ?? 0, google_maps_url: b.google_maps_url ?? null,
        })
      }
    } catch { /* silent */ }
    finally { setLoadingBranches(false) }
  }

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/auth/login'); return }
    cartApi.get()
      .then((r) => {
        setCart(r.data)
        if (userLocation) loadBranches(userLocation.lat, userLocation.lng, r.data.total)
      })
      .catch(() => router.push('/cart'))
      .finally(() => setLoading(false))
    addressApi.list().then((r) => setSavedAddresses(r.data)).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function pickSavedAddress(saved: SavedAddress) {
    setAddress({
      name: saved.name,
      phone: saved.phone.replace(/\D/g, '').slice(-10),
      line1: [saved.address_line1, saved.address_line2].filter(Boolean).join(', '),
      city: saved.city,
      state: saved.state,
      pincode: saved.pincode,
    })
    setPhoneError('')
  }

  async function openStorePicker() {
    setShowStorePicker(v => {
      if (!v && userLocation && allBranches.length === 0) {
        // Load all branches on first open
        setLoadingAllBranches(true)
        branchApi.deliveryOptions(userLocation.lat, userLocation.lng, cart?.total ?? 0, true)
          .then(res => setAllBranches(res.data.branches))
          .catch(() => {})
          .finally(() => setLoadingAllBranches(false))
      }
      return !v
    })
  }

  // Pick a branch and recalculate distance/fee from user's location to that branch
  function pickBranch(b: NearbyBranch) {
    // b.distance_km and b.delivery_fee are already computed from user's location
    // by the delivery/options API — just update selectedBranch with the new store
    const branch: SelectedBranch = {
      branch_id: b.id, branch_name: b.name, branch_slug: b.slug,
      address: b.address, distance_km: b.distance_km,
      delivery_fee: b.delivery_fee, eta_minutes: b.eta_minutes,
      opening_time: b.opening_time, closing_time: b.closing_time,
      lat: b.lat ?? 0, lng: b.lng ?? 0, google_maps_url: b.google_maps_url ?? null,
    }
    setSelectedBranch(branch)
    setShowStorePicker(false)
  }

  async function placeOrder(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!userLocation) { setError('Please set your delivery location first.'); return }
    if (!selectedBranch) { setError('Please select a store to deliver from.'); return }
    if (!address.name.trim()) { setError('Please enter receiver name.'); return }
    if (address.phone.length !== 10 || phoneError) { setError('Please enter a valid 10-digit mobile number.'); return }
    if (!address.line1.trim()) { setError('Please enter your house/flat/street address.'); return }
    setError(''); setPlacing(true)

    const token = localStorage.getItem('token')
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/checkout/place`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          shipping_address: {
            name: address.name,
            phone: `+91${address.phone}`,
            line1: address.line1,
            city: address.city || userLocation.label || '',
            state: address.state || '',
            pincode: address.pincode || '',
            lat: userLocation.lat,
            lng: userLocation.lng,
          },
          billing_address: {
            name: address.name,
            phone: `+91${address.phone}`,
            line1: address.line1,
            city: address.city || userLocation.label || '',
            state: address.state || '',
            pincode: address.pincode || '',
          },
          payment_method: method,
          branch_id: selectedBranch.branch_id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Failed to place order')

      if (address.name.trim() && address.line1.trim()) {
        addressApi.create({
          label: null, name: address.name.trim(), phone: `+91${address.phone}`,
          address_line1: address.line1, address_line2: null,
          city: address.city || '', state: address.state || '', pincode: address.pincode || '',
          type: 'Home', is_default: false,
        }).catch(() => {})
      }

      if (method === 'razorpay') {
        const { id: orderId, razorpay_order_id, amount, currency } = data.data
        setPlacing(false)
        await new Promise<void>((resolve, reject) => {
          const rzp = new window.Razorpay({
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            amount, currency, order_id: razorpay_order_id,
            name: 'Hangout Cakes', description: 'Order payment',
            prefill: { name: address.name, contact: `+91${address.phone}` },
            theme: { color: '#e11d48' },
            handler: async (response: {
              razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string
            }) => {
              try {
                const vRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/payments/verify`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({
                    order_id: orderId,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                  }),
                })
                if (!vRes.ok) { reject(new Error((await vRes.json()).message ?? 'Verification failed')) }
                else { clearCart(); resolve(); router.push(`/orders/${orderId}`) }
              } catch (err) { reject(err) }
            },
            modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
          })
          rzp.open()
        })
      } else {
        clearCart()
        router.push(`/orders/${data.data.id}`)
      }
    } catch (err: unknown) {
      setError((err as Error).message)
      setPlacing(false)
    }
  }

  if (loading || !cart) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-400">Loading your cart…</div>
  }

  const deliveryFee = selectedBranch?.delivery_fee ?? 0
  const orderTotal = cart.total + deliveryFee
  const canPlaceOrder = !!userLocation && !!selectedBranch
    && address.name.trim().length > 0
    && address.phone.length === 10 && !phoneError
    && address.line1.trim().length > 0

  return (
    <>
    <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>

      <form onSubmit={placeOrder}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ─── Left column ─────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">

            {/* ── Step 1: Delivery Address (location + form combined) ── */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <StepBadge n={1} />
                <h2 className="font-semibold text-gray-900">Delivery Address</h2>
              </div>

              {/* Location pill — auto-detected or set via LocationBar */}
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50">
                <svg className={`w-4 h-4 flex-shrink-0 ${userLocation ? 'text-rose-500' : 'text-gray-400'}`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                </svg>
                <span className={`text-sm flex-1 ${userLocation ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
                  {userLocation?.label ?? 'Location not set — tap Change'}
                </span>
                <button type="button" onClick={openLocationBar}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex-shrink-0">
                  {userLocation ? 'Change' : 'Set location'}
                </button>
              </div>

              {/* Saved addresses — horizontal scroll chips */}
              {savedAddresses.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Quick fill from saved</p>
                  <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                    {savedAddresses.map((saved) => (
                      <button
                        key={saved.id}
                        type="button"
                        onClick={() => pickSavedAddress(saved)}
                        className="flex-shrink-0 text-left px-3 py-2 rounded-xl border border-gray-200 hover:border-rose-300 hover:bg-rose-50/40 transition-colors min-w-[150px]"
                      >
                        <p className="text-xs font-semibold text-gray-700">{saved.label || saved.type}</p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{saved.address_line1}</p>
                        <p className="text-xs text-gray-400">{saved.city}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Address fields — city auto-filled from location label */}
              <div className="space-y-3">
                <input
                  required
                  value={address.line1}
                  onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                  placeholder="House / Flat no., Building, Street, Landmark *"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <div className="grid grid-cols-3 gap-3">
                  <input
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    placeholder="City"
                    className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <input
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    placeholder="State"
                    className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <input
                    value={address.pincode}
                    onChange={(e) => setAddress({ ...address, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                    placeholder="Pincode"
                    inputMode="numeric"
                    className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="border-t border-gray-100" />

              {/* Receiver */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  required
                  value={address.name}
                  onChange={(e) => setAddress({ ...address, name: e.target.value })}
                  placeholder="Receiver's full name *"
                  className="border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <div>
                  <div className="flex">
                    <span className="flex items-center px-3 border border-r-0 border-gray-200 rounded-l-xl bg-gray-50 text-sm text-gray-500 select-none">
                      🇮🇳 +91
                    </span>
                    <input
                      required
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={address.phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                        setAddress({ ...address, phone: val })
                        validatePhone(val)
                      }}
                      placeholder="10-digit mobile *"
                      className={`flex-1 border rounded-r-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 ${phoneError ? 'border-red-400' : 'border-gray-200'}`}
                    />
                  </div>
                  {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
                </div>
              </div>
            </div>

            {/* ── Step 2: Delivering From ── */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <StepBadge n={2} />
                <h2 className="font-semibold text-gray-900">Delivering From</h2>
                {loadingBranches && (
                  <svg className="w-4 h-4 animate-spin text-gray-400 ml-1" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                )}
              </div>

              {!userLocation ? (
                <p className="text-sm text-gray-400 italic">Set delivery location above to see available stores.</p>
              ) : !loadingBranches && branchList.length === 0 && !selectedBranch ? (
                <div className="text-center py-3 space-y-2">
                  <p className="text-sm text-gray-500">We don&apos;t deliver to this area yet.</p>
                  <button type="button" onClick={openLocationBar}
                    className="text-sm font-semibold text-rose-600 hover:text-rose-700">
                    Change delivery area →
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Selected store card */}
                  {selectedBranch && (
                    <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                      <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-4 h-4 text-green-700" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-green-900">{selectedBranch.branch_name}</p>
                        <p className="text-xs text-green-700 mt-0.5">{selectedBranch.address}</p>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="text-xs font-medium text-green-800 bg-green-100 px-2 py-0.5 rounded-full">
                            {selectedBranch.distance_km} km{selectedBranch.eta_minutes != null ? ' by road' : ' (approx)'}
                          </span>
                          {selectedBranch.eta_minutes != null && (
                            <span className="text-xs font-medium text-green-800 bg-green-100 px-2 py-0.5 rounded-full">
                              ~{selectedBranch.eta_minutes} min
                            </span>
                          )}
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            selectedBranch.delivery_fee === 0
                              ? 'bg-green-200 text-green-800'
                              : 'bg-white text-green-800 border border-green-200'
                          }`}>
                            {selectedBranch.delivery_fee === 0 ? 'Free delivery' : `₹${selectedBranch.delivery_fee} delivery`}
                          </span>
                        </div>
                      </div>
                      <button type="button"
                        onClick={openStorePicker}
                        className="text-xs font-semibold text-green-700 hover:text-green-900 underline underline-offset-2 flex-shrink-0">
                        {showStorePicker ? 'Cancel' : 'Change store'}
                      </button>
                    </div>
                  )}

                  {/* Picker — expanded on demand or when no store selected */}
                  {(showStorePicker || !selectedBranch) && (
                    <div className="space-y-2">
                      {loadingAllBranches && (
                        <div className="flex items-center gap-2 py-3 text-xs text-gray-400">
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          Loading all stores…
                        </div>
                      )}
                      {/* Show all branches (within + outside radius) when picker is open */}
                      {(showStorePicker ? allBranches : branchList).map(b => {
                        const isSelected = selectedBranch?.branch_id === b.id
                        const outsideArea = b.within_radius === false
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => pickBranch(b)}
                            className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl border transition-all text-left ${
                              isSelected
                                ? 'border-rose-400 bg-rose-50 ring-1 ring-rose-300'
                                : outsideArea
                                ? 'border-gray-200 bg-gray-50 hover:border-rose-200'
                                : 'border-gray-200 hover:border-rose-200 hover:bg-rose-50/30'
                            }`}
                          >
                            {/* Radio */}
                            <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                              isSelected ? 'border-rose-500 bg-rose-500' : 'border-gray-300 bg-white'
                            }`}>
                              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className={`text-sm font-semibold ${isSelected ? 'text-rose-700' : 'text-gray-900'}`}>
                                  {b.name}
                                </p>
                                {outsideArea && (
                                  <span className="text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                                    Outside area
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5 truncate">{b.address}</p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-xs text-gray-500">
                                  {b.distance_km} km{b.is_estimated ? ' (approx)' : ' by road'}
                                </span>
                                {b.eta_minutes && <span className="text-xs text-gray-400">· ~{b.eta_minutes} min</span>}
                              </div>
                            </div>

                            {/* Fee */}
                            <div className="text-right flex-shrink-0">
                              {b.delivery_fee === 0
                                ? <p className="text-sm font-bold text-green-600">Free</p>
                                : <p className="text-sm font-bold text-gray-800">₹{b.delivery_fee}</p>
                              }
                              <p className="text-xs text-gray-400">delivery</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Step 3: Payment ── */}
            <div className="bg-white border border-gray-100 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <StepBadge n={3} />
                <h2 className="font-semibold text-gray-900">Payment</h2>
              </div>
              <div className="space-y-2">
                {([
                  { value: 'cod', label: 'Cash on Delivery', desc: 'Pay when your order arrives', icon: '💵' },
                  { value: 'razorpay', label: 'Pay Online', desc: 'Cards · UPI · Net Banking · Wallets', icon: '💳' },
                ] as const).map((opt) => (
                  <label key={opt.value}
                    className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                      method === opt.value
                        ? 'border-rose-400 bg-rose-50 ring-1 ring-rose-300'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input type="radio" name="payment" value={opt.value}
                      checked={method === opt.value} onChange={() => setMethod(opt.value)}
                      className="accent-rose-600" />
                    <span className="text-xl leading-none">{opt.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
                      <p className="text-xs text-gray-400">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

          </div>

          {/* ─── Right column — sticky summary ──────────────── */}
          <div>
            <div className="bg-white border border-gray-100 rounded-2xl p-5 sticky top-24 space-y-4">
              <h2 className="font-semibold text-gray-900">Order Summary</h2>

              {/* Store */}
              {selectedBranch ? (
                <div className="p-3 bg-green-50 border border-green-100 rounded-xl">
                  <p className="text-xs font-semibold text-green-800 truncate">{selectedBranch.branch_name}</p>
                  <p className="text-xs text-green-600 mt-0.5">
                    {selectedBranch.distance_km} km
                    {selectedBranch.eta_minutes != null && ` · ~${selectedBranch.eta_minutes} min`}
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700 font-medium">
                  No store selected yet
                </div>
              )}

              {/* Items */}
              <div className="space-y-1.5 text-sm text-gray-600">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex justify-between gap-2">
                    <span className="line-clamp-1 flex-1 text-xs">{item.product.name} ×{item.quantity}</span>
                    <span className="flex-shrink-0 text-xs">₹{item.subtotal.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-gray-100 pt-3 space-y-1.5">
                {cart.discount_amount > 0 && (
                  <div className="flex justify-between text-xs text-green-600">
                    <span>Discount</span><span>−₹{cart.discount_amount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Tax</span><span>₹{cart.tax_amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Delivery</span>
                  <span>
                    {selectedBranch
                      ? deliveryFee === 0
                        ? <span className="text-green-600 font-semibold">Free</span>
                        : `₹${deliveryFee}`
                      : <span className="text-gray-300 italic">—</span>
                    }
                  </span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span>₹{orderTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {error && (
                <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={placing || !canPlaceOrder}
                className="w-full bg-rose-600 text-white font-semibold py-3.5 rounded-full hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {placing
                  ? (method === 'razorpay' ? 'Opening Payment…' : 'Placing Order…')
                  : `Place Order · ₹${orderTotal.toLocaleString('en-IN')}`
                }
              </button>

              {!canPlaceOrder && (
                <p className="text-xs text-gray-400 text-center leading-relaxed">
                  {!userLocation ? '📍 Set delivery location'
                    : !selectedBranch ? '🏪 Select a store'
                    : !address.line1.trim() ? '🏠 Enter your address'
                    : '✏️ Fill in name & phone'}
                </p>
              )}
            </div>
          </div>

        </div>
      </form>
    </div>
    </>
  )
}
