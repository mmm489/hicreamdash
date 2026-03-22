'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  {
    label: 'Dashboard',
    href: '/',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    label: 'Costos',
    href: '/costs',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.66 0-3 1-3 2.5s1.34 2.5 3 2.5c1.66 0 3 1 3 2.5s-1.34 2.5-3 2.5c-1 0-2-.5-2.5-1.5" />
        <path d="M12 5.5v1M12 17.5v1" />
      </svg>
    ),
  },
  {
    label: 'Empleats',
    href: '#',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    comingSoon: true,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-logo">
          <span className="sidebar-logo-emoji">🍦</span>
          <div>
            <h1 className="sidebar-title">Gelateria</h1>
            <p className="sidebar-subtitle">Apolo Holdings</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.label}
                href={item.comingSoon ? '#' : item.href}
                className={`sidebar-link ${isActive && !item.comingSoon ? 'sidebar-link-active' : ''} ${item.comingSoon ? 'sidebar-link-disabled' : ''}`}
                onClick={item.comingSoon ? (e) => e.preventDefault() : undefined}
              >
                <span className="sidebar-link-icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.comingSoon && (
                  <span className="sidebar-badge">Aviat</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <p>v1.0 &middot; 2026</p>
        </div>
      </aside>

      {/* Styles */}
      <style jsx>{`
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          width: 240px;
          height: 100vh;
          background: #0f172a;
          border-right: 1px solid #1e293b;
          display: flex;
          flex-direction: column;
          padding: 0;
          z-index: 50;
        }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 24px 20px 20px;
          border-bottom: 1px solid #1e293b;
        }

        .sidebar-logo-emoji {
          font-size: 32px;
        }

        .sidebar-title {
          font-size: 18px;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0;
          line-height: 1.2;
        }

        .sidebar-subtitle {
          font-size: 11px;
          color: #64748b;
          margin: 0;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .sidebar-nav {
          flex: 1;
          padding: 16px 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 8px;
          color: #94a3b8;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.15s ease;
        }

        .sidebar-link:hover:not(.sidebar-link-disabled) {
          background: #1e293b;
          color: #f1f5f9;
        }

        .sidebar-link-active {
          background: rgba(244, 114, 182, 0.1);
          color: #f472b6;
        }

        .sidebar-link-active:hover {
          background: rgba(244, 114, 182, 0.15) !important;
          color: #f472b6 !important;
        }

        .sidebar-link-disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .sidebar-link-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          flex-shrink: 0;
        }

        .sidebar-badge {
          margin-left: auto;
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 9999px;
          background: #1e293b;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .sidebar-footer {
          padding: 16px 20px;
          border-top: 1px solid #1e293b;
          font-size: 11px;
          color: #475569;
        }

        .sidebar-footer p {
          margin: 0;
        }

        @media (max-width: 768px) {
          .sidebar {
            display: none;
          }
        }
      `}</style>
    </>
  );
}
