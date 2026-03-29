import { useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, ShieldCheck, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
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

export function RetailerLogin() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRequestOTP = useCallback(async () => {
    if (phone.length < 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }
    setError("");
    setLoading(true);
    // TODO: Replace with actual API call to request OTP
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    setStep("otp");
  }, [phone]);

  const handleVerifyOTP = useCallback(async () => {
    if (otp.length < 6) {
      setError("Please enter the complete 6-digit OTP");
      return;
    }
    setError("");
    setLoading(true);
    // TODO: Replace with actual API call to verify OTP
    await new Promise((r) => setTimeout(r, 1500));
    setLoading(false);
    navigate("/retailer/dashboard");
  }, [otp]);

  const handleBack = useCallback(() => {
    setStep("phone");
    setOtp("");
    setError("");
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
              style={{ backgroundColor: "var(--sf-bg-surface-2)" }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                className="opacity-90"
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
                    onClick={handleRequestOTP}
                    disabled={loading || phone.length < 10}
                    className="w-full h-12 text-base font-medium"
                    style={{
                      backgroundColor: "var(--sf-blue-primary)",
                      color: "var(--sf-text-primary)",
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
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <label
                      className="text-sm font-medium"
                      style={{ color: "var(--sf-text-secondary)" }}
                    >
                      Enter OTP
                    </label>
                    <div className="flex justify-center">
                      <InputOTP
                        maxLength={6}
                        value={otp}
                        onChange={handleOtpChange}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot
                            index={0}
                            className="h-12 w-12 text-lg border-[var(--sf-divider)]"
                            style={{ backgroundColor: "var(--sf-bg-surface-2)" }}
                          />
                          <InputOTPSlot
                            index={1}
                            className="h-12 w-12 text-lg border-[var(--sf-divider)]"
                            style={{ backgroundColor: "var(--sf-bg-surface-2)" }}
                          />
                          <InputOTPSlot
                            index={2}
                            className="h-12 w-12 text-lg border-[var(--sf-divider)]"
                            style={{ backgroundColor: "var(--sf-bg-surface-2)" }}
                          />
                          <InputOTPSlot
                            index={3}
                            className="h-12 w-12 text-lg border-[var(--sf-divider)]"
                            style={{ backgroundColor: "var(--sf-bg-surface-2)" }}
                          />
                          <InputOTPSlot
                            index={4}
                            className="h-12 w-12 text-lg border-[var(--sf-divider)]"
                            style={{ backgroundColor: "var(--sf-bg-surface-2)" }}
                          />
                          <InputOTPSlot
                            index={5}
                            className="h-12 w-12 text-lg border-[var(--sf-divider)]"
                            style={{ backgroundColor: "var(--sf-bg-surface-2)" }}
                          />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <p
                      className="text-xs text-center mt-2"
                      style={{ color: "var(--sf-text-muted)" }}
                    >
                      OTP will be provided by the admin
                    </p>
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
                    onClick={handleVerifyOTP}
                    disabled={loading || otp.length < 6}
                    className="w-full h-12 text-base font-medium"
                    style={{
                      backgroundColor: "var(--sf-blue-primary)",
                      color: "var(--sf-text-primary)",
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
          ? "var(--sf-bg-base)"
          : "var(--sf-text-muted)",
        boxShadow: active ? "0 0 12px rgba(48, 184, 191, 0.4)" : "none",
      }}
    >
      {completed ? "✓" : label}
    </div>
  );
}
