import { useEffect, useState } from 'react';
import { initials } from '../../utils/format';
import { mediaUrl } from '../../services/api';

const SIZES = {
  xs: 'h-7 w-7 text-[11px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-16 w-16 text-lg',
  xl: 'h-24 w-24 text-2xl',
};

export default function Avatar({ name = '', src, size = 'md', className = '' }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const showImage = Boolean(src) && !failed;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 font-semibold text-brand-700 ring-1 ring-inset ring-brand-200/60 dark:bg-brand-900/50 dark:text-brand-100 dark:ring-brand-800 ${SIZES[size] || SIZES.md} ${className}`}
      aria-hidden={!name}
      title={name}
    >
      {showImage ? (
        <img
          src={mediaUrl(src)}
          alt={name ? `${name}'s avatar` : 'Avatar'}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : name ? (
        initials(name)
      ) : (
        '?'
      )}
    </span>
  );
}
