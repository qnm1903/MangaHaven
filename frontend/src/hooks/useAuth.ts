// frontend/src/hooks/useAuth.ts
import { useAtomValue, useSetAtom } from 'jotai';
import type { User } from '../services/auth_service';
import {
  authStateAtom,
  loginAtom,
  logoutAtom,
  googleAuthenticationAtom,
  googleAuthenticationWithAccessTokenAtom,
} from '../store/authAtoms';

export interface AuthStateValue {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  loading: boolean;
  googleAuth: (credential: string) => Promise<void>;
  googleAuthWithAccessToken: (accessToken: string) => Promise<void>;
}

export function useAuth(): AuthStateValue {
  const authState = useAtomValue(authStateAtom);
  const setLogin = useSetAtom(loginAtom); // Helper setter

  const login = (token: string, user: User) => {
    setLogin({ token, user });
  };

  const logout = useSetAtom(logoutAtom);
  const googleAuth = useSetAtom(googleAuthenticationAtom);
  const googleAuthWithAccessToken = useSetAtom(googleAuthenticationWithAccessTokenAtom);

  return {
    user: authState.user,
    token: authState.token,
    loading: authState.loading,
    login,
    logout,
    googleAuth,
    googleAuthWithAccessToken,
  };
}