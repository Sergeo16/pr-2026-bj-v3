'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();
  const showDashboard = pathname?.includes('/dashboard');

  return (
    <nav className="navbar bg-base-100 shadow-lg">
      <div className="container mx-auto px-2 sm:px-4">
        <div className="flex-1">
          <Link href="/" className="btn btn-ghost text-lg sm:text-xl">
            PR 2026 BJ
          </Link>
        </div>
        <div className="flex-none">
          <ul className="menu menu-horizontal px-1 text-sm sm:text-base">
            <li>
              <Link href="/">Vote</Link>
            </li>
            {showDashboard && (
              <li>
                <Link href="/dashboard">Dashboard</Link>
              </li>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}

