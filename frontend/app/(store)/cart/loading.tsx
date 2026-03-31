export default function CartLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-32 mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 bg-white border border-gray-100 rounded-xl p-4">
              <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/4" />
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="flex gap-2 mt-2">
                  <div className="w-7 h-7 bg-gray-200 rounded-full" />
                  <div className="w-6 h-7 bg-gray-200 rounded" />
                  <div className="w-7 h-7 bg-gray-200 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-3 h-fit">
          <div className="h-5 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded w-4/5" />
          <div className="h-px bg-gray-100 my-2" />
          <div className="h-5 bg-gray-200 rounded w-2/3" />
          <div className="h-11 bg-gray-200 rounded-full mt-4" />
        </div>
      </div>
    </div>
  )
}
