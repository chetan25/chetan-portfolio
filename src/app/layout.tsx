import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
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

export const metadata: Metadata = {
  title: 'Chetan Dasauni — Senior Software Engineer',
  description:
    'Senior software engineer building polished interfaces and tooling. 11+ years at Sycle, Unbounce, Intuit, and Scribd.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        <Nav />
        {children}
        <ChatLauncher />
      </body>
    </html>
  )
}
