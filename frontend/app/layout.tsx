import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Providers } from '../lib/providers'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: { default: 'Hangout Cakes', template: '%s | Hangout Cakes' },
  description: 'Custom cakes, cupcakes & desserts — delivered fresh.',
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
