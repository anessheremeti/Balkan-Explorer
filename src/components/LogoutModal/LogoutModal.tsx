import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../createClient.ts";
import { useNavigate } from "react-router-dom";

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LogoutModal({ isOpen, onClose }: LogoutModalProps) {
  const navigate = useNavigate();
  const modalRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  // ESC close + focus
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";

    modalRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  // backdrop close
  const handleBackdropClick = (e:React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      sessionStorage.clear();

      navigate("/login");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-title"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="
        w-full max-w-md
        rounded-2xl
        bg-white
        p-7
        shadow-2xl
        outline-none
        transform
        transition-all
        duration-200
        scale-100
        animate-[fadeIn_.15s_ease-out]
        "
      >
        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M17 16l4-4m0 0l-4-4m4 4H7" />
            <path d="M3 12h4" />
          </svg>
        </div>

        {/* Title */}
        <h2
          id="logout-title"
          className="mt-4 text-center text-xl font-semibold text-gray-900"
        >
          Log out of your account?
        </h2>

        {/* Description */}
        <p className="mt-2 text-center text-sm text-gray-500">
          You will need to sign in again to access your dashboard.
        </p>

        {/* Buttons */}
        <div className="mt-7 flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="
            flex-1
            rounded-lg
            border
            border-gray-300
            px-4
            py-2.5
            text-sm
            font-medium
            text-gray-700
            hover:bg-gray-100
            transition
            focus:outline-none
            focus:ring-2
            focus:ring-gray-300
            disabled:opacity-50
            "
          >
            Cancel
          </button>

          <button
            onClick={handleLogout}
            disabled={loading}
            className="
            flex-1
            rounded-lg
            bg-red-600
            px-4
            py-2.5
            text-sm
            font-semibold
            text-white
            hover:bg-red-700
            transition
            focus:outline-none
            focus:ring-2
            focus:ring-red-500
            disabled:opacity-60
            "
          >
            {loading ? "Logging out..." : "Log out"}
          </button>
        </div>
      </div>
    </div>
  );
}