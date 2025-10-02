import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

/**
 * Font configuration using Geist font family
 * Geist Sans for general UI, Geist Mono for code/monospace text
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Application metadata
 * 
 * WHY: Metadata is important for SEO, social sharing, and browser behavior.
 * We set appropriate branding for the Overcast Video Classroom platform.
 */
export const metadata: Metadata = {
  title: "Overcast - Video Classroom Platform",
  description: "Live video classroom platform for interactive learning. Powered by the Overclock Accelerator.",
  keywords: ["video classroom", "online learning", "live video", "education platform"],
  authors: [{ name: "Overclock Accelerator" }],
  creator: "Overclock Accelerator",
  publisher: "Overclock Accelerator",
  robots: "index, follow",
  
  // Open Graph metadata for social sharing
  openGraph: {
    title: "Overcast - Video Classroom Platform",
    description: "Live video classroom platform for interactive learning",
    type: "website",
    siteName: "Overcast",
  },
  
  // Theme color for browser chrome (mobile)
  themeColor: "#000000",
  
  // Viewport configuration
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
};

/**
 * Root layout component
 * 
 * This layout wraps all pages in the application.
 * It applies global styles, fonts, and provides the HTML structure.
 * 
 * WHY: Next.js App Router requires a root layout that defines the <html> and <body> tags.
 * We configure fonts, styling, and accessibility features here.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white min-h-screen flex flex-col`}
      >
        <div className="flex-1">
          {children}
        </div>
        
        {/* Footer with Overclock Accelerator branding */}
        <footer className="border-t border-gray-800 bg-black py-6 mt-auto">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Branding */}
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#00FFD1] animate-pulse"></div>
                <p className="text-gray-300 text-sm">
                  Powered by{' '}
                  <span className="font-bold text-[#00FFD1] hover:text-[#00E6BC] transition-colors">
                    the Overclock Accelerator
                  </span>
                </p>
              </div>
              
              {/* Additional info */}
              <div className="flex items-center gap-6 text-gray-500 text-xs">
                <span>© {new Date().getFullYear()} Overcast</span>
                <span className="hidden sm:inline">Video Classroom Platform</span>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
