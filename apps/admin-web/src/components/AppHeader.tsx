import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function AppHeader() {
  const { logout } = useAuth();
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
      <button type="button" className="button button--ghost" onClick={handleLogout}>
        Cerrar sesión
      </button>
    </header>
  );
}
