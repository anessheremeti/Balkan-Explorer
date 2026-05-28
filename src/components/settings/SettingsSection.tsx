import React from 'react';
import { motion } from 'motion/react';

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, description, children, icon }) => {
  return (
    <motion.section 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-8"
    >
      <div className="p-6 sm:p-8 border-b border-slate-50">
        <div className="flex items-center gap-3 mb-1">
          {icon && <div className="text-[#0ea5e9]">{icon}</div>}
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        </div>
        {description && <p className="text-slate-500 text-sm">{description}</p>}
      </div>
      <div className="p-6 sm:p-8">
        {children}
      </div>
    </motion.section>
  );
};

export default SettingsSection;
