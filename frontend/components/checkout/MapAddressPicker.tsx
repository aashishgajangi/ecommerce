'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'

export interface PickedAddress {
  line1: string
  area: string
  city: string
  state: string
  pincode: string
  lat: number
  lng: number
  type: 'Home' | 'Work' | 'Other'
}

interface Props {
  onConfirm: (address: PickedAddress) => void
  initial?: Partial<PickedAddress>
  confirmLabel?: string
}

interface MapGeoResult {
  area: string
  city: string
  state: string
  pincode: string
  fullLabel: string
}

const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 }
const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!

function parseGeoResult(result: google.maps.GeocoderResult): MapGeoResult {
  const get = (type: string) =>
    result.address_components.find((c) => c.types.includes(type))?.long_name ?? ''
  const sublocality = get('sublocality_level_1') || get('sublocality') || get('neighborhood')
  const locality = get('locality')
  const admin2 = get('administrative_area_level_2')
  const admin1 = get('administrative_area_level_1')
  const postal = get('postal_code')
  const route = get('route')
  const streetNum = get('street_number')
  const areaParts = [streetNum && route ? `${streetNum} ${route}` : (route || ''), sublocality, locality || admin2].filter(Boolean)
  const area = areaParts.slice(0, 2).join(', ')
  return {
    area: area || result.formatted_address.split(',').slice(0, 2).join(',').trim(),
    city: locality || admin2,
    state: admin1,
    pincode: postal,
    fullLabel: result.formatted_address,
  }
}

