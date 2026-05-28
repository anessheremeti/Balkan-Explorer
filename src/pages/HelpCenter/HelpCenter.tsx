import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronDown, BookOpen, MessageSquare, LifeBuoy, Shield, CreditCard, User } from 'lucide-react';
import Footer from '../../components/Footer/Footer';
import Navbar from '../../components/Navbar/Navbar';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';

const HelpCenterPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const { theme } = useTheme();
  const { t } = useTranslation('pages');

  const categories = [
    { icon: <BookOpen className="w-6 h-6" />, title: t('hc_cat1_title'), description: t('hc_cat1_desc') },
    { icon: <User className="w-6 h-6" />, title: t('hc_cat2_title'), description: t('hc_cat2_desc') },
    { icon: <CreditCard className="w-6 h-6" />, title: t('hc_cat3_title'), description: t('hc_cat3_desc') },
    { icon: <Shield className="w-6 h-6" />, title: t('hc_cat4_title'), description: t('hc_cat4_desc') },
    { icon: <LifeBuoy className="w-6 h-6" />, title: t('hc_cat5_title'), description: t('hc_cat5_desc') },
    { icon: <MessageSquare className="w-6 h-6" />, title: t('hc_cat6_title'), description: t('hc_cat6_desc') },
  ];

  const faqs = [
    { question: t('hc_faq1_q'), answer: t('hc_faq1_a') },
    { question: t('hc_faq2_q'), answer: t('hc_faq2_a') },
    { question: t('hc_faq3_q'), answer: t('hc_faq3_a') },
    { question: t('hc_faq4_q'), answer: t('hc_faq4_a') },
    { question: t('hc_faq5_q'), answer: t('hc_faq5_a') },
  ];

  const filteredCategories = useMemo(() => {
    return categories.filter(cat =>
      cat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cat.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, categories]);

  const filteredFaqs = useMemo(() => {
    return faqs.filter(faq =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, faqs]);

  // Set dynamic Tailwind classes based on theme
  const bgPrimary = theme === 'dark' ? 'bg-slate-900' : 'bg-white';
  const textPrimary = theme === 'dark' ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = theme === 'dark' ? 'text-slate-400' : 'text-slate-500';
  const borderPrimary = theme === 'dark' ? 'border-slate-700' : 'border-slate-100';
  const inputBg = theme === 'dark' ? 'bg-slate-800' : 'bg-slate-50';
  const inputBorder = theme === 'dark' ? 'border-slate-700' : 'border-slate-200';
  const ctaBg = theme === 'dark' ? 'bg-[#0ea5e9]' : 'bg-[#0ea5e9]';

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-slate-50/50'}`}>
      <Navbar />
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-slate-50/50'}`}>
        {/* Hero Section */}
        <section className={`${bgPrimary} border-b ${borderPrimary} pt-20 pb-16`}>
          <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-4xl md:text-5xl font-extrabold mb-6 tracking-tight ${textPrimary}`}
            >
              {t('hc_title')}
            </motion.h1>

            {/* Search Bar */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="relative max-w-2xl mx-auto"
            >
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400">
                <Search size={20} />
              </div>
              <input
                type="text"
                placeholder={t('hc_search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-14 pr-6 py-4 ${inputBg} border ${inputBorder} rounded-2xl ${textPrimary} focus:ring-2 focus:ring-[#0ea5e9]/20 focus:border-[#0ea5e9] outline-none transition-all`}
              />
            </motion.div>
          </div>
        </section>

        <div className={`max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 ${bgPrimary} border-b ${borderPrimary}`}>
          {/* Categories Grid */}
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20 ${bgPrimary} ${borderPrimary}`}>
            {filteredCategories.map((cat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -5 }}
                className={`p-8 rounded-3xl shadow-sm border ${borderPrimary} hover:shadow-md transition-all cursor-pointer group ${bgPrimary}`}
              >
                <div className="w-12 h-12 rounded-2xl bg-[#0ea5e9]/10 text-[#0ea5e9] flex items-center justify-center mb-6 group-hover:bg-[#0ea5e9] group-hover:text-white transition-colors">
                  {cat.icon}
                </div>
                <h3 className={`text-xl font-bold mb-3 tracking-tight ${textPrimary}`}>{cat.title}</h3>
                <p className={`text-sm leading-relaxed ${textSecondary}`}>{cat.description}</p>
              </motion.div>
            ))}
          </div>

          {/* FAQs Section */}
          <div className={`max-w-3xl mx-auto ${bgPrimary} border-b ${borderPrimary} pb-16 `}>
            <h2 className={`text-3xl font-bold mb-10 text-center tracking-tight ${textPrimary}`}>{t('hc_faq_title')}</h2>
            <div className="space-y-4">
              {filteredFaqs.map((faq, index) => (
                <div 
                  key={index}
                  className={`rounded-2xl border ${borderPrimary} overflow-hidden shadow-sm ${bgPrimary}`}
                >
                  <button
                    onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                  >
                    <span className={`font-bold ${textPrimary}`}>{faq.question}</span>
                    <ChevronDown 
                      className={`text-slate-400 transition-transform duration-300 ${activeFaq === index ? 'rotate-180' : ''}`} 
                      size={20} 
                    />
                  </button>
                  <AnimatePresence>
                    {activeFaq === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                      >
                        <div className={`px-6 pb-6 text-sm leading-relaxed border-t ${borderPrimary} pt-4 ${textSecondary}`}>
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Support CTA */}
          <div className="mt-24 text-center">
            <div className="rounded-[2.5rem] p-12 md:p-16 relative overflow-hidden shadow-2xl" style={{backgroundColor: theme === 'dark' ? '#1e293b' : '#0f172a'}}>
              <div className="relative z-10">
                <h2 className={`text-3xl font-bold mb-4 ${theme === 'dark' ? 'text-slate-100' : 'text-white'}`}>{t('hc_cta_title')}</h2>
                <p className={`mb-10 max-w-xl mx-auto ${textSecondary}`}>
                  {t('hc_cta_desc')}
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <a
                    href="/contact"
                    className={`px-8 py-4 ${ctaBg} hover:bg-[#0284c7] text-white rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-[#0ea5e9]/20`}
                  >
                    {t('hc_contact_support')}
                  </a>
                  <button className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold transition-all active:scale-95 border border-white/10">
                    {t('hc_live_chat')}
                  </button>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#0ea5e9]/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full -translate-x-1/2 translate-y-1/2 blur-3xl" />
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default HelpCenterPage;