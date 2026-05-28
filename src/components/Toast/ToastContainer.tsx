import React from "react";
import Toast, { type ToastType } from "./Toast";

export type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContainerProps = {
  toasts: ToastItem[];
  removeToast: (id: number) => void;
};

const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  removeToast
}) => {

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 flex flex-col gap-3 z-50 w-[90%] max-w-sm">

      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={removeToast}
        />
      ))}

    </div>
  );
};

export default ToastContainer;