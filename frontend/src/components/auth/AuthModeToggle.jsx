import { useLocation, useNavigate } from 'react-router-dom';

const MODES = [
  { id: 'login', label: 'Sign in', to: '/login' },
  { id: 'register', label: 'Sign up', to: '/register' },
];

/** Segmented switch that slides between sign in and sign up. */
export default function AuthModeToggle() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const mode = pathname.startsWith('/register') ? 'register' : 'login';

  return (
    <div className="auth-toggle" data-mode={mode} role="tablist" aria-label="Account access">
      <span className="auth-toggle-thumb" aria-hidden />
      {MODES.map((item) => {
        const active = mode === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            data-active={active}
            onClick={() => {
              if (!active) navigate(item.to);
            }}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
