import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Mail, Key, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAction, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  
  // Convex actions/mutations
  const sendOTP = useAction(api.mailer.sendOTP);
  const verifyOTP = useMutation(api.auth.verifyOTP);

  // States
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email'); // 'email' or 'otp'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);

  // Resend Timer Effect
  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [resendTimer]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError(null);
    setDevOtpHint(null);

    try {
      const res = await sendOTP({ email: email.trim().toLowerCase() });
      if (res.success) {
        setStep('otp');
        setResendTimer(60);
        
        // Show development OTP hint if SMTP is not configured
        if (res.devMode && res.otp) {
          setDevOtpHint(`[Dev Mode] SMTP not configured. Use OTP: ${res.otp}`);
        }
      } else {
        if (res.reason === "USER_NOT_FOUND") {
          setError("This email address is not registered in the system. Please contact the Administrator.");
        } else if (res.reason === "USER_INACTIVE") {
          setError("Your account has been deactivated. Please contact the Administrator.");
        } else {
          setError(`Failed to send OTP: ${res.errorDetail || res.reason || "SMTP Error"}. Please check your Convex environment variables.`);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError("An unexpected network error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;

    setLoading(true);
    setError(null);

    try {
      const res = await verifyOTP({ 
        email: email.trim().toLowerCase(), 
        otp: otp.trim() 
      });

      if (res.success) {
        // Authenticate locally in AuthContext
        await signIn(email.trim().toLowerCase());
        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        if (res.reason === "INVALID_OTP") {
          setError("Invalid verification code. Please check and try again.");
        } else if (res.reason === "OTP_EXPIRED") {
          setError("This verification code has expired. Please request a new one.");
        } else {
          setError("Verification failed. Please try again.");
        }
      }
    } catch (err: any) {
      console.error(err);
      setError("An unexpected verification error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setOtp('');
    setError(null);
    setDevOtpHint(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1C37] via-[#0F2744] to-[#1673FF] relative overflow-y-auto overflow-x-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-20 -left-20 md:left-10 w-72 h-72 bg-white rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 -right-20 md:right-10 w-96 h-96 bg-[#1673FF] rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Back to Home Link */}
      <div className="absolute top-6 left-6 z-50 animate-fadeIn">
        <Link
          to="/"
          className="group flex items-center space-x-2 text-white/80 hover:text-white transition-colors duration-300"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform duration-300" />
          <span className="text-sm font-medium">Back to Home</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="min-h-[100dvh] flex items-center justify-center p-4 md:p-8 relative z-10">
        <div className="max-w-md w-full animate-fadeInUp">
          {/* Login Card */}
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden transform transition-all duration-500">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-[#1673FF] to-[#0A1C37] px-8 py-10 text-center relative rounded-t-3xl overflow-hidden">
              <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
              <div className="relative z-10">
                <div className="inline-flex items-center justify-center mb-4 transform transition-transform duration-500 hover:scale-110 hover:rotate-3">
                  <img src="/logo-light.png" alt="WishPro Logo" className="w-20 h-20 object-contain rounded-2xl" />
                </div>
                <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Welcome Back</h1>
                <p className="text-white/80 text-sm">Sign in to access your WishPro dashboard</p>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
            </div>

            {/* Custom OTP Login Forms */}
            <div className="p-8 space-y-6">
              {error && (
                <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 animate-fadeIn">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {step === 'email' ? (
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider ml-1">Email Address</label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        className="w-full border border-gray-200 rounded-xl py-3.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-[#1673FF]/20 focus:border-[#1673FF] outline-none transition-all duration-200 bg-gray-50/50 text-[#0A1C37]"
                        placeholder="Enter your registered email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full bg-gradient-to-r from-[#1673FF] to-[#0A1C37] hover:opacity-95 transition-all text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-blue-500/10 text-sm"
                    isLoading={loading}
                  >
                    Send Verification Code
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-5">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Verification Code</label>
                      <button
                        type="button"
                        onClick={handleBackToEmail}
                        className="text-xs font-medium text-[#1673FF] hover:underline"
                        disabled={loading}
                      >
                        Change Email
                      </button>
                    </div>
                    <div className="relative">
                      <Key size={18} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        pattern="\d{6}"
                        maxLength={6}
                        className="w-full border border-gray-200 rounded-xl py-3.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-[#1673FF]/20 focus:border-[#1673FF] outline-none transition-all duration-200 bg-gray-50/50 text-[#0A1C37] font-mono tracking-[0.25em] text-center text-lg"
                        placeholder="******"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        required
                        disabled={loading}
                      />
                    </div>
                    <p className="text-xs text-gray-500 ml-1">
                      We sent a 6-digit code to <span className="font-semibold text-gray-700">{email}</span>.
                    </p>
                  </div>

                  {devOtpHint && (
                    <div className="p-3 bg-blue-50 border border-blue-100 text-blue-700 rounded-xl text-xs font-mono break-all animate-fadeIn">
                      {devOtpHint}
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full bg-gradient-to-r from-[#1673FF] to-[#0A1C37] hover:opacity-95 transition-all text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-blue-500/10 text-sm"
                    isLoading={loading}
                  >
                    Verify & Sign In
                  </Button>

                  <div className="flex justify-center pt-2">
                    {resendTimer > 0 ? (
                      <span className="text-xs text-gray-400 font-medium">
                        Resend code in {resendTimer}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOTP}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1673FF] hover:underline"
                        disabled={loading}
                      >
                        <RefreshCw size={12} />
                        Resend Code
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>

            {/* Security Badge */}
            <div className="px-8 pb-6 bg-white/95">
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
                  <Shield size={16} className="text-[#2BA67A]" />
                  <span>256-bit SSL Encrypted Connection</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-6 text-center space-y-2 animate-fadeIn" style={{ animationDelay: '600ms' }}>
            <p className="text-white/60 text-sm">
              Don't have an account?{' '}
              <span className="text-white font-semibold">Contact Administrator</span>
            </p>
            <p className="text-white/30 text-xs">
              &copy; 2024 WishPro. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
