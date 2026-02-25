import { useEffect, type ReactNode } from 'react';
import { useSetAtom } from 'jotai';
import { initializeAuthAtom } from '../store/authAtoms';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const initializeAuthState = useSetAtom(initializeAuthAtom);

  useEffect(() => {
    void initializeAuthState();
  }, [initializeAuthState]);

  return <>{children}</>;
}
