import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import Logo from './Logo';

const columns = [
  {
    title: 'Marketplace',
    links: [
      { to: '/marketplace', label: 'Browse listings' },
      { to: '/categories', label: 'Categories' },
      { to: '/sell', label: 'Sell an item' },
    ],
  },
  {
    title: 'Account',
    links: [
      { to: '/dashboard', label: 'Dashboard' },
      { to: '/my-listings', label: 'My listings' },
      { to: '/transactions', label: 'Transactions' },
    ],
  },
  {
    title: 'Trust & safety',
    links: [
      { to: '/verify', label: 'Student verification' },
      { to: '/settings', label: 'Account settings' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-surface/60">
      <div className="page-wrap grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo />
          <p className="mt-3 max-w-sm text-sm text-muted">
            A student-only marketplace for campus essentials. Verified accounts, moderated listings and
            transparent price guidance keep every deal safe.
          </p>
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-3 py-1 text-xs font-medium text-success">
            <ShieldCheck size={13} /> Verified students only
          </p>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{column.title}</h3>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-muted transition hover:text-ink">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="page-wrap flex flex-col items-center justify-between gap-2 py-4 text-xs text-muted sm:flex-row">
          <p>© {new Date().getFullYear()} CampusLoop · Academic project</p>
          <p>Offline, student-to-student deals. No payments are processed on CampusLoop.</p>
        </div>
      </div>
    </footer>
  );
}
