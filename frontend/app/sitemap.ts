import type { MetadataRoute } from 'next'
import { catalogApi } from '../lib/api/catalog'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://order.hangoutcakes.com'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL,                    lastModified: now, changeFrequency: 'daily',  priority: 1.0 },
    { url: `${SITE_URL}/products`,      lastModified: now, changeFrequency: 'daily',  priority: 0.9 },
    { url: `${SITE_URL}/categories`,    lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
  ]

  let productPages: MetadataRoute.Sitemap = []
  try {
    const res = await catalogApi.getProducts({ per_page: 500 })
    productPages = (res.data.data ?? []).map((p: { slug: string }) => ({
      url: `${SITE_URL}/products/${p.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  } catch { /* skip on error — static pages still served */ }

  let categoryPages: MetadataRoute.Sitemap = []
  try {
    const res = await catalogApi.getCategories()
    categoryPages = (res.data ?? []).map((c: { slug: string }) => ({
      url: `${SITE_URL}/categories/${c.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  } catch { /* skip on error */ }

  return [...staticPages, ...productPages, ...categoryPages]
}
