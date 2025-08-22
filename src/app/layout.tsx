import Link from "next/link";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full">
      {/* 背景を薄グレー／本文フォント小さめ */}
      <body className="min-h-screen bg-gray-50 text-sm text-gray-900 antialiased">
        <header className="sticky top-0 z-10 w-full border-b bg-white/80 backdrop-blur">
          {/* ヘッダーの横幅はページと合わせて 820px */}
          <div className="mx-auto max-w-[820px] px-4 py-3 flex items-center justify-between">
            <h1 className="text-base font-semibold tracking-tight">MEETMATE</h1>
            <nav className="flex items-center gap-2">
              <Link
                href="/"
                className="px-3 py-1.5 rounded-md bg-black text-white hover:opacity-90"
              >
                TOP
              </Link>
            </nav>
          </div>
        </header>

        {/* 各ページ側で Container を使って中央寄せする想定 */}
        <main>{children}</main>
      </body>
    </html>
  );
}
