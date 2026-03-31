'use client'

import { useState, useCallback, useEffect } from 'react'
import { importLibrary } from '@googlemaps/js-api-loader'
import { MapPin, Loader2, CheckCircle2, Clock, Truck, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import { branchApi } from '../../lib/api/branches'
import { useLocationStore, type SelectedBranch } from '../../lib/stores/locationStore'
import type { NearbyBranch } from '../../lib/types'

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!

async function getLocation(): Promise<{ lat: number; lng: number }> {
  // Try browser GPS first (fast if already cached), then Google IP geolocation
  const gps = (): Promise<{ lat: number; lng: number }> =>
    new Promise((res, rej) => {
      if (!navigator.geolocation) { rej(new Error('unavailable')); return }
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => res({ lat: coords.latitude, lng: coords.longitude }),
        rej,
        { timeout: 5000, maximumAge: 300000 }
      )
    })

  try { return await gps() } catch { /* fall through */ }

  // Google IP/WiFi geolocation — no GPS permission required
  const res = await fetch(
    `https://www.googleapis.com/geolocation/v1/geolocate?key=${MAPS_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }
  )
  if (!res.ok) throw new Error('Geolocation failed')
  const data = await res.json() as { location: { lat: number; lng: number } }
  return data.location
}

interface Props {
  orderTotal?: number
  /** Pass confirmed delivery address coords to refine branch after map pick */
  refinedCoords?: { lat: number; lng: number } | null
  onBranchSelected?: (branch: SelectedBranch) => void
}

export default function DeliveryOptions({ orderTotal, refinedCoords, onBranchSelected }: Props) {
  const { userLocation, selectedBranch, setUserLocation, setSelectedBranch } = useLocationStore()

  const [loading, setLoading] = useState(false)
  const [branches, setBranches] = useState<NearbyBranch[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  const fetchAndAutoSelect = useCallback(async (lat: number, lng: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await branchApi.deliveryOptions(lat, lng, orderTotal)
      const list = res.data.branches
      setBranches(list)

      if (list.length === 0) {
        setError("No stores deliver to this area yet.")
        return
      }

      // Auto-select the nearest branch (list is already sorted by distance)
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
      onBranchSelected?.(branch)
    } catch {
      setError('Could not load delivery options. Tap refresh to try again.')
    } finally {
      setLoading(false)
    }
  }, [orderTotal, setSelectedBranch, onBranchSelected])

  // Auto-detect and load on mount
  useEffect(() => {
    const run = async () => {
      try {
        // If we already have saved coordinates, use them immediately
        if (userLocation) {
          await fetchAndAutoSelect(userLocation.lat, userLocation.lng)
          return
        }
        const pos = await getLocation()
        setUserLocation(pos)
        await fetchAndAutoSelect(pos.lat, pos.lng)
      } catch {
        setError('Could not detect your location. Tap refresh to try again.')
      }
    }
    run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-run when confirmed delivery address coordinates come in from MapAddressPicker
  useEffect(() => {
    if (!refinedCoords) return
    setUserLocation(refinedCoords)
    fetchAndAutoSelect(refinedCoords.lat, refinedCoords.lng)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refinedCoords?.lat, refinedCoords?.lng])

  const manualSelect = useCallback((b: NearbyBranch) => {
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
    onBranchSelected?.(branch)
    setShowAll(false)
  }, [setSelectedBranch, onBranchSelected])

  const retry = useCallback(async () => {
    try {
      const pos = await getLocation()
      setUserLocation(pos)
      await fetchAndAutoSelect(pos.lat, pos.lng)
    } catch {
      setError('Still could not detect location.')
    }
  }, [fetchAndAutoSelect, setUserLocation])

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
        <Loader2 size={16} className="animate-spin text-rose-500 flex-shrink-0" />
        <span className="text-sm text-gray-500">Finding nearest store…</span>
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error && !selectedBranch) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <p className="text-xs text-red-600">{error}</p>
        <button type="button" onClick={retry} className="ml-3 flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 flex-shrink-0">
          <RefreshCw size={12} /> Retry
        </button>
      </div>
    )
  }

  // ── No branch yet ──────────────────────────────────────────────────────────
  if (!selectedBranch) return null

  // ── Compact selected state (default) ──────────────────────────────────────
  if (!showAll) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{selectedBranch.branch_name}</p>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500 flex-wrap">
                <span className="flex items-center gap-0.5">
                  <MapPin size={10} />{selectedBranch.distance_km} km
                </span>
                {selectedBranch.eta_minutes != null && (
                  <span className="flex items-center gap-0.5">
                    <Clock size={10} />~{selectedBranch.eta_minutes} min
                  </span>
                )}
                <span className={`flex items-center gap-0.5 font-medium ${selectedBranch.delivery_fee === 0 ? 'text-green-700' : 'text-gray-700'}`}>
                  <Truck size={10} />
                  {selectedBranch.delivery_fee === 0 ? 'Free delivery' : `₹${selectedBranch.delivery_fee} delivery`}
                </span>
              </div>
            </div>
          </div>
          {branches.length > 1 && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="ml-3 flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700 flex-shrink-0"
            >
              Change <ChevronDown size={13} />
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Expanded: show all branches to pick from ───────────────────────────────
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100 cursor-pointer"
        onClick={() => setShowAll(false)}
      >
        <div className="flex items-center gap-2">
          <MapPin size={15} className="text-rose-500" />
          <span className="text-sm font-semibold text-gray-800">Choose a store</span>
        </div>
        <ChevronUp size={15} className="text-gray-400" />
      </div>
      <div className="p-3 space-y-2">
        {branches.map((b) => {
          const isSelected = selectedBranch.branch_id === b.id
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => manualSelect(b)}
              className={`w-full text-left rounded-xl border px-4 py-3 transition-all ${
                isSelected
                  ? 'border-rose-500 bg-rose-50 ring-1 ring-rose-400'
                  : 'border-gray-200 hover:border-rose-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                    {isSelected && <CheckCircle2 size={13} className="text-rose-500 flex-shrink-0" />}
                    {b.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{b.address}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-xs text-gray-500">
                    <span className="flex items-center gap-0.5"><MapPin size={10} />{b.distance_km} km</span>
                    {b.eta_minutes != null && <span className="flex items-center gap-0.5"><Clock size={10} />~{b.eta_minutes} min</span>}
                    <span className={`flex items-center gap-0.5 font-medium ${b.delivery_fee === 0 ? 'text-green-600' : 'text-gray-700'}`}>
                      <Truck size={10} />
                      {b.delivery_fee === 0 ? 'Free delivery' : `₹${b.delivery_fee}`}
                    </span>
                  </div>
                </div>
                {isSelected && <span className="text-xs font-semibold text-rose-600 flex-shrink-0">✓</span>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
