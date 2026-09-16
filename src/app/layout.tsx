import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BINARIES | Scientist Invention Quiz Platform',
  description: 'A live, professional symposium scientist invention quiz game for college participants.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="antialiased min-h-screen bg-[#060913] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}
