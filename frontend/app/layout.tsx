import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Providers } from '../lib/providers'
import { getSiteSettings } from '../lib/api/settings'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings()
  return {
    title: { default: s.site_name, template: `%s | ${s.site_name}` },
    description: s.site_tagline ?? 'Custom cakes, cupcakes & desserts — delivered fresh.',
    icons: s.favicon_url ? { icon: s.favicon_url } : { icon: '/favicon.ico' },
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
