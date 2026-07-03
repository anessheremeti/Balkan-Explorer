
import React, { useEffect, useState } from 'react';
import { Search, Send, Menu, X, ChevronDown } from 'lucide-react';

import { Link } from 'react-router-dom';
import Avatar from '../../assets/people.png'
import { usersService } from '../../hooks/usersService';
import Dropdown from '../Dropdown/Dropdown';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from "react-i18next";

const Navbar: React.FC = () => {
    const {t} = useTranslation('navbar');

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const access_token = sessionStorage.getItem("access_token");
  const userId = sessionStorage.getItem("user_id");
  const { getUserName } = usersService();
  const [userName, setUserName] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const storedPrefsString = localStorage.getItem('app_settings');
const storedPreferences = storedPrefsString ? JSON.parse(storedPrefsString) : {};
const userTheme = storedPreferences.theme;
const theme = useTheme();
const isDark = theme.theme === 'dark';
  useEffect(() => {
  if (!userId) return;

  let cancelled = false;

  const fetchUser = async () => {
    try {
      const name = await getUserName(userId);

      if (!cancelled) {
        setUserName(name ?? null);
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
    <nav className={`sticky top-0 z-50 w-full ${userTheme === 'dark' ? 'bg-gray-900 border-b  border-slate-600' : 'bg-white border-b border-slate-100'} shadow-sm`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ">
        <div className="flex items-center justify-between h-18">
          
          <div className={`flex items-center shrink-0 cursor-pointer group ${userTheme === 'dark' ? 'text-white' : 'text-[#1e293b]'}`}>
            <Link to="/" className='flex'>
            <div className="bg-[#0ea5e9] p-1.5 rounded-[10px] mr-3 transition-transform duration-200 group-hover:scale-105">
              <Send size={20} className="text-white fill-white rotate-[-15deg] translate-x-[-1px] translate-y-[1px]" />
            </div>
            <span className={`text-[20px] font-bold tracking-tight ${userTheme === 'dark' ? 'text-slate-400 hover:text-[#0ea5e9]' : 'text-slate-500 hover:text-[#0ea5e9]'}`}>
              BalkanExplorer
            </span>
            </Link>
          </div>

          <div className={`hidden md:flex items-center justify-center flex-1 space-x-8 px-8 ${userTheme === 'dark' ? 'text-white' : 'text-[#1e293b]'}`}>
            <Link to='/destinations'><NavLink href='/destinations' className={`hover:text-[#0ea5e9] ${userTheme === 'dark' ? 'text-slate-400 hover:text-[#0ea5e9]' : 'text-slate-500 hover:text-[#0ea5e9]'}`}>{t('destinations')}</NavLink></Link>
            <Link to="/how-it-works"><NavLink className={`hover:text-[#0ea5e9] ${userTheme === 'dark' ? 'text-slate-400 hover:text-[#0ea5e9]' : 'text-slate-500 hover:text-[#0ea5e9]'}`} href="/how-it-works">{t('how it works')}</NavLink></Link>
            <Link to="/community">
              <NavLink className={`hover:text-[#0ea5e9] ${userTheme === 'dark' ? 'text-slate-400 hover:text-[#0ea5e9]' : 'text-slate-500 hover:text-[#0ea5e9]'}`} href="/community">
                {t('community')}
              </NavLink>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-4">
           
            
            <div className="h-6 w-px bg-slate-200 mx-2" />
                
          {access_token ? (
            <div className="flex items-center gap-2">
              {userName && (
                <span className={`text-sm font-medium ${userTheme === 'dark' ? 'text-white' : 'text-slate-700'}`}>
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
                  <img src={Avatar} alt="Avatar" className="w-8 h-8 rounded-full" />
                  <ChevronDown
                    size={16}
                    className={`transition-transform ${showDropdown ? 'rotate-180' : ''} ${isDark ? 'text-slate-300' : 'text-slate-500'}`}
                  />
                </button>
                {showDropdown && <Dropdown onClose={() => setShowDropdown(false)} />}
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
                 <Link to="/signup">
            <Button variant="primary" href="#signup">
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
        <div className="md:hidden bg-white border-b border-slate-100 animate-in slide-in-from-top duration-300">
          <div className="px-4 pt-2 pb-6 space-y-1">
           <Link to='/'><MobileNavLink href="#destinations">{t('destinations')}</MobileNavLink></Link>
            <Link to="/"><MobileNavLink href="#how-it-works">{t('how it works')}</MobileNavLink></Link>
            <Link to="/community"> 
              <MobileNavLink href="#community">
                {t('community')}
              </MobileNavLink>
              </Link>
            
            <div className="pt-4 mt-4 border-t border-slate-100 flex flex-col space-y-3 px-2">
              <button className="flex items-center w-full px-3 py-3 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors">
                <Search size={18} className="mr-3" />
                {t('search')}
              </button>
           
              {!access_token ? (
   <Link to="/login"> <Button variant="ghost" href="#login">
              {t('login') }
            </Button> </Link>
              ) : ''}
         


              {!access_token ? (
                 <Link to="/signup">
            <Button variant="primary" href="#signup">
              {t('sign up')}
            </Button></Link>
              ) : ''}
            </div>
          </div>
        </div>
      )}
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

interface CustomNavLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
}

const NavLink: React.FC<CustomNavLinkProps> = ({
  href,
  children,
  className = "",
  ...props
}) => {
  return (
    <a
      href={href}
      className={`text-[15px] font-medium text-[#64748b] hover:text-[#0ea5e9] transition-colors duration-200 whitespace-nowrap focus:outline-none focus:text-[#0ea5e9] ${className}`}
      {...props}
    >
      {children}
    </a>
  );
};

const MobileNavLink: React.FC<{ href: string; children: React.ReactNode }> = ({ href, children }) => (
  <a 
    href={href} 
    className="block px-3 py-3 rounded-lg text-base font-semibold text-slate-700 hover:text-[#0ea5e9] hover:bg-slate-50 transition-all active:bg-slate-100"
  >
    {children}
  </a>
);

export default Navbar;
