import { useEffect, useState } from 'react';
import { cx } from '../../utils/format';
import { DEFAULT_CATEGORY_IMAGE } from '../../utils/categoryImages';
import { mediaUrl } from '../../services/api';

/** Product photo that falls back to a matching category shot instead of an icon. */
export default function ProductImage({
  src,
  alt = '',
  fallback = DEFAULT_CATEGORY_IMAGE,
  className = '',
  imgClassName = '',
}) {
  const [current, setCurrent] = useState(mediaUrl(src) || fallback);

  useEffect(() => {
    setCurrent(mediaUrl(src) || fallback);
  }, [src, fallback]);

  return (
    <div className={cx('overflow-hidden bg-elevated', className)} role="img" aria-label={alt || 'Product photo'}>
      <img
        src={current}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => {
          if (current !== fallback) setCurrent(fallback);
        }}
        className={cx('h-full w-full object-cover', imgClassName)}
      />
    </div>
  );
}
