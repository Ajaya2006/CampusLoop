import { Link } from 'react-router-dom';
import { cx } from '../../utils/format';
import logoMark from '../../assets/brand/logo-mark.png';

const SIZES = {
  sm: {
    tile: 'h-11 w-11 rounded-[12px] p-[2px]',
    word: 'text-[21px]',
    tag: 'text-[10.5px]',
  },
  lg: {
    tile: 'h-16 w-16 rounded-[18px] p-[3px]',
    word: 'text-[30px]',
    tag: 'text-[11px]',
  },
};

export default function Logo({ compact = false, size = 'sm', className = '' }) {
  const scale = SIZES[size] || SIZES.sm;

  return (
    <Link to="/" className={cx('group inline-flex items-center gap-2.5', className)} aria-label="CampusLoop home">
      <span
        className={cx(
          'relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-white',
          'shadow-[0_1px_2px_rgba(27,42,64,0.16)] ring-1 ring-black/10 transition duration-200 group-hover:scale-[1.04]',
          scale.tile,
        )}
      >
        <img src={logoMark} alt="CampusLoop" className="h-full w-full object-contain" />
      </span>

      {!compact ? (
        <span className="flex flex-col leading-none">
          <span className={cx('font-brand font-extrabold leading-none tracking-[-0.035em] text-ink', scale.word)}>
            Campus<span className="text-brand-500">Loop</span>
          </span>
          <span className={cx('mt-0.5 font-medium uppercase tracking-[0.14em] text-muted', scale.tag)}>
            Buy · Sell · Connect
          </span>
        </span>
      ) : null}
    </Link>
  );
}
