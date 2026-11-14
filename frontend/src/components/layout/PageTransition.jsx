import { useLocation } from 'react-router-dom';

export default function PageTransition({ children, className = '' }) {
  const { pathname } = useLocation();
  const key = pathname.startsWith('/messages') ? '/messages' : pathname;

  return (
    <div key={key} className={`page-transition ${className}`.trim()}>
      {children}
    </div>
  );
}
