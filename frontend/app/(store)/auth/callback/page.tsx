'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '../../../../lib/stores/authStore'
import type { User } from '../../../../lib/types'

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-600 mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Signing you in…</p>
      </div>
    </div>
  )
}

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setAuth } = useAuthStore()

  useEffect(() => {
    const token = searchParams.get('token')
    const userRaw = searchParams.get('user')

    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw) as User
        setAuth(user, token)
        router.replace('/')
      } catch {
        router.replace('/auth/login?error=1')
      }
    } else {
      router.replace('/auth/login?error=1')
    }
  }, [searchParams, router, setAuth])

  return <Spinner />
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <CallbackHandler />
    </Suspense>
  )
}
