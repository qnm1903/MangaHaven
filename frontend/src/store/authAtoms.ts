import { atom } from 'jotai';
import { AuthService } from '../services/auth_service';
import type { User } from '../services/auth_service';
import { readingHistoryAtom } from './historyAtoms';

interface AuthAtomState {
  user: User | null;
  token: string | null;
  loading: boolean;
}

const initialAuthState: AuthAtomState = {
  user: null,
  token: null,
  loading: true,
};

export const authStateAtom = atom<AuthAtomState>(initialAuthState);

// Guard: chỉ cho phép initializeAuthAtom chạy 1 lần duy nhất
let initPromise: Promise<void> | null = null;

export const initializeAuthAtom = atom(null, async (_get, set) => {
  // Nếu đang chạy hoặc đã chạy rồi → trả về promise cũ
  if (initPromise) return initPromise;

  initPromise = (async () => {
    set(authStateAtom, previousState => ({
      ...previousState,
      loading: true,
    }));

    const storedToken = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');

    let nextUser: User | null = null;
    let nextToken: string | null = null;

    const hadStoredSession = Boolean(storedToken || storedUser);

    if (storedUser) {
      try {
        nextUser = JSON.parse(storedUser) as User;
      } catch (error) {
        console.error('Failed to parse stored user data:', error);
        localStorage.removeItem('user');
      }
    }

    if (storedToken) {
      nextToken = storedToken;
    }

    set(authStateAtom, previousState => ({
      ...previousState,
      user: nextUser,
      token: nextToken,
      loading: true,
    }));

    try {
      const { accessToken } = await AuthService.refreshToken();
      localStorage.setItem('accessToken', accessToken);
      nextToken = accessToken;

      let refreshedUser = nextUser;
      try {
        const profile = await AuthService.getProfile();
        refreshedUser = profile;
        localStorage.setItem('user', JSON.stringify(profile));
      } catch (profileError) {
        console.error('Failed to fetch user profile during initialization:', profileError);
      }

      set(authStateAtom, previousState => ({
        ...previousState,
        user: refreshedUser,
        token: nextToken,
        loading: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '';
      const isNetworkError = errorMessage.includes('Network error');

      if (isNetworkError) {
        set(authStateAtom, previousState => ({
          ...previousState,
          loading: false,
        }));
        return;
      }

      if (hadStoredSession) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        set(authStateAtom, previousState => ({
          ...previousState,
          user: null,
          token: null,
          loading: false,
        }));
        return;
      }

      set(authStateAtom, previousState => ({
        ...previousState,
        user: null,
        token: null,
        loading: false,
      }));
    }
  })();

  return initPromise;
});

interface LoginPayload {
  token: string;
  user: User;
}

export const loginAtom = atom(null, (_get, set, payload: LoginPayload) => {
  localStorage.setItem('accessToken', payload.token);
  localStorage.setItem('user', JSON.stringify(payload.user));

  set(authStateAtom, previousState => ({
    ...previousState,
    token: payload.token,
    user: payload.user,
    loading: false,
  }));
});

export const logoutAtom = atom(null, async (_get, set) => {
  try {
    await AuthService.logout();
  } catch (error) {
    if (error instanceof Error) {
      console.error('Logout error:', error.message);
    } else {
      console.error('Logout error:', error);
    }
  } finally {
    // Clear reading history on logout
    set(readingHistoryAtom, []);
    
    set(authStateAtom, previousState => ({
      ...previousState,
      token: null,
      user: null,
      loading: false,
    }));
  }
});

export const googleAuthenticationAtom = atom(null, async (_get, set, credential: string) => {
  try {
    const response = await AuthService.googleAuth(credential);
    set(loginAtom, {
      token: response.data.accessToken,
      user: response.data.user,
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error('Google authentication failed');
  }
});

export const updateUserAtom = atom(null, (_get, set, user: User) => {
  localStorage.setItem('user', JSON.stringify(user));
  set(authStateAtom, previousState => ({
    ...previousState,
    user,
  }));
});

export const googleAuthenticationWithAccessTokenAtom = atom(null, async (_get, set, accessToken: string) => {
  try {
    const response = await AuthService.googleAuthWithAccessToken(accessToken);
    set(loginAtom, {
      token: response.data.accessToken,
      user: response.data.user,
    });
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error('Google authentication with access token failed');
  }
});
