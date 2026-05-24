import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true); // checking stored token on mount

  // On mount: validate stored token
  useEffect(() => {
    const token = localStorage.getItem("voyage_token");
    if (!token) { setLoading(false); return; }
    api.getMe()
      .then(({ user }) => setUser(user))
      .catch(() => localStorage.removeItem("voyage_token"))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, user } = await api.login({ email, password });
    localStorage.setItem("voyage_token", token);
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (name, email, password, phone) => {
    const { token, user } = await api.register({ name, email, password, phone });
    localStorage.setItem("voyage_token", token);
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("voyage_token");
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const { user } = await api.getMe();
    setUser(user);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, isAdmin: user?.role === "admin" }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
