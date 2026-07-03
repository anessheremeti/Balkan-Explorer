import { X, FileText, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function PDFAuthModal({ open, onClose }: Props) {
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl shadow-slate-900/20 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Sky accent header band */}
            <div className="h-1.5 bg-gradient-to-r from-sky-400 to-sky-600" />

            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="px-8 pt-8 pb-10">
              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center mb-6">
                <div className="relative">
                  <FileText size={22} className="text-sky-500" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-sky-500 rounded-full flex items-center justify-center">
                    <Lock size={10} className="text-white" />
                  </div>
                </div>
              </div>

              {/* Headline */}
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                Members-only feature
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed mb-8">
                Download your itinerary as a beautifully designed PDF to save
                or print. Create a free account — it only takes a minute, and
                your trip plans are waiting.
              </p>

              {/* Perks */}
              <ul className="space-y-2 mb-8">
                {[
                  'Download any itinerary as a premium PDF',
                  'Save trips across devices',
                  'Access your travel history anytime',
                ].map(p => (
                  <li key={p} className="flex items-center gap-2.5 text-sm text-slate-600">
                    <span className="w-4 h-4 rounded-full bg-sky-50 flex items-center justify-center shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>

              {/* CTAs */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => { onClose(); navigate('/signup'); }}
                  className="w-full py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-2xl transition-all active:scale-95 shadow-lg shadow-sky-500/25"
                >
                  Create Free Account
                </button>
                <button
                  onClick={() => { onClose(); navigate('/login'); }}
                  className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold rounded-2xl transition-all active:scale-95"
                >
                  Sign In
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
