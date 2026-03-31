'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { authApi } from '../../../../lib/api/auth'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'already'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const id   = searchParams.get('id')
    const hash = searchParams.get('hash')

    if (!id || !hash) {
      setStatus('error')
      setMessage('Invalid verification link.')
      return
    }

    authApi.verifyEmail(Number(id), hash)
      .then((res) => {
        const msg: string = (res as { data?: { message?: string } })?.data?.message ?? ''
        if (msg.includes('already')) {
          setStatus('already')
        } else {
          setStatus('success')
        }
        setMessage(msg)
      })
      .catch((err: unknown) => {
        setStatus('error')
        setMessage(
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message
            ?? 'Verification failed. The link may have expired.'
        )
      })
  }, [searchParams])

  return (
    <div className="text-center">
      {status === 'loading' && (
        <p className="text-gray-500 text-sm">Verifying your email…</p>
      )}
      {status === 'success' && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-4 text-sm">
          <p className="font-semibold text-base mb-1">Email verified!</p>
          <p>Your account is now active. You can start ordering.</p>
          <Link href="/" className="inline-block mt-4 bg-rose-600 text-white px-6 py-2 rounded-full text-sm font-semibold hover:bg-rose-700">
            Shop now
          </Link>
        </div>
      )}
      {status === 'already' && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-lg px-4 py-4 text-sm">
          <p className="font-semibold mb-1">Already verified</p>
          <p>Your email was already verified.</p>
          <Link href="/" className="inline-block mt-4 text-rose-600 hover:underline text-sm font-medium">
            Go to home
          </Link>
        </div>
      )}
      {status === 'error' && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-4 text-sm">
          <p className="font-semibold mb-1">Verification failed</p>
          <p>{message}</p>
          <Link href="/auth/login" className="inline-block mt-4 text-rose-600 hover:underline text-sm font-medium">
            Back to login
          </Link>
        </div>
      )}
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Email Verification</h1>
        <Suspense fallback={<p className="text-center text-sm text-gray-500">Loading…</p>}>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </div>
  )
}
