import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authAPI, setTokens, clearTokens, getToken } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isAuthenticated = !!user && !!getToken();

  const login = useCallback(async (email, password) => {
    setLoading(true); setError(null);
    try {
      const data = await authAPI.login(email, password);
      setTokens(data.accessToken, data.refreshToken);
      // Normalize _id so user.id and user._id both work
      const normalizedUser = { ...data.user, id: data.user.id || data.user._id };
      localStorage.setItem("user", JSON.stringify(normalizedUser));
      setUser(normalizedUser);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally { setLoading(false); }
  }, []);

  const register = useCallback(async (payload) => {
    setLoading(true); setError(null);
    try {
      const data = await authAPI.register(payload);
      setTokens(data.accessToken, data.refreshToken);
      const normalizedUser = { ...data.user, id: data.user.id || data.user._id };
      localStorage.setItem("user", JSON.stringify(normalizedUser));
      setUser(normalizedUser);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally { setLoading(false); }
  }, []);

  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch { /* ignore */ }
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, isAuthenticated, login, register, logout, setError }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
