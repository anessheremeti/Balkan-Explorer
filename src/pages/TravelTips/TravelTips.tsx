import React from 'react';
import { motion } from 'motion/react';
import { Info, Bus, CreditCard, Wifi, Coffee, ShieldCheck } from 'lucide-react';
import Footer from '../../components/Footer/Footer';
import Navbar from '../../components/Navbar/Navbar';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';

const TravelTipsPage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { t } = useTranslation('pages');

  const tips = [
    { icon: <Bus className="w-6 h-6" />, title: t('tips_transport_title'), description: t('tips_transport_desc') },
    { icon: <CreditCard className="w-6 h-6" />, title: t('tips_currency_title'), description: t('tips_currency_desc') },
    { icon: <Wifi className="w-6 h-6" />, title: t('tips_connectivity_title'), description: t('tips_connectivity_desc') },
    { icon: <Coffee className="w-6 h-6" />, title: t('tips_etiquette_title'), description: t('tips_etiquette_desc') },
    { icon: <ShieldCheck className="w-6 h-6" />, title: t('tips_safety_title'), description: t('tips_safety_desc') },
    { icon: <Info className="w-6 h-6" />, title: t('tips_language_title'), description: t('tips_language_desc') },
  ];

  return (
    <>
      <Navbar />
      <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-slate-200' : 'bg-white text-slate-900'}`}>
        {/* Hero Section */}
        <section className={`py-20 relative overflow-hidden ${isDark ? 'bg-slate-900 text-slate-50' : 'bg-slate-900 text-white'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-3xl">
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight"
              >
                {t('tips_title')} <span className="text-[#0ea5e9]">{t('tips_highlight')}</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-xl leading-relaxed"
              >
                {t('tips_subtitle')}
              </motion.p>
            </div>
          </div>

          {/* Abstract background pattern */}
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-10">
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0 100 L100 0 L100 100 Z" fill="currentColor" />
            </svg>
          </div>
        </section>

        {/* Tips Grid */}
        <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {tips.map((tip, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex flex-col"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#0ea5e9]/10 text-[#0ea5e9] flex items-center justify-center mb-6">
                  {tip.icon}
                </div>
                <h3 className={`text-xl font-bold mb-3 ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>{tip.title}</h3>
                <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'} leading-relaxed`}>
                  {tip.description}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Quick Links / Resources */}
        <section className={`py-20 border-y ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div
              className={`rounded-[2rem] p-10 md:p-16 shadow-sm border flex flex-col md:flex-row items-center justify-between gap-10 ${
                isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'
              }`}
            >
              <div className="max-w-xl">
                <h2 className={`text-3xl font-bold mb-4 ${isDark ? 'text-slate-50' : 'text-slate-900'}`}>
                  {t('tips_cta_title')}
                </h2>
                <p className={`${isDark ? 'text-slate-400' : 'text-slate-500'} text-lg`}>
                  {t('tips_cta_desc')}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                <a
                  href="/community"
                  className="px-8 py-4 bg-[#0f172a] text-white rounded-2xl font-bold text-center hover:bg-slate-800 transition-all active:scale-95"
                >
                  {t('tips_ask_community')}
                </a>
                <a
                  href="/contact"
                  className={`px-8 py-4 rounded-2xl font-bold text-center transition-all active:scale-95 ${
                    isDark
                      ? 'bg-slate-800 text-slate-50 border border-slate-700 hover:bg-slate-700'
                      : 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {t('tips_contact_support')}
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
};

export default TravelTipsPage;