import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata = {
  title: 'Dashboard Gelateria | Apolo Holdings',
  description: 'Dashboard de gestió per a la Gelateria - Apolo Holdings',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ca">
      <body>
        <Sidebar />
        <main
          style={{
            marginLeft: '240px',
            minHeight: '100vh',
            padding: '24px 32px',
            overflowY: 'auto',
          }}
        >
          {children}
        </main>
      </body>
    </html>
  );
}
