import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../../createClient';
import { useToastContext } from '../../context/ToastContext';

type PageStatus = 'loading' | 'ready' | 'submitting' | 'success' | 'invalid';

function getStrength(password: string): { score: number; label: string; color: string; textColor: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: 'Weak',        color: 'bg-red-400',     textColor: 'text-red-500' };
  if (score === 2) return { score, label: 'Fair',        color: 'bg-orange-400',  textColor: 'text-orange-500' };
  if (score === 3) return { score, label: 'Good',        color: 'bg-yellow-400',  textColor: 'text-yellow-600' };
  if (score === 4) return { score, label: 'Strong',      color: 'bg-emerald-400', textColor: 'text-emerald-600' };
  return            { score, label: 'Very Strong', color: 'bg-emerald-500', textColor: 'text-emerald-600' };
}

const ResetPassword: React.FC = () => {
  const { showToast } = useToastContext();
  const navigate = useNavigate();

  const [pageStatus, setPageStatus] = useState<PageStatus>('loading');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});

  useEffect(() => {
    let resolved = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        resolved = true;
        setPageStatus('ready');
      }
    });

    // If no PASSWORD_RECOVERY event fires within 3s, the link is invalid/expired
    const timer = setTimeout(() => {
      if (!resolved) setPageStatus('invalid');
    }, 3000);

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const validate = () => {
    const errs: { password?: string; confirm?: string } = {};
    if (!password) {
      errs.password = 'Password is required';
    } else if (password.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    }
    if (!confirmPassword) {
      errs.confirm = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      errs.confirm = 'Passwords do not match';
    }
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setPageStatus('submitting');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPageStatus('success');
      showToast('Password updated successfully!', 'success');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update password.', 'error');
      setPageStatus('ready');
    }
  };

  const strength = getStrength(password);
  const isFormActive = pageStatus === 'ready' || pageStatus === 'submitting';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="p-8 sm:p-10">

            {/* Loading */}
            {pageStatus === 'loading' && (
              <div className="text-center py-10">
                <div className="w-10 h-10 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-500 text-sm">Verifying reset link…</p>
              </div>
            )}

            {/* Invalid / expired */}
            {pageStatus === 'invalid' && (
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-6">
                  <AlertTriangle size={30} className="text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-3">Link expired</h2>
                <p className="text-slate-500 text-sm mb-8">
                  This password reset link is invalid or has expired.<br />Please request a new one.
                </p>
                <Link to="/forgot-password">
                  <button className="inline-flex items-center gap-2 py-3 px-6 bg-[#0f172a] hover:bg-slate-800 text-white font-bold rounded-xl transition-all active:scale-[0.98]">
                    Request new link
                    <ArrowRight size={16} />
                  </button>
                </Link>
              </div>
            )}

            {/* Success */}
            {pageStatus === 'success' && (
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 mb-6">
                  <CheckCircle2 size={32} className="text-emerald-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-3">Password updated!</h2>
                <p className="text-slate-500 text-sm mb-2">Your password has been changed successfully.</p>
                <p className="text-xs text-slate-400">Redirecting you to login…</p>
              </div>
            )}

            {/* Form */}
            {isFormActive && (
              <>
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 mb-4">
                    <Lock size={26} className="text-slate-700" />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Set new password</h2>
                  <p className="text-slate-500 text-sm">Choose a strong password for your account.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* New password */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock size={18} />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => {
                          setPassword(e.target.value);
                          if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                        }}
                        className={`block w-full pl-11 pr-12 py-3 bg-slate-50 border ${
                          errors.password ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'
                        } rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/20 focus:border-[#0ea5e9] transition-all`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.password}</p>
                    )}

                    {/* Strength meter */}
                    {password.length > 0 && (
                      <div className="mt-2.5">
                        <div className="flex gap-1 mb-1">
                          {[1, 2, 3, 4, 5].map(i => (
                            <div
                              key={i}
                              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                                i <= Math.max(strength.score, 1) ? strength.color : 'bg-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                        <p className={`text-xs font-medium ${strength.textColor}`}>{strength.label}</p>
                      </div>
                    )}
                  </div>

                  {/* Confirm password */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock size={18} />
                      </div>
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => {
                          setConfirmPassword(e.target.value);
                          if (errors.confirm) setErrors(prev => ({ ...prev, confirm: undefined }));
                        }}
                        className={`block w-full pl-11 pr-12 py-3 bg-slate-50 border ${
                          errors.confirm ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'
                        } rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/20 focus:border-[#0ea5e9] transition-all`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {errors.confirm && (
                      <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.confirm}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={pageStatus === 'submitting'}
                    className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 bg-[#0f172a] hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-slate-200 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {pageStatus === 'submitting' ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Set New Password</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ResetPassword;
