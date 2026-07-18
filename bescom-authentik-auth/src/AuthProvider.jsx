import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { UserManager, WebStorageStateStore } from 'oidc-client-ts';

const AuthContext = createContext(null);

/**
 * Wraps the app, owns the UserManager instance, and exposes { user, loading,
 * login, logout, userManager } via useAuth().
 *
 * `user` is null until a session is established. Once set, `user.profile`
 * carries whatever claims Authentik's Property Mappings emit — commonly
 * `sub`, `email`, `name`, `preferred_username`, and `groups` if the groups
 * scope/mapping is attached on the Provider.
 */
export function AuthProvider({ config, children }) {
  const userManager = useMemo(
    () =>
      new UserManager({
        ...config,
        userStore: new WebStorageStateStore({ store: window.localStorage }),
        stateStore: new WebStorageStateStore({ store: window.localStorage }),
      }),
    // config is expected to be a stable object from the consuming app
    // (built once via createOidcConfig), not re-created on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    userManager
      .getUser()
      .then((u) => {
        if (mounted) setUser(u && !u.expired ? u : null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const onUserLoaded = (u) => setUser(u);
    const onUserUnloaded = () => setUser(null);
    userManager.events.addUserLoaded(onUserLoaded);
    userManager.events.addUserUnloaded(onUserUnloaded);

    return () => {
      mounted = false;
      userManager.events.removeUserLoaded(onUserLoaded);
      userManager.events.removeUserUnloaded(onUserUnloaded);
    };
  }, [userManager]);

  const value = useMemo(
    () => ({
      user,
      loading,
      userManager,
      login: () => userManager.signinRedirect(),
      logout: () => userManager.signoutRedirect(),
    }),
    [user, loading, userManager]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth() must be used within <AuthProvider>');
  }
  return ctx;
}
