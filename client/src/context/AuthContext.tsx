import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { auth as authApi, setToken, clearToken } from "../lib/api";

type Retailer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  companyName: string;
  firstLogin: boolean;
};

type AuthContextType = {
  retailer: Retailer | null;
  loading: boolean;
  login: (token: string, retailer: Retailer) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [retailer, setRetailer] = useState<Retailer | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, check if we have a valid token
  useEffect(() => {
    const token = localStorage.getItem("sf_token");
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then((data) => setRetailer(data))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback((token: string, retailerData: Retailer) => {
    setToken(token);
    setRetailer(retailerData);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setRetailer(null);
  }, []);

  return (
    <AuthContext.Provider value={{ retailer, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
