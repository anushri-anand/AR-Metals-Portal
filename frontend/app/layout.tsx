import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AR Metals Production',
  description: 'Production management system',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
