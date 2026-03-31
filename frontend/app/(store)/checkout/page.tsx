'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Script from 'next/script'
import { cartApi } from '../../../lib/api/cart'
import { addressApi } from '../../../lib/api/profile'
import type { SavedAddress } from '../../../lib/api/profile'
import { useAuthStore } from '../../../lib/stores/authStore'
import { useCartStore } from '../../../lib/stores/cartStore'
import type { Cart } from '../../../lib/types'
import type { PickedAddress } from '../../../components/checkout/MapAddressPicker'

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: Record<string, unknown>) => { open(): void }
  }
}

const MapAddressPicker = dynamic(
  () => import('../../../components/checkout/MapAddressPicker'),
  { ssr: false, loading: () => <div className="h-64 rounded-xl bg-gray-100 animate-pulse" /> }
)

interface AddressState {
  name: string
  phone: string
  line1: string
  city: string
  state: string
  pincode: string
  lat: number | null
  lng: number | null
  type?: 'Home' | 'Work' | 'Other'
}

export default function CheckoutPage() {
  const { isAuthenticated, user } = useAuthStore()
  const { clearCart } = useCartStore()
  const router = useRouter()
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])

  // Pre-fill name from auth store; phone normalized to 10 digits
  const [address, setAddress] = useState<AddressState>({
    name: user?.name ?? '',
    phone: (user?.phone ?? '').replace(/\D/g, '').slice(-10),
    line1: '', city: '', state: '', pincode: '', lat: null, lng: null,
  })
  const [locationConfirmed, setLocationConfirmed] = useState(false)
  const [fromSavedAddress, setFromSavedAddress] = useState(false)
  const [saveToAccount, setSaveToAccount] = useState(true)
  const [phoneError, setPhoneError] = useState('')
  const [method, setMethod] = useState<'cod' | 'razorpay'>('cod')
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')

  function validatePhone(value: string) {
    if (value.length === 0) { setPhoneError(''); return }
    if (value.length !== 10 || !/^[6-9]/.test(value)) {
      setPhoneError('Enter a valid 10-digit Indian mobile number')
    } else {
      setPhoneError('')
    }
  }

  useEffect(() => {
    if (!isAuthenticated()) { router.push('/auth/login'); return }
    cartApi.get()
      .then((r) => setCart(r.data))
      .catch(() => router.push('/cart'))
      .finally(() => setLoading(false))
    addressApi.list().then((r) => setSavedAddresses(r.data)).catch(() => {})
  }, [])

  function pickSavedAddress(saved: SavedAddress) {
    const phone10 = saved.phone.replace(/\D/g, '').slice(-10)
    setAddress({
      name: saved.name,
      phone: phone10,
      line1: [saved.address_line1, saved.address_line2].filter(Boolean).join(', '),
      city: saved.city,
      state: saved.state,
      pincode: saved.pincode,
      lat: null,
      lng: null,
      type: (saved.type as 'Home' | 'Work' | 'Other') ?? 'Home',
    })
    setPhoneError('')
    setFromSavedAddress(true)
    setLocationConfirmed(true)
  }

  function handleMapConfirm(picked: PickedAddress) {
    setAddress((a) => ({
      ...a,
      line1: picked.line1,
      city: picked.city,
      state: picked.state,
      pincode: picked.pincode,
      lat: picked.lat,
      lng: picked.lng,
      type: picked.type,
    }))
    setFromSavedAddress(false)
    setLocationConfirmed(true)
  }

  async function placeOrder(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!locationConfirmed) { setError('Please confirm your delivery location on the map.'); return }
    if (!address.name.trim()) { setError('Please enter receiver name.'); return }
    if (address.phone.length !== 10 || phoneError) { setError('Please enter a valid 10-digit mobile number.'); return }
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
            city: address.city,
            state: address.state,
            pincode: address.pincode,
            lat: address.lat,
            lng: address.lng,
          },
          billing_address: {
            name: address.name,
            phone: `+91${address.phone}`,
            line1: address.line1,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
          },
          payment_method: method,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? 'Failed to place order')

      // Save address to account if requested
      if (saveToAccount && !fromSavedAddress && address.name.trim()) {
        addressApi.create({
          label: null,
          name: address.name.trim(),
          phone: `+91${address.phone}`,
          address_line1: address.line1 || 'N/A',
          address_line2: null,
          city: address.city || '',
          state: address.state || '',
          pincode: address.pincode || '',
          type: address.type ?? 'Home',
          is_default: false,
        }).catch(() => {})
      }

      if (method === 'razorpay') {
        const { id: orderId, razorpay_order_id, amount, currency } = data.data
        setPlacing(false) // unlock while modal is open

        await new Promise<void>((resolve, reject) => {
          const rzp = new window.Razorpay({
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            amount,
            currency,
            order_id: razorpay_order_id,
            name: 'Hangout Cakes',
            description: 'Order payment',
            prefill: {
              name: address.name,
              contact: `+91${address.phone}`,
            },
            theme: { color: '#e11d48' },
            handler: async (response: {
              razorpay_payment_id: string
              razorpay_order_id: string
              razorpay_signature: string
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
                if (!vRes.ok) {
                  const vData = await vRes.json()
                  reject(new Error(vData.message ?? 'Payment verification failed'))
                } else {
                  clearCart()
                  resolve()
                  router.push(`/orders/${orderId}`)
                }
              } catch (err) {
                reject(err)
              }
            },
            modal: {
              ondismiss: () => reject(new Error('Payment cancelled')),
            },
          })
          rzp.open()
        })
      } else {
        // COD
        clearCart()
        router.push(`/orders/${data.data.id}`)
      }
    } catch (err: unknown) {
      setError((err as Error).message)
      setPlacing(false)
    }
  }

  if (loading || !cart) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-gray-400">Loading...</div>
  }

  const canPlaceOrder = locationConfirmed && address.name.trim().length > 0 && address.phone.length === 10 && !phoneError

  return (
    <>
    <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>
      <form onSubmit={placeOrder}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Saved addresses quick-pick — hide once location is confirmed */}
            {savedAddresses.length > 0 && !locationConfirmed && (
              <div className="bg-white border border-gray-100 rounded-xl p-5">
                <h2 className="font-semibold text-gray-900 mb-3">Saved Addresses</h2>
                <div className="space-y-2">
                  {savedAddresses.map((saved) => (
                    <button
                      key={saved.id}
                      type="button"
                      onClick={() => pickSavedAddress(saved)}
                      className="w-full text-left flex items-start gap-3 p-3 rounded-xl border border-gray-200 hover:border-rose-300 hover:bg-rose-50/40 transition-colors"
                    >
                      <svg className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                      </svg>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-gray-700">{saved.label || saved.type}</span>
                          {saved.is_default && <span className="text-xs text-rose-600 font-medium">Default</span>}
                        </div>
                        <p className="text-sm text-gray-600 truncate mt-0.5">
                          {saved.address_line1}, {saved.city} — {saved.pincode}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{saved.name} · {saved.phone}</p>
                      </div>
                      <svg className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                      </svg>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 text-center mt-3">— or pick on map below —</p>
              </div>
            )}

            {/* Step 1 — Delivery location + Contact */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-5">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-rose-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
                <h2 className="font-semibold text-gray-900">Delivery Location & Contact</h2>
                {locationConfirmed && (
                  <span className="ml-auto text-xs text-green-600 font-medium flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                    Location set
                  </span>
                )}
              </div>

              {/* Map picker — hidden once location is confirmed to avoid sync confusion */}
              {!locationConfirmed && (
                <MapAddressPicker
                  onConfirm={handleMapConfirm}
                  confirmLabel="Confirm delivery location"
                  initial={address.lat ? { ...address, lat: address.lat!, lng: address.lng! } : undefined}
                />
              )}

              {/* Confirmed address summary — replaces map when location is set */}
              {locationConfirmed && (
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                    <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-rose-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 leading-snug">
                        {address.line1 || 'Selected location'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {[address.city, address.state, address.pincode].filter(Boolean).join(', ')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setLocationConfirmed(false); setFromSavedAddress(false) }}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex-shrink-0 mt-1"
                    >
                      Change
                    </button>
                  </div>

                  {/* Save to account — only for new map addresses */}
                  {!fromSavedAddress && (
                    <label className="flex items-center gap-2.5 px-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={saveToAccount}
                        onChange={(e) => setSaveToAccount(e.target.checked)}
                        className="w-4 h-4 accent-rose-600"
                      />
                      <span className="text-sm text-gray-600">Save this address to my account</span>
                    </label>
                  )}
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* Contact details — always visible, pre-filled from profile */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Receiver details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      required
                      value={address.name}
                      onChange={(e) => setAddress({ ...address, name: e.target.value })}
                      placeholder="Receiver's full name"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                    <div className="flex">
                      <span className="flex items-center px-3 border border-r-0 border-gray-200 rounded-l-xl bg-gray-50 text-sm text-gray-600 select-none whitespace-nowrap">
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
                        placeholder="10-digit mobile"
                        className={`flex-1 border rounded-r-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 ${phoneError ? 'border-red-400' : 'border-gray-200'}`}
                      />
                    </div>
                    {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 — Payment */}
            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-rose-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
                <h2 className="font-semibold text-gray-900">Payment Method</h2>
              </div>
              <div className="space-y-3">
                {([
                  { value: 'cod', label: 'Cash on Delivery', desc: 'Pay when your order arrives' },
                  { value: 'razorpay', label: 'Pay Online (Razorpay)', desc: 'Cards, UPI, Net Banking, Wallets' },
                ] as const).map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${method === opt.value ? 'border-rose-400 bg-rose-50' : 'border-gray-200 hover:bg-gray-50'}`}
                  >
                    <input type="radio" name="payment" value={opt.value} checked={method === opt.value}
                      onChange={() => setMethod(opt.value)} className="mt-0.5 accent-rose-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                      <p className="text-xs text-gray-400">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right column — Order summary */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-100 rounded-xl p-5 sticky top-24">
              <h2 className="font-semibold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-2 text-sm text-gray-600">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span className="line-clamp-1 flex-1 mr-2">{item.product.name} ×{item.quantity}</span>
                    <span className="flex-shrink-0">₹{item.subtotal.toLocaleString('en-IN')}</span>
                  </div>
                ))}
                <div className="border-t border-gray-100 pt-2 mt-2 space-y-1">
                  {cart.discount_amount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>−₹{cart.discount_amount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between"><span>Tax</span><span>₹{cart.tax_amount.toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between font-bold text-gray-900 text-base pt-1">
                    <span>Total</span>
                    <span>₹{cart.total.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={placing || !canPlaceOrder}
                className="mt-4 w-full bg-rose-600 text-white font-semibold py-3 rounded-full hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {placing
                  ? (method === 'razorpay' ? 'Opening Payment...' : 'Placing Order...')
                  : `Place Order · ₹${cart.total.toLocaleString('en-IN')}`}
              </button>

              {!canPlaceOrder && (
                <p className="text-xs text-gray-400 text-center mt-2">
                  {!locationConfirmed ? 'Confirm delivery location to continue' : 'Fill in receiver name & phone'}
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
