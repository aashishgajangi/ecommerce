'use client'

import { useEffect } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { useLocationStore } from '../../lib/stores/locationStore'
import { branchApi } from '../../lib/api/branches'
import type { SelectedBranch } from '../../lib/stores/locationStore'
import type { NearbyBranch } from '../../lib/types'

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!

/** Silent component — auto-detects location + nearest branch on first visit. No UI rendered. */
export default function LocationInitializer() {
  const { userLocation, selectedBranch, setUserLocation, setSelectedBranch } = useLocationStore()

  useEffect(() => {
    // Already have everything — nothing to do
    if (userLocation && selectedBranch) return

    const run = async () => {
      try {
        // Load Maps API for reverse geocoding
        setOptions({ key: MAPS_KEY, v: 'weekly' })
        await importLibrary('geocoding').catch(() => {})

        let pos = userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : null

        // Detect coordinates if not saved
        if (!pos) {
          // Try browser GPS (cached, instant if previously granted)
          const gps = (): Promise<{ lat: number; lng: number }> =>
            new Promise((res, rej) => {
              if (!navigator.geolocation) { rej(new Error('unavailable')); return }
              navigator.geolocation.getCurrentPosition(
                ({ coords }) => res({ lat: coords.latitude, lng: coords.longitude }),
                rej,
                { timeout: 3000, maximumAge: 600000 }
              )
            })

          try {
            pos = await gps()
          } catch {
            // Fall back to Google IP geolocation
            const res = await fetch(
              `https://www.googleapis.com/geolocation/v1/geolocate?key=${MAPS_KEY}`,
              { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }
            )
            if (res.ok) {
              const d = await res.json() as { location: { lat: number; lng: number } }
              pos = d.location
            }
          }
        }

        if (!pos) return

        // Reverse geocode to get area label
        let label = userLocation?.label
        if (!label) {
          try {
            const geocoder = new google.maps.Geocoder()
            const { results } = await geocoder.geocode({ location: pos })
            if (results?.[0]) {
              const comps = results[0].address_components
              const get = (type: string) => comps.find(c => c.types.includes(type))?.long_name ?? ''
              const sub = get('sublocality_level_1') || get('sublocality') || get('neighborhood')
              const city = get('locality') || get('administrative_area_level_2')
              label = [sub, city].filter(Boolean).join(', ') || results[0].formatted_address.split(',')[0]
            }
          } catch { /* use coords */ }
        }

        setUserLocation({ lat: pos.lat, lng: pos.lng, label })

        // If branch not selected yet, find nearest
        if (!selectedBranch) {
          const res = await branchApi.deliveryOptions(pos.lat, pos.lng)
          const list: NearbyBranch[] = res.data.branches
          if (list.length > 0) {
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
          }
        }
      } catch { /* silent — location detection is best-effort */ }
    }

    // Small delay to not block first paint
    const t = setTimeout(run, 800)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
