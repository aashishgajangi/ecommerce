'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { useAuthStore } from '../../lib/stores/authStore'
import { wishlistApi } from '../../lib/api/wishlist'

interface Props {
  productId: number
  className?: string
}

export default function WishlistButton({ productId, className = '' }: Props) {
  const { isAuthenticated } = useAuthStore()
  const [wishlisted, setWishlisted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (!isAuthenticated()) {
      window.location.href = '/auth/login'
      return
    }

    setLoading(true)
    try {
      const res = await wishlistApi.toggle(productId)
      setWishlisted(res.data.wishlisted)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      className={`absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm shadow transition-all hover:scale-110 disabled:opacity-60 ${className}`}
    >
      <Heart
        size={15}
        className={wishlisted ? 'fill-rose-500 text-rose-500' : 'text-gray-400'}
        strokeWidth={wishlisted ? 0 : 1.5}
      />
    </button>
  )
}
