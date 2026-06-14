import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, ArrowRight, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../createClient';
import { useToastContext } from '../../context/ToastContext';

const ForgotPassword: React.FC = () => {
  const { showToast } = useToastContext();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const validateEmail = (value: string) => {
    if (!value.trim()) return 'Email is required';
    if (!/\S+@\S+\.\S+/.test(value)) return 'Email address is invalid';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateEmail(email);
    if (err) { setEmailError(err); return; }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      showToast('Reset link sent! Check your inbox.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to send reset link.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

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
          <Link to="/login">
            <button className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors z-10">
              <X size={20} />
            </button>
          </Link>

          <div className="p-8 sm:p-10">
            {!sent ? (
              <>
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 mb-4">
                    <Mail size={26} className="text-slate-700" />
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Forgot password?</h2>
                  <p className="text-slate-500 text-sm">Enter your email and we'll send you a reset link.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail size={18} />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={e => {
                          setEmail(e.target.value);
                          if (emailError) setEmailError('');
                        }}
                        className={`block w-full pl-11 pr-4 py-3 bg-slate-50 border ${
                          emailError ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'
                        } rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/20 focus:border-[#0ea5e9] transition-all`}
                        placeholder="john@example.com"
                      />
                    </div>
                    {emailError && (
                      <p className="mt-1.5 text-xs text-red-500 font-medium">{emailError}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 bg-[#0f172a] hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-slate-200 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Send Reset Link</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>

                <p className="mt-8 text-center text-sm text-slate-500">
                  Remember your password?{' '}
                  <Link to="/login" className="font-bold text-[#0ea5e9] hover:underline">
                    Log in
                  </Link>
                </p>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 mb-6">
                  <CheckCircle2 size={32} className="text-emerald-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-3">Check your email</h2>
                <p className="text-slate-500 text-sm mb-1">We sent a password reset link to</p>
                <p className="font-semibold text-slate-800 text-sm mb-6">{email}</p>
                <p className="text-xs text-slate-400 mb-8">
                  Didn't receive it? Check your spam folder or{' '}
                  <button
                    onClick={() => setSent(false)}
                    className="text-[#0ea5e9] hover:underline font-medium"
                  >
                    try another email
                  </button>
                  .
                </p>
                <Link to="/login">
                  <button className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
                    <ArrowLeft size={16} />
                    Back to login
                  </button>
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ForgotPassword;
