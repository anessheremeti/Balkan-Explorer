import React,{useState,useEffect} from "react";
import { supabase } from '../../../createClient';
import LogoutModal from '../LogoutModal/LogoutModal';
import {useTranslation} from 'react-i18next';

interface DropdownProps {
  onClose: () => void;
}

const Dropdown: React.FC<DropdownProps> = ({ onClose }) => {
   const {t} = useTranslation('settings');
  const [userName, setUserName] = useState<string | null>(null);
  const [ userEmail, setUserEmail ] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (!user) return;
      setUserName(user.user_metadata?.full_name ?? user.email ?? null);
      setUserEmail(user.email ?? null);
    });
  }, []);
  return (
    <>
    <div className="w-72 bg-white rounded-2xl shadow-xl border border-slate-100 absolute top-14 right-[-4rem] z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100">
        {/* Avatar & User Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <img
            src="https://avatars.githubusercontent.com/u/499550?v=4"
            alt="Evan You avatar"
            className="w-14 h-14 rounded-full object-cover shrink-0"
          />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-sm font-semibold text-slate-900 truncate">{userName}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 text-cyan-400 shrink-0"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2a3.2 3.2 0 012.97 2.133l.698.698a1.2 1.2 0 00.71.341h1a3.2 3.2 0 013.195 3.018v1a1.2 1.2 0 00.258.743l.697.698a3.2 3.2 0 01.147 4.382l-.698.698a1.2 1.2 0 00-.341.71v1a3.2 3.2 0 01-3.018 3.195h-1a1.2 1.2 0 00-.743.258l-.698.697a3.2 3.2 0 01-4.382.147l-.698-.698a1.2 1.2 0 00-.71-.341h-1a3.2 3.2 0 01-3.195-3.018v-1a1.2 1.2 0 00-.258-.743l-.697-.698a3.2 3.2 0 01-.147-4.382l.698-.698a1.2 1.2 0 00.341-.71v-1a3.2 3.2 0 013.018-3.195h1a1.2 1.2 0 00.743-.258l.698-.697A3.2 3.2 0 0112 2zm3.697 7.282l-4 4-2-2 4-4 2 2z" />
              </svg>
            </div>
            <p className="text-xs text-slate-500 truncate">{userEmail}</p>
          </div>
        </div>
        {/* Toggle Icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5 text-slate-300 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 9l4-4 4 4" />
          <path d="M16 15l-4 4-4-4" />
        </svg>
      </div>

      {/* Navigation Links */}
      <div className="py-1.5">
        <nav className="grid gap-0">
          {[
            {
              name: t('my_travels'),
              href: "/my-travels",
              icon: (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4.5 h-4.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 4a2 2 0 012-2h8a2 2 0 012 2v2H6V4z" />
                  <rect x="2" y="6" width="20" height="14" rx="2" />
                  <path d="M12 12v4" />
                  <path d="M10 14h4" />
                </svg>
              ),
            },
            {
              name: t('settings'),
              href: "/app-settings",
              icon: (
               <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="w-4.5 h-4.5" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" >
                  <path stroke="none" d="M0 0h24v24H0z" fill="none"></path> <path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z" ></path> <path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0"></path>
                </svg>
              ),
            },
            {
              name: t('help_center'),
              href: "/help-center",
              icon: (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4.5 h-4.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 16v.01" />
                  <path d="M12 13a2 2 0 100-4 2 2 0 000 4z" />
                  <path d="M4 6l16 0" />
                </svg>
              ),
            },
          ].map((item) => (
            <a
              key={item.name}
              href={item.href}
              onClick={onClose}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <span className="text-slate-400">{item.icon}</span>
              <span>{item.name}</span>
            </a>
          ))}
        </nav>
      </div>

      {/* Footer Logout */}
      <div className="border-t border-slate-100 py-1.5">
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-3 px-4 py-2.5 w-full text-sm text-red-500 hover:bg-red-50 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4.5 h-4.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 8v-2a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2h7a2 2 0 002-2v-2" />
            <path d="M9 12h12l-3-3" />
            <path d="M18 15l3-3" />
          </svg>
          <span>{t('logout')}</span>
        </button>
      </div>
    </div>

    <LogoutModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};

export default Dropdown;
