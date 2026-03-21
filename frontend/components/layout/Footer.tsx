import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-white text-lg font-bold mb-3">Hangout Cakes</h3>
            <p className="text-sm leading-relaxed text-gray-400">
              Custom cakes, cupcakes and desserts crafted with love. Fresh ingredients, beautiful designs, delivered to your door.
            </p>
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
          <p>&copy; {new Date().getFullYear()} Hangout Cakes. All rights reserved.</p>
          <p>Prices inclusive of GST.</p>
        </div>
      </div>
    </footer>
  )
}
