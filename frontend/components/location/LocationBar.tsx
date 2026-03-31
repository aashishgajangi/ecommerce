'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { MapPin, ChevronDown, Navigation, Loader2, X, Store, Check } from 'lucide-react'
import { useLocationStore } from '../../lib/stores/locationStore'
import { branchApi } from '../../lib/api/branches'
import type { SelectedBranch } from '../../lib/stores/locationStore'
import type { NearbyBranch } from '../../lib/types'

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!

async function ipGeolocate(): Promise<{ lat: number; lng: number }> {
  const res = await fetch(
    `https://www.googleapis.com/geolocation/v1/geolocate?key=${MAPS_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }
  )
  if (!res.ok) throw new Error('failed')
  const d = await res.json() as { location: { lat: number; lng: number } }
  return d.location
}

function browserGPS(): Promise<{ lat: number; lng: number }> {
  return new Promise((res, rej) => {
    if (!navigator.geolocation) { rej(new Error('unavailable')); return }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => res({ lat: coords.latitude, lng: coords.longitude }),
      rej,
      { timeout: 8000, maximumAge: 60000 }
    )
  })
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const geocoder = new google.maps.Geocoder()
    const { results } = await geocoder.geocode({ location: { lat, lng } })
    if (!results?.[0]) return `${lat.toFixed(3)}, ${lng.toFixed(3)}`
    const comps = results[0].address_components
    const get = (type: string) => comps.find(c => c.types.includes(type))?.long_name ?? ''
    const sub = get('sublocality_level_1') || get('sublocality') || get('neighborhood')
    const city = get('locality') || get('administrative_area_level_2')
    return [sub, city].filter(Boolean).join(', ') || results[0].formatted_address.split(',')[0]
  } catch {
    return `${lat.toFixed(3)}, ${lng.toFixed(3)}`
  }
}

export default function LocationBar() {
  const {
    userLocation, selectedBranch,
    setUserLocation, setSelectedBranch, clearLocation,
    locationBarOpen, closeLocationBar,
  } = useLocationStore()

  const [open, setOpen] = useState(false)
  const [mapsLoaded, setMapsLoaded] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [error, setError] = useState('')
  const [branches, setBranches] = useState<NearbyBranch[]>([])
  const [loadingBranches, setLoadingBranches] = useState(false)

  const searchRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load Google Maps Places + Geocoding libraries
  useEffect(() => {
    setOptions({ key: MAPS_KEY, v: 'weekly' })
    importLibrary('places').then(() => setMapsLoaded(true)).catch(() => {})
  }, [])

  // External trigger — checkout/other pages can call openLocationBar()
  useEffect(() => {
    if (locationBarOpen) {
      setOpen(true)
      closeLocationBar()
      // Scroll to top so bar is visible
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [locationBarOpen, closeLocationBar])

  // Track which origin the branches were last loaded for
  const branchesOriginRef = useRef<string | null>(null)

  // Load nearby branches when dropdown opens (reload if location changed)
  useEffect(() => {
    if (!open || !userLocation) return
    const originKey = `${userLocation.lat.toFixed(3)},${userLocation.lng.toFixed(3)}`
    if (branchesOriginRef.current === originKey && branches.length > 0) return // already fresh
    branchesOriginRef.current = originKey
    setLoadingBranches(true)
    branchApi.deliveryOptions(userLocation.lat, userLocation.lng)
      .then(res => setBranches(res.data.branches))
      .catch(() => {})
      .finally(() => setLoadingBranches(false))
  }, [open, userLocation?.lat, userLocation?.lng]) // eslint-disable-line react-hooks/exhaustive-deps

  // Attach Places Autocomplete when dropdown opens
  useEffect(() => {
    if (!open || !mapsLoaded || !searchRef.current) return
    setTimeout(() => searchRef.current?.focus(), 50)

    const ac = new google.maps.places.Autocomplete(searchRef.current!, {
      componentRestrictions: { country: 'in' },
      fields: ['geometry', 'formatted_address', 'address_components'],
    })
    ac.addListener('place_changed', async () => {
      const place = ac.getPlace()
      if (!place.geometry?.location) return
      const lat = place.geometry.location.lat()
      const lng = place.geometry.location.lng()
      const comps = place.address_components ?? []
      const get = (type: string) => comps.find((c: google.maps.GeocoderAddressComponent) => c.types.includes(type))?.long_name ?? ''
      const sub = get('sublocality_level_1') || get('sublocality') || get('neighborhood')
      const city = get('locality') || get('administrative_area_level_2')
      const label = [sub, city].filter(Boolean).join(', ') || (place.formatted_address ?? '')
      setUserLocation({ lat, lng, label })
      setBranches([]) // reset so they reload for new location
      // Load branches first, then close (keeps dropdown open during loading)
      await loadAndSelectBranch(lat, lng)
      setOpen(false)
    })
    return () => google.maps.event.clearInstanceListeners(ac)
  }, [open, mapsLoaded]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click — but NOT when clicking Google's autocomplete suggestions
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Google Places renders .pac-container outside our dropdown; ignore those clicks
      if (target.closest?.('.pac-container')) return
      if (dropdownRef.current && !dropdownRef.current.contains(target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  /** Fetch delivery options and auto-select nearest branch */
  const loadAndSelectBranch = useCallback(async (lat: number, lng: number) => {
    setLoadingBranches(true)
    try {
      const res = await branchApi.deliveryOptions(lat, lng)
      const list: NearbyBranch[] = res.data.branches
      setBranches(list)
      if (list.length === 0) return
      // Auto-select nearest
      const nearest = list[0]
      const branch: SelectedBranch = {
        branch_id:       nearest.id,
        branch_name:     nearest.name,
        branch_slug:     nearest.slug,
        address:         nearest.address,
        distance_km:     nearest.distance_km,
        delivery_fee:    nearest.delivery_fee,
        eta_minutes:     nearest.eta_minutes,
        opening_time:    nearest.opening_time,
        closing_time:    nearest.closing_time,
        lat:             nearest.lat ?? 0,
        lng:             nearest.lng ?? 0,
        google_maps_url: nearest.google_maps_url ?? null,
      }
      setSelectedBranch(branch)
    } catch { /* silent */ }
    finally { setLoadingBranches(false) }
  }, [setSelectedBranch])

  /** Manually select a specific branch */
  const pickBranch = useCallback((b: NearbyBranch) => {
    const branch: SelectedBranch = {
      branch_id:       b.id,
      branch_name:     b.name,
      branch_slug:     b.slug,
      address:         b.address,
      distance_km:     b.distance_km,
      delivery_fee:    b.delivery_fee,
      eta_minutes:     b.eta_minutes,
      opening_time:    b.opening_time,
      closing_time:    b.closing_time,
      lat:             b.lat ?? 0,
      lng:             b.lng ?? 0,
      google_maps_url: b.google_maps_url ?? null,
    }
    setSelectedBranch(branch)
    setOpen(false)
  }, [setSelectedBranch])

  const detectGPS = useCallback(async () => {
    setDetecting(true)
    setError('')
    try {
      let pos: { lat: number; lng: number }
      try { pos = await browserGPS() } catch { pos = await ipGeolocate() }
      const label = mapsLoaded ? await reverseGeocode(pos.lat, pos.lng) : `${pos.lat.toFixed(3)}, ${pos.lng.toFixed(3)}`
      setUserLocation({ ...pos, label })
      setBranches([]) // reset so they reload for new location
      await loadAndSelectBranch(pos.lat, pos.lng)
      setOpen(false)
    } catch {
      setError('Could not detect location. Try searching above.')
    } finally {
      setDetecting(false)
    }
  }, [mapsLoaded, setUserLocation, loadAndSelectBranch])

  const areaLabel = userLocation?.label ?? null

  return (
    <div className="bg-gray-50 border-b border-gray-100 z-40">
      {/* Inner container is the positioning context — constrained to content width */}
      <div className="relative max-w-7xl mx-auto" ref={dropdownRef}>
      {/* Bar */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-4 sm:px-6 lg:px-8 py-2 text-left hover:bg-gray-100 transition-colors"
      >
        <MapPin size={14} className={`flex-shrink-0 ${areaLabel ? 'text-rose-500' : 'text-gray-400'}`} />
        <span className="text-xs text-gray-500 flex-shrink-0">Deliver to</span>
        <span className={`text-xs font-semibold truncate ${areaLabel ? 'text-gray-900' : 'text-rose-600'}`}>
          {areaLabel ?? 'Set your location'}
        </span>
        {selectedBranch && (
          <>
            <span className="text-gray-300 hidden sm:inline flex-shrink-0">·</span>
            <span className="text-xs text-gray-500 hidden sm:flex items-center gap-1 flex-shrink-0">
              <Store size={11} />
              {selectedBranch.branch_name}
              {selectedBranch.delivery_fee === 0
                ? <span className="text-green-600 font-medium ml-1">Free delivery</span>
                : <span className="ml-1">₹{selectedBranch.delivery_fee} delivery</span>
              }
            </span>
          </>
        )}
        <ChevronDown size={13} className={`ml-auto flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown — anchored to content column, not viewport edge */}
      {open && (
        <div className="absolute top-full left-4 sm:left-6 lg:left-8 w-[380px] max-w-[calc(100vw-2rem)] bg-white border border-gray-200 shadow-xl z-50 rounded-2xl mt-1">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">Delivery location &amp; store</span>
            <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>

          <div className="p-4 space-y-3 max-h-[80vh] overflow-y-auto">
            {/* Search input */}
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search area, street, locality…"
                className="w-full pl-8 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            {/* GPS button */}
            <button
              type="button"
              onClick={detectGPS}
              disabled={detecting}
              className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-xl hover:bg-rose-50 hover:border-rose-200 transition-colors disabled:opacity-50"
            >
              <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                {detecting ? <Loader2 size={14} className="animate-spin text-rose-600" /> : <Navigation size={14} className="text-rose-600" />}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-rose-600">{detecting ? 'Detecting…' : 'Use current location'}</p>
                <p className="text-xs text-gray-400">GPS · WiFi · Network</p>
              </div>
            </button>

            {error && <p className="text-xs text-red-500 px-1">{error}</p>}

            {/* Nearby stores */}
            {userLocation && (
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {loadingBranches ? 'Finding stores…' : branches.length > 0 ? 'Available stores near you' : 'No stores in your area'}
                </p>

                {loadingBranches && (
                  <div className="flex items-center gap-2 py-3 text-xs text-gray-400">
                    <Loader2 size={13} className="animate-spin" /> Checking nearby stores…
                  </div>
                )}

                {!loadingBranches && branches.length === 0 && (
                  <p className="text-xs text-gray-400 pb-1">
                    We currently don&apos;t deliver to this area. Try a different location.
                  </p>
                )}

                {branches.map(b => {
                  const isSelected = selectedBranch?.branch_id === b.id
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => pickBranch(b)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border mb-2 text-left transition-colors ${
                        isSelected
                          ? 'border-rose-400 bg-rose-50'
                          : 'border-gray-200 hover:border-rose-200 hover:bg-rose-50/50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-rose-100' : 'bg-gray-100'}`}>
                        <Store size={14} className={isSelected ? 'text-rose-600' : 'text-gray-500'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${isSelected ? 'text-rose-700' : 'text-gray-900'}`}>{b.name}</p>
                        <p className="text-xs text-gray-500 truncate">{b.address}</p>
                      </div>
                      <div className="text-right flex-shrink-0 space-y-0.5">
                        <p className="text-xs text-gray-600">{b.distance_km} km{b.is_estimated ? ' (approx)' : ' by road'}</p>
                        {b.delivery_fee === 0
                          ? <p className="text-xs text-green-600 font-medium">Free delivery</p>
                          : <p className="text-xs text-gray-500">₹{b.delivery_fee} delivery</p>
                        }
                        {b.eta_minutes && <p className="text-xs text-gray-400">~{b.eta_minutes} min</p>}
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center flex-shrink-0">
                          <Check size={11} className="text-white" />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Clear */}
            {userLocation && (
              <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                <span className="text-xs text-gray-400">
                  {userLocation.label ?? 'Detected location'}
                </span>
                <button
                  type="button"
                  onClick={() => { clearLocation(); setBranches([]); setOpen(false) }}
                  className="text-xs text-red-400 hover:text-red-600 ml-2 flex-shrink-0"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      </div>{/* end max-w-7xl positioning context */}
    </div>
  )
}
