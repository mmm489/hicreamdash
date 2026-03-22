import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata = {
  title: 'Dashboard Gelateria | Apolo Holdings',
  description: 'Dashboard de gestió per a la Gelateria - Apolo Holdings',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ca">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <Sidebar />
        <main className="main-content">
          {children}
        </main>
        <style>{`
          .main-content {
            margin-left: 240px;
            min-height: 100vh;
            padding: 24px 32px;
            overflow-y: auto;
          }
          @media (max-width: 768px) {
            .main-content {
              margin-left: 0;
              padding: 16px 12px;
            }
          }
        `}</style>
      </body>
    </html>
  );
}
