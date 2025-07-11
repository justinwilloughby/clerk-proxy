import { NextRequest, NextResponse, NextFetchEvent } from 'next/server'
import { clerkMiddleware } from '@clerk/nextjs/server'

function proxyMiddleware(req: NextRequest) {
  if (req.nextUrl.pathname.match('__clerk')) {
    const proxyHeaders = new Headers(req.headers)
    proxyHeaders.set('Clerk-Proxy-Url', process.env.NEXT_PUBLIC_CLERK_PROXY_URL || '')
    proxyHeaders.set('Clerk-Secret-Key', process.env.CLERK_SECRET_KEY || '')
    // Derive the client IP. `NextRequest` doesn't expose an `ip` field in its
    // type definition, but it may exist at runtime when deployed on Vercel.
    // Fall back to the `X-Forwarded-For` header when it is not available.
    const forwardedFor =
      (req as any).ip || req.headers.get('X-Forwarded-For') || ''
    proxyHeaders.set('X-Forwarded-For', forwardedFor)

    const proxyUrl = new URL(req.url)
    proxyUrl.host = 'frontend-api.clerk.dev'
    proxyUrl.port = '443'
    proxyUrl.protocol = 'https'
    proxyUrl.pathname = proxyUrl.pathname.replace('/__clerk', '')

    return NextResponse.rewrite(proxyUrl, {
      request: {
        headers: proxyHeaders,
      },
    })
  }

  return null
}

const clerkHandler = clerkMiddleware()

export default function middleware(req: NextRequest, ev: NextFetchEvent) {
  // First check if it's a proxy request
  const proxyResponse = proxyMiddleware(req)
  if (proxyResponse) {
    return proxyResponse
  }

  // Otherwise, use Clerk's middleware (forward the `NextFetchEvent` as well)
  return clerkHandler(req, ev)
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes AND anything passed through the proxy
    '/(api|trpc|__clerk)(.*)',
  ],
}