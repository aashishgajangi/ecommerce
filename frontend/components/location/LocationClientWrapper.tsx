'use client'

import dynamic from 'next/dynamic'

const LocationBar         = dynamic(() => import('./LocationBar'),         { ssr: false })
const LocationInitializer = dynamic(() => import('./LocationInitializer'), { ssr: false })

export default function LocationClientWrapper() {
  return (
    <>
      <LocationInitializer />
      <LocationBar />
    </>
  )
}
