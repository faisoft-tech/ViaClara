import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  completeNewPassword,
  CognitoError,
  decodeJwt,
  refreshTokens,
  signIn,
  type Tokens,
} from '../lib/cognito';
import type { UserRole } from '../types/incident';

// Staff authentication against the Cognito user pool (email + password).
// Citizens use phone + SMS in the mobile app and are rejected here.

const STORAGE_KEY = 'viaclara.admin.session';
const REFRESH_MARGIN_MS = 60_000;

export type StaffUser = {
  email: string;
  role: Exclude<UserRole, 'citizen'>;
};

type Session = Tokens & { expiresAt: number; user: StaffUser };

export type LoginResult = { kind: 'signedIn' } | { kind: 'newPasswordRequired'; session: string };

type AuthValue = {
  user: StaffUser | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  setNewPassword: (email: string, newPassword: string, session: string) => Promise<void>;
  logout: () => void;
  getAccessToken: () => Promise<string | null>;
};

export class NotStaffError extends Error {}

function toSession(tokens: Tokens): Session {
  const access = decodeJwt(tokens.accessToken);
  const id = decodeJwt(tokens.idToken);
  const groups = (access['cognito:groups'] as string[] | undefined) ?? [];
  const role = groups.includes('administrators') ? 'administrator' : groups.includes('operators') ? 'operator' : null;
  if (!role) throw new NotStaffError('Esta cuenta no tiene acceso al panel municipal.');
  return {
    ...tokens,
    expiresAt: (access.exp as number) * 1000,
    user: { email: String(id.email ?? ''), role },
  };
}

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function storeSession(session: Session | null) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode): the session lives in memory only.
  }
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(loadSession);
  const sessionRef = useRef(session);
  const refreshing = useRef<Promise<string | null> | null>(null);

  const setSession = useCallback((next: Session | null) => {
    sessionRef.current = next;
    storeSession(next);
    setSessionState(next);
  }, []);

  const logout = useCallback(() => setSession(null), [setSession]);

  const getAccessToken = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) return null;
    if (current.expiresAt - Date.now() > REFRESH_MARGIN_MS) return current.accessToken;

    // Share one in-flight refresh between concurrent requests.
    refreshing.current ??= refreshTokens(current.refreshToken)
      .then((tokens) => {
        const next = toSession(tokens);
        setSession(next);
        return next.accessToken;
      })
      .catch((error) => {
        if (error instanceof CognitoError || error instanceof NotStaffError) setSession(null);
        return null;
      })
      .finally(() => {
        refreshing.current = null;
      });
    return refreshing.current;
  }, [setSession]);

  const value = useMemo<AuthValue>(
    () => ({
      user: session?.user ?? null,
      login: async (email, password) => {
        const result = await signIn(email.trim().toLowerCase(), password);
        if (result.kind === 'newPasswordRequired') return result;
        setSession(toSession(result.tokens));
        return { kind: 'signedIn' };
      },
      setNewPassword: async (email, newPassword, challengeSession) => {
        const tokens = await completeNewPassword(email.trim().toLowerCase(), newPassword, challengeSession);
        setSession(toSession(tokens));
      },
      logout,
      getAccessToken,
    }),
    [session, setSession, logout, getAccessToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
