import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Providers } from '../lib/providers'
import { getSiteSettings } from '../lib/api/settings'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://order.hangoutcakes.com'

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings()
  const description = s.site_tagline ?? 'Custom cakes, cupcakes & desserts — freshly baked and delivered to your door.'

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: s.site_name, template: `%s | ${s.site_name}` },
    description,
    icons: s.favicon_url ? { icon: s.favicon_url } : { icon: '/favicon.ico' },
    openGraph: {
      type: 'website',
      siteName: s.site_name,
      description,
      locale: 'en_IN',
      ...(s.logo_url ? { images: [{ url: s.logo_url, width: 1200, height: 630, alt: s.site_name }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: s.site_name,
      description,
      ...(s.logo_url ? { images: [s.logo_url] } : {}),
    },
    robots: { index: true, follow: true },
    alternates: { canonical: SITE_URL },
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-gray-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
