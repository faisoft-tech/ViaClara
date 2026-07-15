import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="login-screen">
      <div className="login-card">
        <h1 className="login-card__title">404</h1>
        <p className="login-card__subtitle">Página no encontrada.</p>
        <Link to="/dashboard" className="button button--primary login-card__submit">
          Ir al panel
        </Link>
      </div>
    </div>
  );
}
