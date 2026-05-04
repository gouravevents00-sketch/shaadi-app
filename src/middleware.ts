import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that don't require auth
const PUBLIC_ROUTES = [
  '/login',
  '/invite',
  '/api/invites',
  '/rsvp',
  '/schedule',
  '/venue',
  '/portal',
  '/speaker',     // speaker self-fill portal (token-based, no auth)
  '/celebrate',   // B2C landing, signup, new celebration
  '/vendors',     // public vendor marketplace
]

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  const isPublic = PUBLIC_ROUTES.some(r => path.startsWith(r))

  // Not logged in → redirect to appropriate login page
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    // B2C personal routes → celebrate signup
    if (path.startsWith('/my/')) {
      url.pathname = '/celebrate/signup'
      url.searchParams.set('mode', 'signin')
      url.searchParams.set('next', path)
    } else {
      url.pathname = '/login'
      url.searchParams.set('next', path)
    }
    return NextResponse.redirect(url)
  }

  // Logged in + hitting login → redirect to dashboard
  if (user && path === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
