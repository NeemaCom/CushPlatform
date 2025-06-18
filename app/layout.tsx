import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { QueryProvider } from '@/lib/query-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Cush - Smart Financial Platform',
  description: 'Intelligent financial management platform with AI-powered insights, loan referrals, community support, and job discovery for global immigration services.',
  keywords: 'financial management, immigration, loans, AI insights, community',
  authors: [{ name: 'Cush Team' }],
  themeColor: '#3b82f6',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-32x32.png',
    apple: '/icons/icon-192x192.png',
  },
  openGraph: {
    title: 'Cush - Smart Financial Platform',
    description: 'Intelligent financial management with AI-powered insights and community support for global immigration services.',
    type: 'website',
    url: 'https://cush.vercel.app',
    images: '/icons/icon-512x512.png',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cush - Smart Financial Platform',
    description: 'Intelligent financial management with AI-powered insights and community support.',
    images: '/icons/icon-512x512.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            {children}
            <Toaster />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}