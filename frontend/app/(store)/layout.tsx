import Header from '../../components/layout/Header'
import Footer from '../../components/layout/Footer'
import { getSiteSettings } from '../../lib/api/settings'

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings()

  return (
    <>
      <Header logoUrl={settings.logo_url} siteName={settings.site_name} />

      {settings.notice_enabled && settings.notice_text && (
        <div className="bg-amber-400 text-amber-950 text-sm font-medium text-center px-4 py-2.5 leading-snug">
          {settings.notice_text}
        </div>
      )}

      <main className="flex-1">{children}</main>
      <Footer settings={settings} />
    </>
  )
}
