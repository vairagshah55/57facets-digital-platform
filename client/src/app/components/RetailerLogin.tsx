import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, Navigate, Link } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, ShieldCheck, ArrowRight, ArrowLeft, Loader2, Timer, Search, X, ChevronDown } from "lucide-react";
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

type CountryCode = { name: string; code: string; flag: string };
const COUNTRY_CODES: CountryCode[] = [
  { name: "India", code: "+91", flag: "🇮🇳" },
  { name: "United States", code: "+1", flag: "🇺🇸" },
  { name: "United Kingdom", code: "+44", flag: "🇬🇧" },
  { name: "Canada", code: "+1", flag: "🇨🇦" },
  { name: "Australia", code: "+61", flag: "🇦🇺" },
  { name: "United Arab Emirates", code: "+971", flag: "🇦🇪" },
  { name: "Saudi Arabia", code: "+966", flag: "🇸🇦" },
  { name: "Singapore", code: "+65", flag: "🇸🇬" },
  { name: "Hong Kong", code: "+852", flag: "🇭🇰" },
  { name: "Malaysia", code: "+60", flag: "🇲🇾" },
  { name: "Thailand", code: "+66", flag: "🇹🇭" },
  { name: "Indonesia", code: "+62", flag: "🇮🇩" },
  { name: "Philippines", code: "+63", flag: "🇵🇭" },
  { name: "Japan", code: "+81", flag: "🇯🇵" },
  { name: "South Korea", code: "+82", flag: "🇰🇷" },
  { name: "China", code: "+86", flag: "🇨🇳" },
  { name: "Germany", code: "+49", flag: "🇩🇪" },
  { name: "France", code: "+33", flag: "🇫🇷" },
  { name: "Italy", code: "+39", flag: "🇮🇹" },
  { name: "Spain", code: "+34", flag: "🇪🇸" },
  { name: "Netherlands", code: "+31", flag: "🇳🇱" },
  { name: "Belgium", code: "+32", flag: "🇧🇪" },
  { name: "Switzerland", code: "+41", flag: "🇨🇭" },
  { name: "Russia", code: "+7", flag: "🇷🇺" },
  { name: "Brazil", code: "+55", flag: "🇧🇷" },
  { name: "Mexico", code: "+52", flag: "🇲🇽" },
  { name: "South Africa", code: "+27", flag: "🇿🇦" },
  { name: "Nigeria", code: "+234", flag: "🇳🇬" },
  { name: "Kenya", code: "+254", flag: "🇰🇪" },
  { name: "Egypt", code: "+20", flag: "🇪🇬" },
  { name: "Pakistan", code: "+92", flag: "🇵🇰" },
  { name: "Bangladesh", code: "+880", flag: "🇧🇩" },
  { name: "Sri Lanka", code: "+94", flag: "🇱🇰" },
  { name: "Nepal", code: "+977", flag: "🇳🇵" },
  { name: "New Zealand", code: "+64", flag: "🇳🇿" },
  { name: "Turkey", code: "+90", flag: "🇹🇷" },
  { name: "Israel", code: "+972", flag: "🇮🇱" },
  { name: "Qatar", code: "+974", flag: "🇶🇦" },
  { name: "Kuwait", code: "+965", flag: "🇰🇼" },
  { name: "Bahrain", code: "+973", flag: "🇧🇭" },
  { name: "Oman", code: "+968", flag: "🇴🇲" },
];

const RESEND_COOLDOWN = 30; // seconds

