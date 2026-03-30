import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { adminAuth, setAdminToken, clearAdminToken } from "../lib/adminApi";

type Admin = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type AdminAuthContextType = {
  admin: Admin | null;
  loading: boolean;
  login: (token: string, admin: Admin) => void;
  logout: () => void;
};

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("sf_admin_token");
    if (!token) {
      setLoading(false);
      return;
    }
    adminAuth
      .me()
      .then((data) => setAdmin(data))
      .catch(() => clearAdminToken())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback((token: string, adminData: Admin) => {
    setAdminToken(token);
    setAdmin(adminData);
  }, []);

  const logout = useCallback(() => {
    clearAdminToken();
    setAdmin(null);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
