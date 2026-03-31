export default function OrderDetailLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-28 mb-6" />
      <div className="flex items-start justify-between mb-6">
        <div className="space-y-2">
          <div className="h-7 bg-gray-200 rounded w-52" />
          <div className="h-3 bg-gray-200 rounded w-36" />
        </div>
        <div className="h-7 bg-gray-200 rounded-full w-24" />
      </div>
      <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50 mb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between items-center px-5 py-4">
            <div className="space-y-1.5">
              <div className="h-4 bg-gray-200 rounded w-44" />
              <div className="h-3 bg-gray-200 rounded w-28" />
            </div>
            <div className="h-4 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
      <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex justify-between">
            <div className="h-3 bg-gray-200 rounded w-20" />
            <div className="h-3 bg-gray-200 rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}
