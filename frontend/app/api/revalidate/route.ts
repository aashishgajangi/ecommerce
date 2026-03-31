import { revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-revalidate-secret')

  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { tag } = await request.json().catch(() => ({ tag: 'site-settings' }))
  const resolvedTag = tag ?? 'site-settings'

  revalidateTag(resolvedTag, 'default')

  return NextResponse.json({ revalidated: true, tag: resolvedTag })
}
