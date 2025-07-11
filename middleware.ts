// middleware.ts at repo root
import { NextRequest, NextResponse, NextFetchEvent } from 'next/server'
import { clerkMiddleware } from '@clerk/nextjs/server'

const FAPI_HOST = 'frontend-api.clerk.dev'

function proxy(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith('/__clerk')) return null

  const proxyHeaders = new Headers(req.headers)
  proxyHeaders.set('Clerk-Proxy-Url', process.env.NEXT_PUBLIC_CLERK_PROXY_URL!)
  proxyHeaders.set('Clerk-Secret-Key', process.env.CLERK_SECRET_KEY!)
  proxyHeaders.set('X-Forwarded-For', req.headers.get('x-real-ip') ?? req.headers.get('X-Forwarded-For') ?? '')

  const target = new URL(req.url)
  target.host = FAPI_HOST
  target.protocol = 'https'
  target.pathname = target.pathname.replace('/__clerk', '')

  return NextResponse.rewrite(target, { request: { headers: proxyHeaders } })
}

const clerk = clerkMiddleware()

export default function middleware(req: NextRequest, ev: NextFetchEvent) {
  return proxy(req) ?? clerk(req, ev)
}

export const config = { matcher: ['/:path*'], runtime: 'edge' }