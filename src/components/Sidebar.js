'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  {
    label: 'Dashboard',
    href: '/',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 1.5 : 2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    label: 'Costos',
    href: '/costs',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M14.5 9.5c-.5-1-1.5-1.5-2.5-1.5-1.66 0-3 1-3 2.5s1.34 2.5 3 2.5c1.66 0 3 1 3 2.5s-1.34 2.5-3 2.5c-1 0-2-.5-2.5-1.5" />
        <path d="M12 5.5v1M12 17.5v1" />
      </svg>
    ),
  },
  {
    label: 'Empleats',
    href: '#',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
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
      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside className="desktop-sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">🍦</span>
          <div>
            <h1 className="sidebar-title">Gelateria</h1>
            <p className="sidebar-subtitle">Apolo Holdings</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link key={item.label} href={item.comingSoon ? '#' : item.href}
                className={`sidebar-link ${isActive && !item.comingSoon ? 'active' : ''} ${item.comingSoon ? 'disabled' : ''}`}
                onClick={item.comingSoon ? (e) => e.preventDefault() : undefined}>
                <span className="sidebar-link-icon">{item.icon(isActive)}</span>
                <span>{item.label}</span>
                {item.comingSoon && <span className="sidebar-badge">Aviat</span>}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <p>v1.0 · 2026</p>
        </div>
      </aside>

      {/* ===== MOBILE TOP HEADER ===== */}
      <header className="mobile-header">
        <span className="mobile-header-icon">🍦</span>
        <span className="mobile-header-title">Gelateria</span>
      </header>

      {/* ===== MOBILE BOTTOM TAB BAR ===== */}
      <nav className="mobile-tabbar">
        {navItems.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link key={item.label} href={item.comingSoon ? '#' : item.href}
              className={`tab-item ${isActive && !item.comingSoon ? 'tab-active' : ''} ${item.comingSoon ? 'tab-disabled' : ''}`}
              onClick={item.comingSoon ? (e) => e.preventDefault() : undefined}>
              <span className="tab-icon">{item.icon(isActive && !item.comingSoon)}</span>
              <span className="tab-label">{item.label}</span>
              {isActive && !item.comingSoon && <span className="tab-dot" />}
            </Link>
          );
        })}
      </nav>

      <style jsx>{`
        /* ======== DESKTOP SIDEBAR ======== */
        .desktop-sidebar {
          position: fixed;
          top: 0;
          left: 0;
          width: 240px;
          height: 100vh;
          background: #0f172a;
          border-right: 1px solid rgba(255,255,255,0.06);
          display: flex;
          flex-direction: column;
          z-index: 50;
        }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 24px 20px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .sidebar-logo-icon { font-size: 28px; }

        .sidebar-title {
          font-size: 17px;
          font-weight: 700;
          color: #f1f5f9;
          margin: 0;
          line-height: 1.2;
        }

        .sidebar-subtitle {
          font-size: 10px;
          color: #64748b;
          margin: 0;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .sidebar-nav {
          flex: 1;
          padding: 16px 12px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 10px;
          color: #94a3b8;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .sidebar-link:hover:not(.disabled) {
          background: rgba(255,255,255,0.04);
          color: #e2e8f0;
        }

        .sidebar-link.active {
          background: rgba(244, 114, 182, 0.1);
          color: #f472b6;
        }

        .sidebar-link.active:hover {
          background: rgba(244, 114, 182, 0.15) !important;
          color: #f472b6 !important;
        }

        .sidebar-link.disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .sidebar-link-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          flex-shrink: 0;
        }

        .sidebar-badge {
          margin-left: auto;
          font-size: 9px;
          padding: 2px 7px;
          border-radius: 9999px;
          background: rgba(255,255,255,0.06);
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .sidebar-footer {
          padding: 16px 20px;
          border-top: 1px solid rgba(255,255,255,0.06);
          font-size: 11px;
          color: #475569;
        }

        .sidebar-footer p { margin: 0; }

        /* ======== MOBILE HEADER ======== */
        .mobile-header {
          display: none;
        }

        /* ======== MOBILE TAB BAR ======== */
        .mobile-tabbar {
          display: none;
        }

        /* ======== RESPONSIVE ======== */
        @media (max-width: 768px) {
          .desktop-sidebar {
            display: none;
          }

          .mobile-header {
            display: flex;
            align-items: center;
            gap: 8px;
            position: sticky;
            top: 0;
            z-index: 40;
            padding: 12px 16px;
            background: rgba(15, 23, 42, 0.85);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-bottom: 1px solid rgba(255,255,255,0.06);
          }

          .mobile-header-icon {
            font-size: 22px;
          }

          .mobile-header-title {
            font-size: 16px;
            font-weight: 700;
            color: #f1f5f9;
            letter-spacing: -0.01em;
          }

          .mobile-tabbar {
            display: flex;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 50;
            background: rgba(15, 23, 42, 0.92);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border-top: 1px solid rgba(255,255,255,0.06);
            padding: 6px 8px calc(env(safe-area-inset-bottom, 8px) + 6px);
            justify-content: space-around;
            align-items: center;
          }

          .tab-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
            padding: 6px 16px;
            border-radius: 12px;
            text-decoration: none;
            color: #64748b;
            transition: all 0.2s ease;
            position: relative;
            -webkit-tap-highlight-color: transparent;
          }

          .tab-item:active:not(.tab-disabled) {
            transform: scale(0.92);
          }

          .tab-active {
            color: #f472b6;
          }

          .tab-disabled {
            opacity: 0.35;
          }

          .tab-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
          }

          .tab-label {
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 0.02em;
          }

          .tab-dot {
            position: absolute;
            top: 2px;
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background: #f472b6;
          }
        }
      `}</style>
    </>
  );
}
