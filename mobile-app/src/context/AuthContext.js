import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as defaultAuthApi from '../api/authApi';

// Who is logged in. This is the only truly global state in the app (D-012: Context, no Redux).
//   status: 'loading'   -> looking for a saved login when the app opens
//           'signedOut' -> show Welcome / Login / Register
//           'signedIn'  -> show the app
// `api` can be replaced in tests.

const AuthContext = createContext(null);

export function AuthProvider({ children, api = defaultAuthApi }) {
  const [state, setState] = useState({ status: 'loading', user: null, token: null });

  useEffect(() => {
    let alive = true;
    api
      .restoreSession()
      .then((session) => {
        if (!alive) return;
        setState(session ? { status: 'signedIn', user: session.user, token: session.token } : { status: 'signedOut', user: null, token: null });
      })
      .catch(() => {
        if (alive) setState({ status: 'signedOut', user: null, token: null });
      });
    return () => {
      alive = false;
    };
  }, [api]);

  const signIn = useCallback(
    async (credentials) => {
      const { user, token } = await api.login(credentials);
      setState({ status: 'signedIn', user, token });
    },
    [api]
  );

  const signUp = useCallback(
    async (details) => {
      const { user, token } = await api.register(details);
      setState({ status: 'signedIn', user, token });
    },
    [api]
  );

  const signOut = useCallback(async () => {
    await api.logout();
    setState({ status: 'signedOut', user: null, token: null });
  }, [api]);

  const value = useMemo(() => ({ ...state, signIn, signUp, signOut }), [state, signIn, signUp, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>.');
  return value;
}
