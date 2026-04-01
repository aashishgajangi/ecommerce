'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { wishlistApi } from '../../lib/api/wishlist'

interface Props {
  productId: number
  className?: string
}

export default function WishlistButton({ productId, className = '' }: Props) {
  const [wishlisted, setWishlisted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<'added' | 'removed' | 'error' | null>(null)

  function showFeedback(type: 'added' | 'removed' | 'error') {
    setFeedback(type)
    setTimeout(() => setFeedback(null), 1800)
  }

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) {
      window.location.href = '/auth/login'
      return
    }

    setLoading(true)
    try {
      const res = await wishlistApi.toggle(productId)
      const next = res.data.wishlisted
      setWishlisted(next)
      showFeedback(next ? 'added' : 'removed')
    } catch {
      showFeedback('error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`absolute top-2 right-2 z-10 flex flex-col items-end gap-1 ${className}`}>
      {/* Feedback tooltip */}
      {feedback && (
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap pointer-events-none ${
          feedback === 'added' ? 'bg-rose-100 text-rose-600'
          : feedback === 'removed' ? 'bg-gray-100 text-gray-500'
          : 'bg-red-100 text-red-500'
        }`}>
          {feedback === 'added' ? 'Saved!' : feedback === 'removed' ? 'Removed' : 'Failed'}
        </span>
      )}

      <button
        onClick={toggle}
        disabled={loading}
        aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        className="w-9 h-9 flex items-center justify-center rounded-full bg-white/90 shadow-sm border border-gray-100 transition-all hover:scale-110 active:scale-95 disabled:opacity-60"
      >
        <Heart
          size={16}
          className={wishlisted ? 'fill-rose-500 text-rose-500' : 'text-gray-400'}
          strokeWidth={wishlisted ? 0 : 1.5}
        />
      </button>
    </div>
  )
}
