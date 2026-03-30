import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);
export { AuthContext };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPermissions = async () => {
    try {
      const perms = await api.getMyPermissions();
      setPermissions(Array.isArray(perms) ? perms : []);
    } catch {
      setPermissions([]);
    }
  };

  useEffect(() => {
    api.getMe()
      .then(async (data) => {
        setUser(data.user);
        await loadPermissions();
      })
      .catch(() => {
        setUser(null);
        setPermissions([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const data = await api.login(username, password);
    setUser(data.user);
    await loadPermissions();
    return data.user;
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    setPermissions([]);
  };

  const hasPermission = useCallback((perm) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    // Unterstützt sowohl altes Format (tickets.view) als auch neues (tickets:view)
    return (Array.isArray(user.permissions) && user.permissions.includes(perm))
      || (Array.isArray(permissions) && permissions.includes(perm));
  }, [user, permissions]);

  return (
    <AuthContext.Provider value={{ user, permissions, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
