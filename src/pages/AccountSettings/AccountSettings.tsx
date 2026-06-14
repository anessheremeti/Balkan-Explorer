import React from 'react';
//import { motion } from 'motion/react';
import { User, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import SettingsSection from '../../components/settings/SettingsSection';
import ProfileForm from '../../components/settings/ProfileForm';
import AvatarUpload from '../../components/settings/AvatarUpload';
//mport ChangePasswordForm from '../../components/settings/ChangePasswordForm';
import { useTheme } from '../../context/ThemeContext';

const AccountSettings: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
 
  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-900' : 'bg-slate-50/50'} pt-12 pb-24`}>
      <div className={`max-w-4xl mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}  px-4 sm:px-6 lg:px-8`}>
        {/* Header */}
        <div className="mb-12">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-slate-500 hover:text-[#0ea5e9] transition-colors mb-6 group"
          >
            <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
            <span className="text-sm font-semibold">Back to Dashboard</span>
          </Link>
          <h1 className={`text-3xl font-extrabold ${isDark ? 'text-slate-50' : 'text-slate-900'} tracking-tight sm:text-4xl`}>
            Account Settings
          </h1>
          <p className={`mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Manage your personal information and account security.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          <SettingsSection 
            title="Profile Photo" 
            description="This will be displayed on your profile and community posts."
            icon={<User size={20} />}
          >
            <AvatarUpload />
          </SettingsSection>

          <SettingsSection 
            title="Personal Information" 
            description="Update your name, email, and other personal details."
            icon={<User size={20} />}
          >
            <ProfileForm />
          </SettingsSection>

         

          <div className="bg-red-50 rounded-2xl border border-red-100 p-6 sm:p-8">
            <h3 className="text-lg font-bold text-red-900 mb-2">Danger Zone</h3>
            <p className="text-red-600/80 text-sm mb-6">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <button className="px-6 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all active:scale-95">
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
