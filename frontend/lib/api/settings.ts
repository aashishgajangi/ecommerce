export interface SiteSettings {
  site_name: string
  site_tagline: string | null
  logo_url: string | null
  favicon_url: string | null
  contact_email: string | null
  contact_phone: string | null
  address: string | null
  facebook_url: string | null
  instagram_url: string | null
  twitter_url: string | null
  notice_enabled: boolean
  notice_text: string | null
}

const FALLBACK: SiteSettings = {
  site_name: 'Hangout Cakes',
  site_tagline: null,
  logo_url: null,
  favicon_url: null,
  contact_email: null,
  contact_phone: null,
  address: null,
  facebook_url: null,
  instagram_url: null,
  twitter_url: null,
  notice_enabled: false,
  notice_text: null,
}

/** Server-side only — uses fetch with ISR revalidation. */
export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/settings`,
      { next: { revalidate: 60, tags: ['site-settings'] } }
    )
    if (!res.ok) return FALLBACK
    return res.json()
  } catch {
    return FALLBACK
  }
}
