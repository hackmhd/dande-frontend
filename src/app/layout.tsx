import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'Dande Épargne',
  description: 'Épargnez chaque jour, atteignez vos objectifs.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#1D6E4E',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <div className="mx-auto min-h-screen max-w-md bg-sand-50 transition-colors dark:bg-night-950">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
