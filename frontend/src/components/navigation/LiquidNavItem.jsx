import { Link } from 'react-router-dom';

export default function LiquidNavItem({ to, label, icon: Icon, active, badge, onClick, compact = false }) {
  return (
    <Link
      to={to}
      data-nav-item
      data-active={active ? 'true' : 'false'}
      aria-current={active ? 'page' : undefined}
      aria-label={badge ? `${label}, ${badge} unread` : label}
      onClick={onClick}
      className="liquid-nav__item"
    >
      {Icon ? (
        <span className="liquid-nav__icon">
          <Icon size={compact ? 18 : 16} strokeWidth={active ? 2.2 : 1.9} aria-hidden />
        </span>
      ) : null}
      <span>{label}</span>
      {badge ? <span className="liquid-nav__badge">{badge > 9 ? '9+' : badge}</span> : null}
    </Link>
  );
}
