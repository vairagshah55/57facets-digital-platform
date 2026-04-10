import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, ShieldCheck, ArrowRight, ArrowLeft, Loader2, Timer } from "lucide-react";
import { auth as authApi } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "./ui/input-otp";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./ui/card";

type Step = "phone" | "otp";

const RESEND_COOLDOWN = 30; // seconds

export function RetailerLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) { clearInterval(timerRef.current!); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resendTimer]);

  const handleRequestOTP = useCallback(async () => {
    if (phone.length < 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await authApi.requestOtp(phone);
      setStep("otp");
      setResendTimer(RESEND_COOLDOWN);
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }, [phone]);

  const handleResendOTP = useCallback(async () => {
    if (resendTimer > 0) return;
    setError("");
    setLoading(true);
    try {
      await authApi.requestOtp(phone);
      setResendTimer(RESEND_COOLDOWN);
      setOtp("");
    } catch (err: any) {
      setError(err.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  }, [phone, resendTimer]);

  const handleVerifyOTP = useCallback(async () => {
    if (otp.length < 6) {
      setError("Please enter the complete 6-digit OTP");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const data = await authApi.verifyOtp(phone, otp);
      login(data.token, data.retailer);
      navigate("/retailer/catalog");
    } catch (err: any) {
      setError(err.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  }, [otp, phone, login, navigate]);

  const handleBack = useCallback(() => {
    setStep("phone");
    setOtp("");
    setError("");
    setResendTimer(0);
  }, []);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhone(value);
    if (error) setError("");
  };

  const handleOtpChange = (value: string) => {
    setOtp(value);
    if (error) setError("");
  };

  return (
    <section
      className="relative flex min-h-screen items-center justify-center px-4 py-20 overflow-hidden"
      style={{ backgroundColor: "var(--sf-bg-base)" }}
    >
      {/* Background ambient orbs */}
      <div
        className="absolute top-[-120px] left-[-80px] w-[400px] h-[400px] rounded-full blur-[120px] opacity-20"
        style={{ background: "var(--sf-blue-primary)" }}
      />
      <div
        className="absolute bottom-[-100px] right-[-60px] w-[350px] h-[350px] rounded-full blur-[100px] opacity-15"
        style={{ background: "var(--sf-teal)" }}
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
            {/* Diamond logo icon */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ backgroundColor: "var(--sf-teal-glass)", border: "1px solid var(--sf-teal-border)" }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
              >
                <path
                  d="M16 2L28 12L16 30L4 12L16 2Z"
                  stroke="var(--sf-teal)"
                  strokeWidth="1.5"
                  fill="none"
                />
                <path
                  d="M4 12H28M16 2L12 12L16 30L20 12L16 2Z"
                  stroke="var(--sf-teal)"
                  strokeWidth="1.5"
                  fill="none"
                  opacity="0.5"
                />
              </svg>
            </div>
            <p className="text-xs font-medium tracking-widest uppercase mb-1" style={{ color: "var(--sf-teal)", opacity: 0.8 }}>
              57 Facets
            </p>
            <CardTitle
              className="text-2xl font-semibold"
              style={{
                fontFamily: "'Melodrama', 'Georgia', serif",
                color: "var(--sf-text-primary)",
              }}
            >
              Retailer Portal
            </CardTitle>
            <CardDescription style={{ color: "var(--sf-text-secondary)" }}>
              {step === "phone"
                ? "Enter your registered phone number to receive an OTP"
                : `OTP sent to +91 ${phone.slice(0, 3)}****${phone.slice(7)}`}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2">
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <StepDot active={step === "phone"} completed={step === "otp"} label="1" />
              <div
                className="h-px w-10 transition-colors duration-300"
                style={{
                  backgroundColor:
                    step === "otp" ? "var(--sf-teal)" : "var(--sf-divider)",
                }}
              />
              <StepDot active={step === "otp"} completed={false} label="2" />
            </div>

            <AnimatePresence mode="wait">
              {step === "phone" ? (
                <motion.div
                  key="phone-step"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <label
                      className="text-sm font-medium"
                      style={{ color: "var(--sf-text-secondary)" }}
                    >
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                        style={{ color: "var(--sf-text-muted)" }}
                      />
                      <Input
                        type="tel"
                        placeholder="Enter 10-digit number"
                        value={phone}
                        onChange={handlePhoneChange}
                        className="pl-10 h-12 text-base border-[var(--sf-divider)] focus-visible:border-[var(--sf-teal)]"
                        style={{
                          backgroundColor: "var(--sf-bg-surface-2)",
                          color: "var(--sf-text-primary)",
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handleRequestOTP()}
                      />
                    </div>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium"
                      style={{
                        backgroundColor: "var(--sf-red-subtle)",
                        border: "1px solid var(--sf-red-border)",
                        color: "#ef4444",
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                        <circle cx="8" cy="8" r="7" stroke="#ef4444" strokeWidth="1.5" />
                        <path d="M8 4.5v4M8 10.5v.5" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      {error}
                    </motion.div>
                  )}

                  <Button
                    onClick={handleRequestOTP}
                    disabled={loading || phone.length < 10}
                    className="w-full h-12 text-base font-medium"
                    style={{
                      backgroundColor: "var(--sf-teal)",
                      color: "#fff",
                    }}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Request OTP
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="otp-step"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  onKeyDown={(e) => e.key === "Enter" && otp.length === 6 && handleVerifyOTP()}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div className="space-y-3">
                    {/* OTP icon + label */}
                    <div className="flex flex-col items-center gap-2 mb-2">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: "var(--sf-teal-glass)", border: "1px solid var(--sf-teal-border)" }}
                      >
                        <ShieldCheck className="w-5 h-5" style={{ color: "var(--sf-teal)" }} />
                      </div>
                      <p className="text-sm font-medium" style={{ color: "var(--sf-text-primary)" }}>
                        Verification Code
                      </p>
                      <p className="text-xs" style={{ color: "var(--sf-text-muted)" }}>
                        Enter the 6-digit code sent to your phone
                      </p>
                    </div>

                    {/* OTP input */}
                    <div className="flex justify-center py-2">
                      <InputOTP
                        maxLength={6}
                        value={otp}
                        onChange={handleOtpChange}
                      >
                        <InputOTPGroup>
                          {[0, 1, 2].map((i) => (
                            <InputOTPSlot
                              key={i}
                              index={i}
                              className="h-13 w-12 text-xl font-semibold border-[var(--sf-divider)] rounded-lg"
                              style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-primary)" }}
                            />
                          ))}
                        </InputOTPGroup>
                        <span className="text-lg font-bold mx-1" style={{ color: "var(--sf-text-muted)" }}>-</span>
                        <InputOTPGroup>
                          {[3, 4, 5].map((i) => (
                            <InputOTPSlot
                              key={i}
                              index={i}
                              className="h-13 w-12 text-xl font-semibold border-[var(--sf-divider)] rounded-lg"
                              style={{ backgroundColor: "var(--sf-bg-surface-2)", color: "var(--sf-text-primary)" }}
                            />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    {/* Resend OTP */}
                    <div className="flex items-center justify-center gap-1.5 pt-1">
                      <span className="text-xs" style={{ color: "var(--sf-text-muted)" }}>Didn't receive it?</span>
                      {resendTimer > 0 ? (
                        <span className="text-xs font-medium flex items-center gap-1" style={{ color: "var(--sf-text-muted)" }}>
                          <Timer className="w-3 h-3" />
                          {resendTimer}s
                        </span>
                      ) : (
                        <button
                          onClick={handleResendOTP}
                          disabled={loading}
                          className="text-xs font-semibold"
                          style={{ color: "var(--sf-teal)", background: "none", border: "none", cursor: "pointer" }}
                        >
                          Resend
                        </button>
                      )}
                    </div>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium"
                      style={{
                        backgroundColor: "var(--sf-red-subtle)",
                        border: "1px solid var(--sf-red-border)",
                        color: "#ef4444",
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                        <circle cx="8" cy="8" r="7" stroke="#ef4444" strokeWidth="1.5" />
                        <path d="M8 4.5v4M8 10.5v.5" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      {error}
                    </motion.div>
                  )}

                  <Button
                    onClick={handleVerifyOTP}
                    disabled={loading || otp.length < 6}
                    className="w-full h-12 text-base font-medium"
                    style={{
                      backgroundColor: "var(--sf-teal)",
                      color: "#fff",
                    }}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 mr-1" />
                        Verify & Login
                      </>
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={handleBack}
                    className="w-full h-10"
                    style={{ color: "var(--sf-text-secondary)" }}
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Change phone number
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>

          <CardFooter className="justify-center pt-0">
            <p className="text-xs" style={{ color: "var(--sf-text-muted)" }}>
              Authorized retailers only. Contact admin for access.
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </section>
  );
}

/* ── Step indicator dot ──────────────────────────────── */
function StepDot({
  active,
  completed,
  label,
}: {
  active: boolean;
  completed: boolean;
  label: string;
}) {
  return (
    <div
      className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300"
      style={{
        backgroundColor: active || completed
          ? "var(--sf-teal)"
          : "var(--sf-bg-surface-2)",
        color: active || completed
          ? "#fff"
          : "var(--sf-text-muted)",
        boxShadow: active ? "0 0 12px var(--sf-shadow-teal)" : "none",
      }}
    >
      {completed ? "✓" : label}
    </div>
  );
}
