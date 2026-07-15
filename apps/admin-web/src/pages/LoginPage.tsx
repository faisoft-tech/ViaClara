import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// RF-008 (real Cognito auth) is pending — this is a placeholder form with no
// real authentication. Submitting simply logs the staff member in and
// navigates to the dashboard, per the scaffold scope.
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    login();
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1 className="login-card__title">ViaClara</h1>
        <p className="login-card__subtitle">Panel de gestión municipal</p>

        <label className="field">
          <span className="field__label">Usuario</span>
          <input
            className="field__input"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="operador@ayuntamiento.es"
            autoComplete="username"
          />
        </label>

        <label className="field">
          <span className="field__label">Contraseña</span>
          <input
            className="field__input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </label>

        <button type="submit" className="button button--primary login-card__submit">
          Entrar
        </button>

        <p className="login-card__hint">
          Prototipo sin autenticación real — cualquier dato de acceso te llevará al panel.
        </p>
      </form>
    </div>
  );
}
