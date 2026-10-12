import type { Metadata, Viewport } from 'next';
import '@/styles/site/styles.css';
import '@/styles/site/carnival.css';
import '@/styles/site/club.css';
import '@/styles/site/beachclub.css';
import '@/styles/site/additions.css';

const icon =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23073e59'/%3E%3Cpath d='M4 19Q10 10 16 19T28 19M4 25Q10 16 16 25T28 25' fill='none' stroke='%235fe0d0' stroke-width='3'/%3E%3C/svg%3E";

export const metadata: Metadata = { icons: { icon } };
export const viewport: Viewport = { themeColor: '#bbe6e4' };

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800;900&family=DM+Sans:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
