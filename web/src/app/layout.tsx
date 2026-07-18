import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'GateIoT — HR Attendance Dashboard',
  description:
    'Real-time employee attendance monitoring, access control analytics, and ML-powered tardiness risk prediction for GateIoT RFID system.',
  keywords: ['attendance', 'RFID', 'HR dashboard', 'access control', 'gateiot'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
