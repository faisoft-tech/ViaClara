import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { NotStaffError, useAuth } from '../context/AuthContext';
import { confirmForgotPassword, describeAuthError, forgotPassword } from '../lib/cognito';

type Step =
  | { kind: 'signIn' }
  | { kind: 'newPassword'; session: string }
  | { kind: 'forgotRequest' }
  | { kind: 'forgotConfirm' };

// Municipal staff sign in with the email an administrator invited them with.
export function LoginPage() {
  const { user, login, setNewPassword } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>({ kind: 'signIn' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPasswordValue] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof NotStaffError ? err.message : describeAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const goTo = (next: Step) => {
    setError(null);
    setInfo(null);
    setStep(next);
  };

  const passwordsMatch = () => {
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return false;
    }
    return true;
  };

  const handleSignIn = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const result = await login(email, password);
      if (result.kind === 'newPasswordRequired') {
        setPassword('');
        setStep({ kind: 'newPassword', session: result.session });
        setInfo('Es tu primer acceso: elige una contraseña nueva.');
        return;
      }
      navigate('/dashboard', { replace: true });
    });
  };

  const handleNewPassword = (event: FormEvent, session: string) => {
    event.preventDefault();
    if (!passwordsMatch()) return;
    void run(async () => {
      await setNewPassword(email, newPassword, session);
      navigate('/dashboard', { replace: true });
    });
  };

  const handleForgotRequest = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      await forgotPassword(email.trim().toLowerCase());
      setStep({ kind: 'forgotConfirm' });
      setInfo('Si el correo tiene acceso al panel, te hemos enviado un código.');
    });
  };

  const handleForgotConfirm = (event: FormEvent) => {
    event.preventDefault();
    if (!passwordsMatch()) return;
    void run(async () => {
      await confirmForgotPassword(email.trim().toLowerCase(), code.trim(), newPassword);
      setPassword('');
      setCode('');
      setNewPasswordValue('');
      setConfirmPassword('');
      setStep({ kind: 'signIn' });
      setInfo('Contraseña cambiada. Ya puedes entrar.');
    });
  };

  const emailField = (
    <label className="field">
      <span className="field__label">Correo electrónico</span>
      <input
        className="field__input"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="nombre@ayuntamiento.es"
        autoComplete="username"
        disabled={step.kind === 'newPassword' || step.kind === 'forgotConfirm'}
      />
    </label>
  );

  const newPasswordFields = (
    <>
      <label className="field">
        <span className="field__label">Nueva contraseña</span>
        <input
          className="field__input"
          type="password"
          required
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPasswordValue(e.target.value)}
          autoComplete="new-password"
        />
      </label>
      <label className="field">
        <span className="field__label">Repite la contraseña</span>
        <input
          className="field__input"
          type="password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
        />
      </label>
      <p className="login-card__hint">Mínimo 8 caracteres, con mayúsculas, minúsculas, números y símbolos.</p>
    </>
  );

  return (
    <div className="login-screen">
      <form
        className="login-card"
        onSubmit={(event) => {
          if (step.kind === 'signIn') handleSignIn(event);
          else if (step.kind === 'newPassword') handleNewPassword(event, step.session);
          else if (step.kind === 'forgotRequest') handleForgotRequest(event);
          else handleForgotConfirm(event);
        }}
      >
        <h1 className="login-card__title">ViaClara</h1>
        <p className="login-card__subtitle">Panel de gestión municipal</p>

        {info && <p className="login-card__info">{info}</p>}
        {error && (
          <p className="login-card__error" role="alert">
            {error}
          </p>
        )}

        {emailField}

        {step.kind === 'signIn' && (
          <label className="field">
            <span className="field__label">Contraseña</span>
            <input
              className="field__input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
        )}

        {step.kind === 'forgotConfirm' && (
          <label className="field">
            <span className="field__label">Código recibido por correo</span>
            <input
              className="field__input"
              inputMode="numeric"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="one-time-code"
            />
          </label>
        )}

        {(step.kind === 'newPassword' || step.kind === 'forgotConfirm') && newPasswordFields}

        <button type="submit" className="button button--primary login-card__submit" disabled={busy}>
          {busy
            ? 'Un momento…'
            : step.kind === 'signIn'
              ? 'Entrar'
              : step.kind === 'forgotRequest'
                ? 'Enviar código'
                : 'Guardar contraseña'}
        </button>

        {step.kind === 'signIn' ? (
          <button type="button" className="button button--ghost" onClick={() => goTo({ kind: 'forgotRequest' })}>
            ¿Has olvidado tu contraseña?
          </button>
        ) : (
          <button type="button" className="button button--ghost" onClick={() => goTo({ kind: 'signIn' })}>
            Volver
          </button>
        )}

        <p className="login-card__hint">
          Acceso solo para personal municipal. Si necesitas una cuenta, pídela a un administrador.
        </p>
      </form>
    </div>
  );
}
