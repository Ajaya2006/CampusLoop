import LiquidTabBar from '../navigation/LiquidTabBar';

/**
 * Section tabs. Kept as the app-wide entry point so every existing screen gets
 * the same travelling glass indicator as the main navigation.
 */
export default function Tabs({ items, value, onChange, className = '', ariaLabel = 'Section tabs' }) {
  return (
    <LiquidTabBar items={items} value={value} onChange={onChange} className={className} ariaLabel={ariaLabel} />
  );
}
