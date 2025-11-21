import './globals.css'
import { Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'

export const dynamic = "force-dynamic";

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Political Ad Tracker - India',
  description: 'Dashboard and Explorer for political ad spends in India',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
