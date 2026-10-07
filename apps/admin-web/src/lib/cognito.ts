// Minimal client for the public Cognito user pool API. The app client has no
// secret, so these calls need no AWS credentials — plain fetch is enough.

const REGION = import.meta.env.VITE_COGNITO_REGION;
const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID;
const ENDPOINT = `https://cognito-idp.${REGION}.amazonaws.com/`;

export type Tokens = {
  accessToken: string;
  idToken: string;
  refreshToken: string;
};

export type SignInResult =
  | { kind: 'signedIn'; tokens: Tokens }
  | { kind: 'newPasswordRequired'; session: string };

type AuthenticationResult = { AccessToken: string; IdToken: string; RefreshToken?: string };
type AuthResponse = { AuthenticationResult?: AuthenticationResult; ChallengeName?: string; Session?: string };

export class CognitoError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(operation: string, body: object): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-amz-json-1.1',
      'X-Amz-Target': `AWSCognitoIdentityProviderService.${operation}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const code = String(data.__type ?? 'UnknownError').split('#').pop()!;
    throw new CognitoError(code, data.message ?? code);
  }
  return data as T;
}

function toResult(resp: AuthResponse, previousRefreshToken?: string): SignInResult {
  if (resp.AuthenticationResult) {
    const r = resp.AuthenticationResult;
    return {
      kind: 'signedIn',
      tokens: {
        accessToken: r.AccessToken,
        idToken: r.IdToken,
        refreshToken: r.RefreshToken ?? previousRefreshToken ?? '',
      },
    };
  }
  if (resp.ChallengeName === 'NEW_PASSWORD_REQUIRED' && resp.Session) {
    return { kind: 'newPasswordRequired', session: resp.Session };
  }
  throw new CognitoError('UnexpectedChallenge', `Unexpected challenge: ${resp.ChallengeName}`);
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const resp = await call<AuthResponse>('InitiateAuth', {
    AuthFlow: 'USER_AUTH',
    ClientId: CLIENT_ID,
    AuthParameters: { USERNAME: email, PREFERRED_CHALLENGE: 'PASSWORD', PASSWORD: password },
  });
  return toResult(resp);
}

export async function completeNewPassword(email: string, newPassword: string, session: string): Promise<Tokens> {
  const resp = await call<AuthResponse>('RespondToAuthChallenge', {
    ChallengeName: 'NEW_PASSWORD_REQUIRED',
    ClientId: CLIENT_ID,
    Session: session,
    ChallengeResponses: { USERNAME: email, NEW_PASSWORD: newPassword },
  });
  const result = toResult(resp);
  if (result.kind !== 'signedIn') throw new CognitoError('UnexpectedChallenge', 'Unexpected challenge');
  return result.tokens;
}

export async function refreshTokens(refreshToken: string): Promise<Tokens> {
  const resp = await call<AuthResponse>('InitiateAuth', {
    AuthFlow: 'REFRESH_TOKEN_AUTH',
    ClientId: CLIENT_ID,
    AuthParameters: { REFRESH_TOKEN: refreshToken },
  });
  const result = toResult(resp, refreshToken);
  if (result.kind !== 'signedIn') throw new CognitoError('UnexpectedChallenge', 'Unexpected challenge');
  return result.tokens;
}

export async function forgotPassword(email: string): Promise<void> {
  await call('ForgotPassword', { ClientId: CLIENT_ID, Username: email });
}

export async function confirmForgotPassword(email: string, code: string, newPassword: string): Promise<void> {
  await call('ConfirmForgotPassword', {
    ClientId: CLIENT_ID,
    Username: email,
    ConfirmationCode: code,
    Password: newPassword,
  });
}

export function decodeJwt(token: string): Record<string, unknown> {
  const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  const json = decodeURIComponent(
    atob(payload)
      .split('')
      .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join(''),
  );
  return JSON.parse(json);
}

export function describeAuthError(error: unknown): string {
  if (!(error instanceof CognitoError)) return 'No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.';
  switch (error.code) {
    case 'NotAuthorizedException':
      return error.message.includes('expired')
        ? 'La contraseña temporal ha caducado. Pide a un administrador que te invite de nuevo.'
        : 'Correo o contraseña incorrectos.';
    case 'InvalidPasswordException':
      return 'La contraseña debe tener al menos 8 caracteres, con mayúsculas, minúsculas, números y símbolos.';
    case 'CodeMismatchException':
      return 'El código no es correcto.';
    case 'ExpiredCodeException':
      return 'El código ha caducado. Solicita uno nuevo.';
    case 'LimitExceededException':
    case 'TooManyRequestsException':
      return 'Demasiados intentos. Espera unos minutos.';
    case 'PasswordResetRequiredException':
      return 'Debes restablecer tu contraseña. Usa "¿Has olvidado tu contraseña?".';
    default:
      return error.message;
  }
}
