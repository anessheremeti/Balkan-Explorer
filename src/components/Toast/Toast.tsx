import React, { useEffect, useState } from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

type ToastProps = {
  id: number;
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: (id: number) => void;
};

const styles = {
  success: {
    icon: <CheckCircle size={18} />,
    color: "text-emerald-600",
    bar: "bg-emerald-500"
  },
  error: {
    icon: <XCircle size={18} />,
    color: "text-red-600",
    bar: "bg-red-500"
  },
  info: {
    icon: <Info size={18} />,
    color: "text-sky-600",
    bar: "bg-sky-500"
  }
};

const Toast: React.FC<ToastProps> = ({
  id,
  message,
  type = "success",
  duration = 3500,
  onClose
}) => {

  const [progress, setProgress] = useState(100);

  useEffect(() => {

    const start = Date.now();

    const interval = setInterval(() => {

      const elapsed = Date.now() - start;
      const percentage = 100 - (elapsed / duration) * 100;

      setProgress(Math.max(0, percentage));

    }, 50);

    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };

  }, [id, duration, onClose]);

  return (
    <div
      role="status"
      className="relative flex items-start gap-3 w-full max-w-sm bg-white border border-slate-200 shadow-xl rounded-xl p-4 animate-slideUp"
    >
      {/* icon */}
      <div className={`mt-0.5 ${styles[type].color}`}>
        {styles[type].icon}
      </div>

      {/* message */}
      <div className="flex-1 text-sm text-slate-700 font-medium leading-relaxed">
        {message}
      </div>

      {/* close */}
      <button
        onClick={() => onClose(id)}
        className="text-slate-400 hover:text-slate-600 transition"
        aria-label="Close notification"
      >
        <X size={16} />
      </button>

      {/* progress bar */}
      <div className="absolute bottom-0 left-0 w-full h-[3px] bg-slate-100 rounded-b-xl overflow-hidden">
        <div
          className={`h-full ${styles[type].bar} transition-all`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default Toast;