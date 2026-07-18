import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from '../api/auth.api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    try {
      const promise = authApi.me();
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000));
      const { data } = await Promise.race([promise, timeout]);
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem('accessToken')) fetchMe();
    else setLoading(false);
  }, [fetchMe]);

  const login = async (phone, password) => {
    const { data } = await authApi.login({ phone, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    return data.user;
  };

  // Used by the Authentik SSO callback flow — the backend has already
  // verified the SSO token and matched it to an existing Mongo User by
  // that point, so this just stores the resulting app tokens the same way
  // the password-based login() does.
  const loginWithTokens = (accessToken, refreshToken, user) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(user);
    return user;
  };

  const logout = async () => {
    try { await authApi.logout(); } catch {}
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    toast.success('Logged out');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithTokens, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
