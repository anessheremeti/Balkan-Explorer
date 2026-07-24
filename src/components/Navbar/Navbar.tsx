
import React, { useEffect, useState } from 'react';
import {  Menu, X, ChevronDown, UserCircle2, Briefcase, Settings, HelpCircle, LogOut } from 'lucide-react';

import { Link } from 'react-router-dom';
import { usersService } from '../../hooks/usersService';
import Dropdown from '../Dropdown/Dropdown';
import LogoutModal from '../LogoutModal/LogoutModal';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from "react-i18next";

const Navbar: React.FC = () => {
    const {t} = useTranslation('navbar');

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const access_token = sessionStorage.getItem("access_token");
  const userId = sessionStorage.getItem("user_id");
  const { getUserName } = usersService();
  // Every page mounts its own <Navbar/> (no shared layout), so this remounts
  // on every navigation. Seeding from the cached value means the username
  // span is already in its final state on first paint here, instead of
  // popping in after a fresh async fetch — that width change, combined with
  // the centered flex-1 nav links between it and the logo, was what made the
  // nav visibly shift on every page switch.
  const [userName, setUserName] = useState<string | null>(() => sessionStorage.getItem("user_full_name"));
  const [showDropdown, setShowDropdown] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  useEffect(() => {
  if (!userId) return;

  let cancelled = false;

  const fetchUser = async () => {
    try {
      const name = await getUserName(userId);

      if (!cancelled) {
        setUserName(name ?? null);
        if (name) sessionStorage.setItem("user_full_name", name);
        else sessionStorage.removeItem("user_full_name");
      }
    } catch (err) {
      console.error("Failed to fetch username:", err);
    }
  };

  fetchUser();

  return () => {
    cancelled = true;
  };
}, [userId, getUserName]);
  const onClickHandler = () => {
    setShowDropdown(prev => !prev);
  }
  return (
    <nav className={`sticky top-0 z-50 w-full ${isDark ? 'bg-slate-950 border-b  border-slate-600' : 'bg-white border-b border-slate-100'} shadow-sm`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ">
        <div className="flex items-center justify-between h-18">
          
          <div className={`flex items-center  shrink-0 cursor-pointer group ${isDark ? 'text-white' : 'text-[#1e293b]'}`}>
            <Link to="/" className='flex items-center'>
            <div className="p-1 rounded-[10px] mr-3 transition-transform duration-200 group-hover:scale-105">
              <img src="/icon.png" alt="BalkanExplorer logo" className="w-8 h-8 object-contain" />
            </div>
            <span className={`text-[20px] font-bold tracking-tight ${isDark ? 'text-slate-400 hover:text-[#0ea5e9]' : 'text-slate-500 hover:text-[#0ea5e9]'}`}>
              BalkanExplorer
            </span>
            </Link>
          </div>

          <div className={`hidden md:flex items-center justify-center flex-1 space-x-8 px-8 ${isDark ? 'text-white' : 'text-[#1e293b]'}`}>
            <NavLink to='/destinations' className={`hover:text-[#0ea5e9] ${isDark ? 'text-slate-400 hover:text-[#0ea5e9]' : 'text-slate-500 hover:text-[#0ea5e9]'}`}>{t('destinations')}</NavLink>
            <NavLink to="/how-it-works" className={`hover:text-[#0ea5e9] ${isDark ? 'text-slate-400 hover:text-[#0ea5e9]' : 'text-slate-500 hover:text-[#0ea5e9]'}`}>{t('how it works')}</NavLink>
            <NavLink to="/community" className={`hover:text-[#0ea5e9] ${isDark ? 'text-slate-400 hover:text-[#0ea5e9]' : 'text-slate-500 hover:text-[#0ea5e9]'}`}>
              {t('community')}
            </NavLink>
          </div>

          <div className="hidden md:flex items-center space-x-4">
           
            
            <div className="h-6 w-px bg-slate-200 mx-2" />
                
          {access_token ? (
            <div className="flex items-center gap-2">
              {userName && (
                <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-700'}`}>
                  {userName}
                </span>
              )}
              <div className="relative">
                <button
                  onClick={onClickHandler}
                  className="flex items-center gap-1.5 focus:outline-none"
                  aria-expanded={showDropdown}
                  aria-haspopup="true"
                >
                  <UserCircle2
                    size={32}
                    className={isDark ? 'text-slate-300' : 'text-slate-500'}
                  />
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${showDropdown ? 'rotate-180' : ''} ${isDark ? 'text-slate-300' : 'text-slate-500'}`}
                  />
                </button>
                {showDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      aria-hidden="true"
                      onClick={() => setShowDropdown(false)}
                    />
                    <Dropdown onClose={() => setShowDropdown(false)} />
                  </>
                )}
              </div>
            </div>
          ) : (
            <Link to="/login">
              <Button variant="ghost">
                {t('login')}
              </Button>
            </Link>
          )}
         


              {!access_token ? (
                 <Link className='flex min-w-fit' to="/signup">
            <Button variant="primary">
              {t('sign up')}
            </Button></Link>
              ) : ''}
            
          </div>

          <div className="flex md:hidden items-center">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-[#0ea5e9] hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/20"
              aria-expanded={isMenuOpen}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className={`md:hidden border-b animate-in slide-in-from-top duration-300 ${isDark ? 'bg-slate-950 border-slate-700' : 'bg-white border-slate-100'}`}>
          <div className="px-4 pt-2 pb-6 space-y-1">
            <MobileNavLink to='/destinations' onClick={() => setIsMenuOpen(false)}>{t('destinations')}</MobileNavLink>
            <MobileNavLink to="/how-it-works" onClick={() => setIsMenuOpen(false)}>{t('how it works')}</MobileNavLink>
            <MobileNavLink to="/community" onClick={() => setIsMenuOpen(false)}>{t('community')}</MobileNavLink>

            {access_token ? (
              <div className={`pt-4 mt-3 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                {/* User identity */}
                

                {[
                  { to: '/my-travels',   Icon: Briefcase,  label: 'My Travels'   },
                  { to: '/app-settings', Icon: Settings,   label: 'Settings'     },
                  { to: '/help-center',  Icon: HelpCircle, label: 'Help Center'  },
                ].map(({ to, Icon, label }) => (
                  <Link key={to} to={to} onClick={() => setIsMenuOpen(false)}>
                    <button className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-50'}`}>
                      <Icon size={17} className="text-slate-400 shrink-0" />
                      {label}
                    </button>
                  </Link>
                ))}

                <div className={`mt-2 pt-2 border-t ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                  <button
                    onClick={() => { setIsMenuOpen(false); setShowLogoutModal(true); }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={17} className="shrink-0" />
                    Sign out
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-4 mt-3 border-t border-slate-100 flex flex-col space-y-3 px-2">
                <Link to="/login">
                  <Button variant="ghost">{t('login')}</Button>
                </Link>
                <Link to="/signup">
                  <Button className='text-wrap' variant="primary">{t('sign up')}</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      <LogoutModal isOpen={showLogoutModal} onClose={() => setShowLogoutModal(false)} />
    </nav>
  );
};

interface ButtonProps {
  variant?: 'primary' | 'outline' | 'ghost';
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({ variant = 'primary', href, onClick, children, className = '' }) => {
  const baseStyles = "inline-flex items-center justify-center px-5 py-2.5 text-[15px] font-bold rounded-[10px] transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variants = {
    primary: "bg-[#0f172a] text-white hover:bg-slate-800 focus:ring-slate-900 shadow-sm",
    outline: "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 focus:ring-slate-200",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-50 focus:ring-slate-100"
  };

  const combinedClasses = `${baseStyles} ${variants[variant]} ${className}`;

  if (href) {
    return (
      <a href={href} className={combinedClasses}>
        {children}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={combinedClasses}>
      {children}
    </button>
  );
};

interface CustomNavLinkProps {
  to: string;
  children: React.ReactNode;
  className?: string;
}

// Renders its own <Link> (not wrapped in one by the caller) — nesting an <a>
// inside another <a> is invalid HTML; browsers silently close the outer one
// early when they hit the inner one, so React's idea of the tree and the
// browser's actual rendered DOM diverge, which showed up as nav items
// visibly shifting on interaction.
const NavLink: React.FC<CustomNavLinkProps> = ({ to, children, className = "" }) => {
  return (
    <Link
      to={to}
      className={`text-[15px] font-medium text-[#64748b] hover:text-[#0ea5e9] transition-colors duration-200 whitespace-nowrap focus:outline-none focus:text-[#0ea5e9] ${className}`}
    >
      {children}
    </Link>
  );
};

const MobileNavLink: React.FC<{ to: string; onClick?: () => void; children: React.ReactNode }> = ({ to, onClick, children }) => (
  <Link
    to={to}
    onClick={onClick}
    className="block px-3 py-3 rounded-lg text-base font-semibold text-slate-700 hover:text-[#0ea5e9] hover:bg-slate-50 transition-all active:bg-slate-100"
  >
    {children}
  </Link>
);

export default Navbar;
