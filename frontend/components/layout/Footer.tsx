import Link from 'next/link'
import type { SiteSettings } from '../../lib/api/settings'

interface FooterProps {
  settings?: SiteSettings | null
}

export default function Footer({ settings }: FooterProps) {
  const siteName = settings?.site_name ?? 'Hangout Cakes'
  const tagline = settings?.site_tagline ?? 'Custom cakes, cupcakes and desserts crafted with love. Fresh ingredients, beautiful designs, delivered to your door.'

  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-white text-lg font-bold mb-3">{siteName}</h3>
            <p className="text-sm leading-relaxed text-gray-400">{tagline}</p>

            {/* Contact info */}
            <div className="mt-4 space-y-1 text-sm text-gray-400">
              {settings?.contact_email && (
                <p><a href={`mailto:${settings.contact_email}`} className="hover:text-white transition-colors">{settings.contact_email}</a></p>
              )}
              {settings?.contact_phone && (
                <p><a href={`tel:${settings.contact_phone}`} className="hover:text-white transition-colors">{settings.contact_phone}</a></p>
              )}
              {settings?.address && (
                <p className="text-gray-500">{settings.address}</p>
              )}
            </div>

            {/* Social links */}
            {(settings?.facebook_url || settings?.instagram_url || settings?.twitter_url) && (
              <div className="mt-4 flex gap-3">
                {settings.facebook_url && (
                  <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors text-xs font-medium">Facebook</a>
                )}
                {settings.instagram_url && (
                  <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors text-xs font-medium">Instagram</a>
                )}
                {settings.twitter_url && (
                  <a href={settings.twitter_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors text-xs font-medium">Twitter / X</a>
                )}
              </div>
            )}
          </div>

          <div>
            <h4 className="text-white text-sm font-semibold mb-3 uppercase tracking-wider">Shop</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/products" className="hover:text-white transition-colors">All Products</Link></li>
              <li><Link href="/categories" className="hover:text-white transition-colors">Categories</Link></li>
              <li><Link href="/products?featured=true" className="hover:text-white transition-colors">Featured</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white text-sm font-semibold mb-3 uppercase tracking-wider">Account</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/auth/login" className="hover:text-white transition-colors">Login</Link></li>
              <li><Link href="/auth/register" className="hover:text-white transition-colors">Register</Link></li>
              <li><Link href="/orders" className="hover:text-white transition-colors">My Orders</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-gray-800 text-xs text-gray-500 flex flex-col md:flex-row justify-between gap-2">
          <p>&copy; {new Date().getFullYear()} {siteName}. All rights reserved.</p>
          <p>Prices inclusive of GST.</p>
        </div>
      </div>
    </footer>
  )
}
