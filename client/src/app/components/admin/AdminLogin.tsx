import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../ui/card";
import { adminAuth } from "../../../lib/adminApi";
import { useAdminAuth } from "../../../context/AdminAuthContext";

export function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = useCallback(async () => {
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await adminAuth.login(email, password);
      login(data.token, data.admin);
      navigate("/admin/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }, [email, password, login, navigate]);

  return (
    <section
      className="relative flex min-h-screen items-center justify-center px-4 py-20 overflow-hidden"
      style={{ backgroundColor: "var(--sf-bg-base)" }}
    >
      <div
        className="absolute top-[-120px] right-[-80px] w-[400px] h-[400px] rounded-full blur-[120px] opacity-20"
        style={{ background: "var(--sf-blue-primary)" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <Card
          className="border-[var(--sf-divider)] backdrop-blur-sm"
          style={{ backgroundColor: "var(--sf-bg-surface-1)" }}
        >
          <CardHeader className="text-center pb-2">
            <div
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ backgroundColor: "var(--sf-bg-surface-2)" }}
            >
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="opacity-90">
                <path d="M16 2L28 12L16 30L4 12L16 2Z" stroke="var(--sf-blue-primary)" strokeWidth="1.5" fill="none" />
                <path d="M4 12H28M16 2L12 12L16 30L20 12L16 2Z" stroke="var(--sf-blue-primary)" strokeWidth="1.5" fill="none" opacity="0.5" />
              </svg>
            </div>
            <CardTitle
              className="text-2xl font-semibold"
              style={{ fontFamily: "'Melodrama', 'Georgia', serif", color: "var(--sf-text-primary)" }}
            >
              Admin Panel
            </CardTitle>
            <CardDescription style={{ color: "var(--sf-text-secondary)" }}>
              Sign in to manage 57Facets
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: "var(--sf-text-secondary)" }}>
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--sf-text-muted)" }} />
                <Input
                  type="email"
                  placeholder="admin@57facets.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  className="pl-10 h-12 text-base border-[var(--sf-divider)]"
                  style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-primary)" }}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" style={{ color: "var(--sf-text-secondary)" }}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--sf-text-muted)" }} />
                <Input
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  className="pl-10 h-12 text-base border-[var(--sf-divider)]"
                  style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-primary)" }}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm"
                style={{ color: "var(--destructive)" }}
              >
                {error}
              </motion.p>
            )}

            <Button
              onClick={handleLogin}
              disabled={loading || !email || !password}
              className="w-full h-12 text-base font-medium"
              style={{ backgroundColor: "var(--sf-blue-primary)", color: "var(--sf-text-primary)" }}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4 ml-1" /></>}
            </Button>
          </CardContent>

          <CardFooter className="justify-center pt-0">
            <p className="text-xs" style={{ color: "var(--sf-text-muted)" }}>
              57Facets Admin — Authorized personnel only
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </section>
  );
}
