'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SelectedBranch {
  branch_id: number
  branch_name: string
  branch_slug: string
  address: string
  distance_km: number
  delivery_fee: number
  eta_minutes: number | null
  opening_time: string
  closing_time: string
  lat: number
  lng: number
  google_maps_url: string | null
}

interface UserLocation {
  lat: number
  lng: number
  label?: string
}

interface LocationState {
  userLocation: UserLocation | null
  selectedBranch: SelectedBranch | null
  locationDenied: boolean
  locationBarOpen: boolean // non-persisted: lets checkout trigger the bar to open

  setUserLocation: (loc: UserLocation) => void
  setSelectedBranch: (branch: SelectedBranch) => void
  clearBranch: () => void
  setLocationDenied: (denied: boolean) => void
  clearLocation: () => void
  openLocationBar: () => void
  closeLocationBar: () => void
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      userLocation: null,
      selectedBranch: null,
      locationDenied: false,
      locationBarOpen: false,

      setUserLocation: (loc) => set({ userLocation: loc, locationDenied: false }),
      setSelectedBranch: (branch) => set({ selectedBranch: branch }),
      clearBranch: () => set({ selectedBranch: null }),
      setLocationDenied: (denied) => set({ locationDenied: denied }),
      clearLocation: () => set({ userLocation: null, selectedBranch: null, locationDenied: false }),
      openLocationBar: () => set({ locationBarOpen: true }),
      closeLocationBar: () => set({ locationBarOpen: false }),
    }),
    {
      name: 'hc-location',
      // Do NOT persist selectedBranch — fees/ETA/distance go stale.
      // It is re-fetched fresh on every checkout/LocationInitializer load.
      partialize: (state) => ({
        userLocation: state.userLocation,
        locationDenied: state.locationDenied,
      }),
    }
  )
)
