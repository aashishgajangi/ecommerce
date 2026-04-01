'use client'

import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { useAuthStore } from '../../lib/stores/authStore'
import { reviewsApi, type Review } from '../../lib/api/reviews'

interface Props {
  productId: number
  averageRating?: number
  reviewsCount?: number
}

function StarRow({ rating, size = 16, className = '' }: { rating: number; size?: number; className?: string }) {
  return (
    <div className={`flex gap-0.5 ${className}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={n <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}
          strokeWidth={1}
        />
      ))}
    </div>
  )
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
        >
          <Star
            size={28}
            className={(hovered || value) >= n ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
            strokeWidth={1}
          />
        </button>
      ))}
    </div>
  )
}

export default function ProductReviews({ productId, averageRating, reviewsCount }: Props) {
  const { isAuthenticated } = useAuthStore()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)

  const [showForm, setShowForm] = useState(false)
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    setLoading(true)
    reviewsApi.list(productId, page)
      .then((res) => {
        const d = res.data as unknown as { data: Review[]; meta: { current_page: number; last_page: number; total: number } }
        setReviews((prev) => page === 1 ? d.data : [...prev, ...d.data])
        setLastPage(d.meta?.last_page ?? 1)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [productId, page])

  async function submitReview(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')
    setSubmitting(true)
    try {
      await reviewsApi.submit(productId, { rating, title: title.trim() || undefined, body: body.trim() || undefined })
      setSubmitted(true)
      setShowForm(false)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setSubmitError(msg ?? 'Failed to submit review. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-12 pt-8 border-t border-gray-100">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-gray-900">Reviews</h2>
          {(reviewsCount ?? 0) > 0 && (
            <div className="flex items-center gap-2">
              <StarRow rating={Math.round(averageRating ?? 0)} size={16} />
              <span className="text-sm text-gray-500">{averageRating?.toFixed(1)} · {reviewsCount} review{reviewsCount !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {!submitted && isAuthenticated() && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-sm font-semibold text-rose-600 hover:text-rose-700 border border-rose-200 rounded-full px-4 py-1.5 hover:bg-rose-50 transition-colors"
          >
            Write a review
          </button>
        )}
        {!isAuthenticated() && (
          <a href="/auth/login" className="text-sm text-gray-500 hover:text-rose-600 underline underline-offset-2">
            Login to write a review
          </a>
        )}
      </div>

      {/* Review submission form */}
      {showForm && (
        <form onSubmit={submitReview} className="mb-8 bg-gray-50 rounded-2xl p-5 space-y-4 border border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">Your Review</h3>
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Rating *</p>
            <StarPicker value={rating} onChange={setRating} />
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Review title (optional)"
            maxLength={200}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share your experience…"
            rows={4}
            maxLength={2000}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
          />
          {submitError && <p className="text-xs text-red-500">{submitError}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowForm(false)}
              className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="bg-rose-600 text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-rose-700 disabled:opacity-50 transition-colors">
              {submitting ? 'Submitting…' : 'Submit Review'}
            </button>
          </div>
        </form>
      )}

      {submitted && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-medium">
          Thank you! Your review has been submitted for approval.
        </div>
      )}

      {/* Review list */}
      {loading && reviews.length === 0 ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse space-y-2">
              <div className="h-3 bg-gray-200 rounded w-24" />
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No reviews yet. Be the first to review this product!</p>
      ) : (
        <div className="space-y-5">
          {reviews.map((r) => (
            <div key={r.id} className="border-b border-gray-100 pb-5 last:border-0">
              <div className="flex items-center gap-2 mb-1">
                <StarRow rating={r.rating} size={13} />
                <span className="text-xs text-gray-400">
                  {r.user.name} · {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              {r.title && <p className="text-sm font-semibold text-gray-900 mt-1">{r.title}</p>}
              {r.body && <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{r.body}</p>}
            </div>
          ))}

          {page < lastPage && (
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={loading}
              className="text-sm font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-50"
            >
              {loading ? 'Loading…' : 'Load more reviews'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
