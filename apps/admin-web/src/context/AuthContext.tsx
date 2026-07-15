import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

// Placeholder auth for this scaffold — RF-008 (real Cognito auth) is
// pending. Just tracks whether the staff member has "logged in" so the
// dashboard route can redirect back to the login screen otherwise.

type AuthValue = {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const value = useMemo<AuthValue>(
    () => ({
      isAuthenticated,
      login: () => setIsAuthenticated(true),
      logout: () => setIsAuthenticated(false),
    }),
    [isAuthenticated],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
