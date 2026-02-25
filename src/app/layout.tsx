import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Women & Crime — Episode Promoter',
  description: 'Generate social media content and thumbnails for Women & Crime podcast episodes',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#1b1c1b] text-slate-100 min-h-screen`}
      >
        <header className="border-b border-slate-800 bg-[#1b1c1b] sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/episodes" className="flex items-center gap-3 group">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-600 to-purple-800 flex items-center justify-center text-xs font-bold text-white">
                W&amp;C
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-100 group-hover:text-pink-300 transition-colors">
                  Women &amp; Crime
                </div>
                <div className="text-xs text-slate-500">Episode Promoter</div>
              </div>
            </Link>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
