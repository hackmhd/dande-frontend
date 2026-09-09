'use client';

import { usePathname, useRouter } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Accueil', icon: 'home' },
  { href: '/challenges', label: 'Défis', icon: 'target' },
  { href: '/history', label: 'Historique', icon: 'list' },
  { href: '/profile', label: 'Profil', icon: 'user' },
];

function Icon({ name, active }: { name: string; active: boolean }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (name) {
    case 'home':
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
        </svg>
      );
    case 'target':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="12" cy="12" r="0.8" fill="currentColor" />
        </svg>
      );
    case 'list':
      return (
        <svg {...common}>
          <path d="M8 6h12M8 12h12M8 18h12" />
          <circle cx="4" cy="6" r="0.9" fill="currentColor" />
          <circle cx="4" cy="12" r="0.9" fill="currentColor" />
          <circle cx="4" cy="18" r="0.9" fill="currentColor" />
        </svg>
      );
    case 'user':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
        </svg>
      );
    default:
      return null;
  }
}

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t border-sand-200 bg-white/95 backdrop-blur transition-colors dark:border-night-700 dark:bg-night-900/95">
      <div className="flex items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-1.5">
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 py-1.5 transition-all duration-200 active:scale-90 ${
                active
                  ? 'text-forest-700 dark:text-iris-300'
                  : 'text-ink-faint dark:text-iris-100/40'
              }`}
            >
              <Icon name={item.icon} active={active} />
              <span
                className={`text-[11px] ${active ? 'font-medium' : ''}`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
