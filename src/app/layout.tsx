import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import Nav from '@/components/ui/Nav'
import ChatLauncher from '@/components/chat/ChatLauncher'
import './globals.css'

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
const SITE_NAME = 'Chetan Dasauni'
const SITE_DESC =
  'Senior software engineer building polished interfaces and tooling. 11+ years at Sycle, Unbounce, Intuit, and Scribd.'
const SITE_TITLE_DEFAULT = `${SITE_NAME} — Senior Software Engineer`

// Schema.org Person markup — surfaces identity in rich results and helps AI
// crawlers attribute the portfolio to the right entity. Kept as a static
// object so it lives in every page's HTML without dragging the resume JSON
// into the root bundle.
const PERSON_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: SITE_NAME,
  jobTitle: 'Senior Software Engineer',
  url: SITE_URL,
  email: 'mailto:chetandasauni25@gmail.com',
  image: `${SITE_URL}/icon.svg`,
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Vancouver',
    addressRegion: 'BC',
    addressCountry: 'Canada',
  },
  sameAs: [
    'https://github.com/chetan25',
    'https://www.linkedin.com/in/chetan-dasauni/',
  ],
}

export const viewport: Viewport = {
  themeColor: '#09090b',
  colorScheme: 'dark',
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE_DEFAULT,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESC,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_TITLE_DEFAULT,
    description: SITE_DESC,
    locale: 'en_US',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE_DEFAULT,
    description: SITE_DESC,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:border focus:border-white/20 focus:bg-zinc-950 focus:px-4 focus:py-2 focus:text-[13px] focus:font-medium focus:text-zinc-50 focus:shadow-[0_18px_40px_-22px_rgba(0,0,0,0.6)]"
        >
          Skip to main content
        </a>
        <Nav />
        {children}
        <ChatLauncher />
        <Analytics />
        {/* Static Schema.org Person markup. Content is hardcoded above —
            no user input flows into the script body, so the JSON-string
            embedding is safe by construction. */}
        <Script
          id="person-jsonld"
          type="application/ld+json"
          strategy="beforeInteractive"
        >
          {JSON.stringify(PERSON_JSON_LD)}
        </Script>
      </body>
    </html>
  )
}
