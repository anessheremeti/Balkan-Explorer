import { createContext, useContext, useState, type ReactNode } from "react";

type ToastType = "success" | "error" | "info";

export type Toast = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextType = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export const useToastContext = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {

  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType = "success") => {

    const id = Date.now();

    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);

  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 flex flex-col gap-3 z-50">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`alert shadow-lg ${
              t.type === "success"
                ? "alert-success"
                : t.type === "error"
                ? "alert-error"
                : "alert-info"
            }`}
          >
            <span>{t.message}</span>
          </div>
        ))}
      </div>

    </ToastContext.Provider>
  );
};