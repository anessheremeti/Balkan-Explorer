import React from 'react';
import {
  Search, ListTodo, CreditCard, Smartphone, Share2,
  Filter, Calendar, Heart, Map as MapIcon, Clock,
  Wallet, Plane, Bed, Palmtree, Wifi, Bell,
  LifeBuoy, Camera, PenLine, Award
} from 'lucide-react';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import { useTheme } from "../../context/ThemeContext";
import { useTranslation } from "react-i18next";

const HowItWorks: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { t } = useTranslation('pages');

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? "bg-slate-950 text-slate-200" : "bg-white text-slate-900"}`}>
      <Navbar />
      <section
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 space-y-20 font-sans ${
          isDark ? "bg-slate-950 text-slate-200" : "bg-white text-slate-900"
        }`}
        id="how-it-works"
      >
        <div className="text-center space-y-4">
          <h2 className={`text-3xl font-bold tracking-tight ${isDark ? "text-slate-50" : "text-slate-900"}`}>
            {t('hiw_title')}
          </h2>
          <p className={`text-sm max-w-lg mx-auto leading-relaxed ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {t('hiw_subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 relative">
          <StepItem isDark={isDark} number="1" title={t('hiw_s1_title')} description={t('hiw_s1_desc')} />
          <StepItem isDark={isDark} number="2" title={t('hiw_s2_title')} description={t('hiw_s2_desc')} />
          <StepItem isDark={isDark} number="3" title={t('hiw_s3_title')} description={t('hiw_s3_desc')} />
          <StepItem isDark={isDark} number="4" title={t('hiw_s4_title')} description={t('hiw_s4_desc')} />
        </div>

        <div className="space-y-6">
          <FeatureCard
            isDark={isDark}
            icon={<Search size={22} />}
            title={t('hiw_f1_title')}
            description={t('hiw_f1_desc')}
            subFeatures={[
              { icon: <Filter size={16} />, label: t('hiw_f1_sub1') },
              { icon: <Calendar size={16} />, label: t('hiw_f1_sub2') },
              { icon: <Heart size={16} />, label: t('hiw_f1_sub3') },
            ]}
          />
          <FeatureCard
            isDark={isDark}
            icon={<ListTodo size={22} />}
            title={t('hiw_f2_title')}
            description={t('hiw_f2_desc')}
            subFeatures={[
              { icon: <MapIcon size={16} />, label: t('hiw_f2_sub1') },
              { icon: <Clock size={16} />, label: t('hiw_f2_sub2') },
              { icon: <Wallet size={16} />, label: t('hiw_f2_sub3') },
            ]}
          />
          <FeatureCard
            isDark={isDark}
            icon={<CreditCard size={22} />}
            title={t('hiw_f3_title')}
            description={t('hiw_f3_desc')}
            subFeatures={[
              { icon: <Plane size={16} />, label: t('hiw_f3_sub1') },
              { icon: <Bed size={16} />, label: t('hiw_f3_sub2') },
              { icon: <Palmtree size={16} />, label: t('hiw_f3_sub3') },
            ]}
          />
          <FeatureCard
            isDark={isDark}
            icon={<Smartphone size={22} />}
            title={t('hiw_f4_title')}
            description={t('hiw_f4_desc')}
            subFeatures={[
              { icon: <Wifi size={16} />, label: t('hiw_f4_sub1') },
              { icon: <Bell size={16} />, label: t('hiw_f4_sub2') },
              { icon: <LifeBuoy size={16} />, label: t('hiw_f4_sub3') },
            ]}
          />
          <FeatureCard
            isDark={isDark}
            icon={<Share2 size={22} />}
            title={t('hiw_f5_title')}
            description={t('hiw_f5_desc')}
            subFeatures={[
              { icon: <Camera size={16} />, label: t('hiw_f5_sub1') },
              { icon: <PenLine size={16} />, label: t('hiw_f5_sub2') },
              { icon: <Award size={16} />, label: t('hiw_f5_sub3') },
            ]}
          />
        </div>
      </section>
      <Footer />
    </div>
  );
};

const StepItem: React.FC<{
  number: string;
  title: string;
  description: string;
  isDark: boolean;
}> = ({ number, title, description, isDark }) => (
  <div className="flex flex-col items-center text-center space-y-4 group">
    <div
      className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg ring-4 group-hover:scale-110 transition-transform ${
        isDark
          ? "bg-slate-800 text-white ring-slate-700"
          : "bg-slate-900 text-white ring-slate-100"
      }`}
    >
      {number}
    </div>
    <div className="space-y-1">
      <h3 className={`font-bold text-[15px] ${
        isDark ? "text-slate-100" : "text-slate-800"
      }`}>
        {title}
      </h3>
      <p className={`text-[12px] leading-relaxed px-4 ${
        isDark ? "text-slate-400" : "text-slate-400"
      }`}>
        {description}
      </p>
    </div>
  </div>
);

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  subFeatures: { icon: React.ReactNode; label: string }[];
  isDark: boolean;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, subFeatures, isDark }) => (
  <div
    className={`border rounded-2xl p-6 md:p-8 flex flex-col md:flex-row gap-6 transition-all duration-300 ${
      isDark
        ? "bg-slate-900 border-slate-700 hover:shadow-lg hover:shadow-slate-900/40"
        : "bg-white border-slate-100 hover:shadow-xl hover:shadow-slate-200/50"
    }`}
  >
    <div className="flex-shrink-0">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          isDark ? "bg-slate-800 text-white" : "bg-slate-800 text-white"
        }`}
      >
        {icon}
      </div>
    </div>

    <div className="flex-1 space-y-4">
      <div className="space-y-2">
        <h3 className={`text-lg font-bold ${
          isDark ? "text-slate-100" : "text-slate-900"
        }`}>
          {title}
        </h3>
        <p className={`text-sm leading-relaxed max-w-4xl ${
          isDark ? "text-slate-400" : "text-slate-500"
        }`}>
          {description}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {subFeatures.map((feat, idx) => (
          <div
            key={idx}
            className={`flex items-center p-3 rounded-lg border transition-all ${
              isDark
                ? "border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                : "border-slate-100 bg-slate-50/30 text-slate-600 hover:bg-white"
            }`}
          >
            <div className={`mr-3 ${
              isDark ? "text-slate-400" : "text-slate-400"
            }`}>
              {feat.icon}
            </div>
            <span className="text-[12px] font-bold tracking-tight">
              {feat.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default HowItWorks;