export function RetailerLogin() {
  const navigate = useNavigate();
  const { login, retailer, loading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const countryPickerRef = useRef<HTMLDivElement>(null);

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

  // Close country picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (countryPickerRef.current && !countryPickerRef.current.contains(e.target as Node)) {
        setShowCountryPicker(false);
        setCountrySearch("");
      }
    };
    if (showCountryPicker) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showCountryPicker]);

  const filteredCountries = COUNTRY_CODES.filter((c) => {
    const q = countrySearch.toLowerCase();
    if (!q) return true;
    return c.name.toLowerCase().includes(q) || c.code.includes(q);
  });

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

  // Already logged in — redirect after all hooks
  if (authLoading) return null;
  if (retailer) return <Navigate to="/retailer/catalog" replace />;

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
        {/* Back to website — sits flush above the card */}
        <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            marginBottom: "12px",
            fontSize: "12px",
            fontWeight: 500,
            color: "var(--sf-text-muted)",
            textDecoration: "none",
            transition: "color 0.2s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--sf-teal)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--sf-text-muted)")}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path d="M6 10.5L2.5 7L6 3.5M2.5 7H11.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to 57 Facets
        </Link>

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
                    <div className="flex gap-2">
                      {/* Country Code Picker */}
                      <div className="relative" ref={countryPickerRef}>
                        <button
                          type="button"
                          onClick={() => { setShowCountryPicker(!showCountryPicker); setCountrySearch(""); }}
                          className="flex items-center gap-1.5 h-12 px-3 rounded-lg border text-sm font-medium whitespace-nowrap transition-colors hover:opacity-80"
                          style={{
                            borderColor: "var(--sf-divider)",
                            backgroundColor: "var(--sf-bg-surface-2)",
                            color: "var(--sf-text-primary)",
                          }}
                        >
                          <span className="text-lg">{selectedCountry.flag}</span>
                          <span>{selectedCountry.code}</span>
                          <ChevronDown className="w-3 h-3 opacity-50" />
                        </button>

                        {/* Dropdown */}
                        {showCountryPicker && (
                          <div
                            className="absolute top-full left-0 mt-1 w-72 rounded-xl shadow-2xl border z-50 overflow-hidden"
                            style={{
                              backgroundColor: "var(--sf-bg-surface-1)",
                              borderColor: "var(--sf-divider)",
                            }}
                          >
                            {/* Search */}
                            <div className="p-2 border-b" style={{ borderColor: "var(--sf-divider)" }}>
                              <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--sf-text-muted)" }} />
                                <input
                                  type="text"
                                  placeholder="Search country or code..."
                                  value={countrySearch}
                                  onChange={(e) => setCountrySearch(e.target.value)}
                                  autoFocus
                                  className="w-full h-9 pl-8 pr-3 rounded-lg border text-sm focus:outline-none"
                                  style={{
                                    borderColor: "var(--sf-divider)",
                                    backgroundColor: "var(--sf-bg-surface-2)",
                                    color: "var(--sf-text-primary)",
                                  }}
                                />
                              </div>
                            </div>

                            {/* List */}
                            <ul className="max-h-[240px] overflow-y-auto py-1">
                              {filteredCountries.map((c) => (
                                <li
                                  key={`${c.name}-${c.code}`}
                                  onClick={() => {
                                    setSelectedCountry(c);
                                    setShowCountryPicker(false);
                                    setCountrySearch("");
                                  }}
                                  className="flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors text-sm"
                                  style={{
                                    color: "var(--sf-text-primary)",
                                    backgroundColor: selectedCountry.name === c.name ? "var(--sf-bg-surface-2)" : "transparent",
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--sf-bg-surface-2)"}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = selectedCountry.name === c.name ? "var(--sf-bg-surface-2)" : "transparent"}
                                >
                                  <span className="text-lg flex-shrink-0">{c.flag}</span>
                                  <span className="flex-1 truncate">{c.name}</span>
                                  <span className="flex-shrink-0 font-medium" style={{ color: "var(--sf-text-muted)" }}>{c.code}</span>
                                </li>
                              ))}
                              {filteredCountries.length === 0 && (
                                <li className="px-3 py-4 text-center text-sm" style={{ color: "var(--sf-text-muted)" }}>No results</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Phone Input */}
                      <div className="flex-1 relative">
                        <Phone
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                          style={{ color: "var(--sf-text-muted)" }}
                        />
                        <Input
                          type="tel"
                          placeholder="Enter 10-digit number"
                          value={phone}
                          onChange={handlePhoneChange}
                          className={`pl-10 h-12 text-base border-[var(--sf-divider)] focus-visible:border-[var(--sf-teal)] ${error ? "border-red-500 focus-visible:border-red-500" : ""}`}
                          style={{
                            backgroundColor: "var(--sf-bg-surface-2)",
                            color: "var(--sf-text-primary)",
                          }}
                          onKeyDown={(e) => e.key === "Enter" && handleRequestOTP()}
                        />
                      </div>
                    </div>
                    {error && (
                      <p className="text-red-500 text-sm mt-1">{error}</p>
                    )}
                  </div>

                  <Button
                    onClick={handleRequestOTP}
                    disabled={loading}
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
                              className={`h-13 w-12 text-xl font-semibold rounded-lg ${error ? "border-red-500" : "border-[var(--sf-divider)]"}`}
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
                              className={`h-13 w-12 text-xl font-semibold rounded-lg ${error ? "border-red-500" : "border-[var(--sf-divider)]"}`}
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
                    <p className="text-red-500 text-sm text-center">{error}</p>
                  )}

                  <Button
                    onClick={handleVerifyOTP}
                    disabled={loading}
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
