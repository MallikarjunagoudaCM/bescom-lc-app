import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token  = localStorage.getItem('bescom_token');
    const stored = localStorage.getItem('bescom_user');
    if (token && stored) {
      try { setUser(JSON.parse(stored)); } catch (_) {}
    }
    setLoading(false);
  }, []);

  // Unified login — username can be employeeId or office username
  const login = useCallback(async (username, password) => {
    const { data } = await authAPI.login({ username, password });
    localStorage.setItem('bescom_token', data.token);
    localStorage.setItem('bescom_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await authAPI.register(payload);
    localStorage.setItem('bescom_token', data.token);
    localStorage.setItem('bescom_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('bescom_token');
    localStorage.removeItem('bescom_user');
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await authAPI.getMe();
      localStorage.setItem('bescom_user', JSON.stringify(data.user));
      setUser(data.user);
    } catch (_) { logout(); }
  }, [logout]);

  return (
    <AuthContext.Provider value={{
      user, loading, login, logout, register, refreshUser,
      isEmployee:    user?.role === 'employee',
      isHR:          user?.role === 'hr_corporate',
      isOfficeAdmin: user?.role === 'office_admin',
      isOfficeAccount: user?.accountType === 'office_account'
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
