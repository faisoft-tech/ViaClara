import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS = { operator: 'Operario', administrator: 'Administrador' } as const;

export function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="app-header">
      <Link to="/dashboard" className="app-header__brand">
        ViaClara <span className="app-header__brand-sub">Panel municipal</span>
      </Link>
      <div className="app-header__user">
        {user && (
          <span className="card__muted">
            {user.email} · {ROLE_LABELS[user.role]}
          </span>
        )}
        <button type="button" className="button button--ghost" onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
