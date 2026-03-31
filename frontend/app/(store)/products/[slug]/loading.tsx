export default function ProductLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="aspect-square rounded-2xl bg-gray-100" />
        <div className="flex flex-col gap-4 pt-2">
          <div className="h-4 w-24 bg-gray-100 rounded" />
          <div className="h-8 w-3/4 bg-gray-100 rounded" />
          <div className="h-4 w-full bg-gray-100 rounded" />
          <div className="h-4 w-5/6 bg-gray-100 rounded" />
          <div className="h-10 w-32 bg-gray-100 rounded-full mt-4" />
          <div className="h-12 bg-gray-100 rounded-full mt-2" />
        </div>
      </div>
    </div>
  )
}