// Google Geolocation API — works via IP/WiFi/cell even without GPS
async function googleGeolocate(): Promise<{ lat: number; lng: number }> {
  const res = await fetch(
    `https://www.googleapis.com/geolocation/v1/geolocate?key=${MAPS_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }
  )
  if (!res.ok) throw new Error('Google geolocation failed')
  const data = await res.json() as { location: { lat: number; lng: number } }
  return data.location
}

// Browser geolocation wrapped as a Promise
function browserGeolocate(options: PositionOptions): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('unavailable')); return }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
      reject,
      options
    )
  })
}

export default function MapAddressPicker({ onConfirm, initial, confirmLabel = 'Confirm location' }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const geocoderRef = useRef<google.maps.Geocoder | null>(null)
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingCenterRef = useRef<{ lat: number; lng: number } | null>(null)

  const [loaded, setLoaded] = useState(false)
  const [autoLocating, setAutoLocating] = useState(false)
  const [locating, setLocating] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [geoError, setGeoError] = useState('')
  const [geoInfo, setGeoInfo] = useState('')  // non-error info (e.g. IP-based notice)

  const [mapGeo, setMapGeo] = useState<MapGeoResult | null>(null)
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(
    initial?.lat ? { lat: initial.lat, lng: initial.lng! } : null
  )
  const [details, setDetails] = useState(initial?.line1 ?? '')
  const [addressType, setAddressType] = useState<'Home' | 'Work' | 'Other'>(initial?.type ?? 'Home')

  // Apply a position to the map (or cache as pending if map not yet initialised)
  function applyPosition(lat: number, lng: number, zoom = 17) {
    pendingCenterRef.current = { lat, lng }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat, lng })
      mapInstanceRef.current.setZoom(zoom)
    }
  }

  const reverseGeocode = useCallback(async (latLng: google.maps.LatLng) => {
    if (!geocoderRef.current) return
    try {
      const { results } = await geocoderRef.current.geocode({ location: latLng })
      if (results?.[0]) {
        setMapGeo(parseGeoResult(results[0]))
        setCenter({ lat: latLng.lat(), lng: latLng.lng() })
      }
    } catch {
      setCenter({ lat: latLng.lat(), lng: latLng.lng() })
    }
  }, [])

  // ── Auto-detect on mount ────────────────────────────────────────────────
  // Chain: localStorage cache (instant) → browser GPS → Google IP geo
  useEffect(() => {
    if (initial?.lat) return

    // 1. Instant: use localStorage cache
    let hasCached = false
    try {
      const stored = localStorage.getItem('hc_last_location')
      if (stored) {
        const { lat, lng } = JSON.parse(stored) as { lat: number; lng: number }
        applyPosition(lat, lng)
        hasCached = true
      }
    } catch { /* ignore */ }

    if (!hasCached) setAutoLocating(true)

    // 2. Background: try browser GPS first, then Google IP
    ;(async () => {
      try {
        // 2a. Browser GPS (accepts cached position up to 5 min)
        const pos = await browserGeolocate({ timeout: 8000, maximumAge: 300000, enableHighAccuracy: false })
        try { localStorage.setItem('hc_last_location', JSON.stringify(pos)) } catch { /* ignore */ }
        applyPosition(pos.lat, pos.lng, 17)
      } catch {
        // 2b. Google Geolocation API (IP/WiFi-based, any device)
        try {
          const pos = await googleGeolocate()
          try { localStorage.setItem('hc_last_location', JSON.stringify(pos)) } catch { /* ignore */ }
          applyPosition(pos.lat, pos.lng, 13) // city-level zoom for IP
        } catch { /* silent — map stays at India center */ }
      } finally {
        setAutoLocating(false)
      }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load Google Maps API ────────────────────────────────────────────────
  useEffect(() => {
    setOptions({ key: MAPS_KEY, v: 'weekly' })
    Promise.all([importLibrary('maps'), importLibrary('places'), importLibrary('geocoding')])
      .then(() => setLoaded(true))
      .catch(console.error)
  }, [])

  // ── Init map ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loaded || !mapRef.current) return

    const pending = pendingCenterRef.current
    const startCenter = initial?.lat ? { lat: initial.lat!, lng: initial.lng! } : pending ?? INDIA_CENTER
    const startZoom = (initial?.lat || pending) ? 17 : 5

    const map = new google.maps.Map(mapRef.current, {
      center: startCenter,
      zoom: startZoom,
      disableDefaultUI: true,
      zoomControl: true,
      zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
      gestureHandling: 'greedy',
      clickableIcons: false,
      styles: [
        { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      ],
    })
    mapInstanceRef.current = map
    geocoderRef.current = new google.maps.Geocoder()

    if (pending && !initial?.lat) { map.setCenter(pending); map.setZoom(17) }

    map.addListener('dragstart', () => setIsDragging(true))
    map.addListener('idle', () => {
      setIsDragging(false)
      const c = map.getCenter()
      if (!c) return
      if (geocodeTimer.current) clearTimeout(geocodeTimer.current)
      geocodeTimer.current = setTimeout(() => reverseGeocode(c), 600)
    })

    if (searchRef.current) {
      const ac = new google.maps.places.Autocomplete(searchRef.current, {
        componentRestrictions: { country: 'in' },
        fields: ['geometry', 'address_components', 'formatted_address'],
      })
      ac.addListener('place_changed', () => {
        const place = ac.getPlace()
        if (!place.geometry?.location) return
        map.panTo(place.geometry.location)
        map.setZoom(17)
      })
    }

    if (initial?.lat) reverseGeocode(new google.maps.LatLng(initial.lat!, initial.lng!))

    return () => { if (geocodeTimer.current) clearTimeout(geocodeTimer.current) }
  }, [loaded]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Use current location button ─────────────────────────────────────────
  // Chain: localStorage cache → browser GPS → Google IP geo → error
  async function locateMe() {
    if (!mapInstanceRef.current) return
    setLocating(true)
    setGeoError('')
    setGeoInfo('')

    // Try 0: use already-detected location from localStorage (instant)
    try {
      const stored = localStorage.getItem('hc_last_location')
      if (stored) {
        const pos = JSON.parse(stored) as { lat: number; lng: number }
        mapInstanceRef.current.panTo(pos)
        mapInstanceRef.current.setZoom(17)
        setLocating(false)
        return
      }
    } catch { /* ignore */ }

    // Try 1: browser GPS (accept cached up to 60s)
    try {
      const pos = await browserGeolocate({ timeout: 10000, maximumAge: 60000, enableHighAccuracy: false })
      try { localStorage.setItem('hc_last_location', JSON.stringify(pos)) } catch { /* ignore */ }
      mapInstanceRef.current.panTo(pos)
      mapInstanceRef.current.setZoom(17)
      setLocating(false)
      return
    } catch { /* fall through to Google API */ }

    // Try 2: Google Geolocation API (IP/WiFi-based, any device)
    try {
      const pos = await googleGeolocate()
      try { localStorage.setItem('hc_last_location', JSON.stringify(pos)) } catch { /* ignore */ }
      mapInstanceRef.current.panTo(pos)
      mapInstanceRef.current.setZoom(13)
      setGeoInfo('Approximate location detected. Move the pin to your exact delivery spot.')
      setLocating(false)
      return
    } catch { /* fall through */ }

    // All failed
    setGeoError('Could not detect your location. Please search for your area above.')
    setLocating(false)
  }

  function handleConfirm() {
    if (!center) return
    onConfirm({
      line1: details ? (mapGeo ? `${details}, ${mapGeo.area}` : details) : (mapGeo?.area ?? ''),
      area: mapGeo?.area ?? '',
      city: mapGeo?.city ?? '',
      state: mapGeo?.state ?? '',
      pincode: mapGeo?.pincode ?? '',
      lat: center.lat,
      lng: center.lng,
      type: addressType,
    })
  }

  const canConfirm = !!center

  return (
    <div className="flex flex-col gap-3">
      {/* Search bar */}
      <div className="relative">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={searchRef}
          type="text"
          placeholder="Search for area, street name..."
          className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white shadow-sm"
        />
      </div>

      {/* Use current location */}
      <button
        type="button"
        onClick={locateMe}
        disabled={locating || !loaded}
        className="flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-2xl bg-white hover:bg-rose-50 hover:border-rose-200 transition-colors disabled:opacity-50 text-left shadow-sm"
      >
        <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
          {locating || autoLocating ? (
            <svg className="w-4 h-4 animate-spin text-rose-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          ) : (
            <svg className="w-4 h-4 text-rose-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-rose-600">
            {autoLocating ? 'Detecting your location...' : locating ? 'Locating...' : 'Use current location'}
          </p>
          <p className="text-xs text-gray-400">GPS · WiFi · Network</p>
        </div>
        <svg className="w-4 h-4 text-gray-300 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {geoError && <p className="text-xs text-red-500 px-1">{geoError}</p>}
      {geoInfo && !geoError && (
        <p className="text-xs text-amber-600 px-1 flex items-center gap-1">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
          </svg>
          {geoInfo}
        </p>
      )}

      {/* Map */}
      <div className="relative rounded-2xl overflow-hidden shadow-sm border border-gray-100" style={{ height: 280 }}>
        {!loaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10 gap-2">
            <svg className="w-7 h-7 animate-spin text-rose-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            <p className="text-xs text-gray-400">Loading map...</p>
          </div>
        )}
        <div ref={mapRef} className="w-full h-full" />

        {loaded && !isDragging && mapGeo && (
          <div className="pointer-events-none absolute left-1/2 -translate-x-1/2" style={{ top: '28%' }}>
            <div className="flex flex-col items-center">
              <div className="bg-gray-900/90 text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                Move pin to your exact delivery location
              </div>
              <div className="w-2 h-2 bg-gray-900/90 rotate-45 -mt-1" />
            </div>
          </div>
        )}

        {/* Crosshair pin */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center" style={{ marginTop: -20 }}>
            <svg width="36" height="44" viewBox="0 0 36 44" fill="none"
              className={isDragging ? 'scale-110 transition-transform' : 'transition-transform'}>
              <path d="M18 0C8.059 0 0 8.059 0 18c0 11.775 18 26 18 26S36 29.775 36 18C36 8.059 27.941 0 18 0z" fill="#e11d48"/>
              <circle cx="18" cy="18" r="8" fill="white"/>
              <circle cx="18" cy="18" r="4" fill="#e11d48"/>
            </svg>
            <div className={`w-3 h-1 rounded-full bg-black/20 blur-sm transition-all ${isDragging ? 'w-5 opacity-50' : 'opacity-30'}`} />
          </div>
        </div>
      </div>

      {/* Detected address card */}
      {mapGeo && (
        <div className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-2xl p-3.5">
          <svg className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
          </svg>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm leading-snug">{mapGeo.area || mapGeo.fullLabel.split(',')[0]}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {[mapGeo.city, mapGeo.state, mapGeo.pincode].filter(Boolean).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Flat / House / Floor */}
      <div>
        <input
          type="text"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Address details (Flat no., Floor, Landmark)"
          className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white"
        />
        <p className="text-xs text-gray-400 mt-1 ml-1">E.g. Flat 4B, 2nd Floor, Near Water Tank</p>
      </div>

      {/* Address type chips */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Save address as</p>
        <div className="flex gap-2">
          {(['Home', 'Work', 'Other'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setAddressType(t)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                addressType === t ? 'bg-rose-50 border-rose-400 text-rose-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              {t === 'Home' && <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>}
              {t === 'Work' && <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
              {t === 'Other' && <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>}
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Confirm button */}
      <button
        type="button"
        disabled={!canConfirm}
        onClick={handleConfirm}
        className="w-full bg-rose-600 text-white text-sm font-bold py-3.5 rounded-2xl hover:bg-rose-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
      >
        {canConfirm ? confirmLabel : 'Waiting for location...'}
      </button>
    </div>
  )
}
