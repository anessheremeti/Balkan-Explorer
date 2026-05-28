import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Send, ArrowRight } from 'lucide-react';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';

const ContactPage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { t } = useTranslation('pages');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setSubmitted(true);
  };

  return (
    <>
      <Navbar />
      <div className={`min-h-screen py-16 px-4 sm:px-6 lg:px-8 ${
        isDark ? "bg-slate-950 text-slate-200" : "bg-slate-50/50 text-slate-900"
      }`}>
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <div className="text-center mb-16">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-4xl font-extrabold mb-4 tracking-tight ${
                isDark ? "text-slate-50" : "text-slate-900"
              }`}
            >
              {t('contact_title')}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`text-lg max-w-2xl mx-auto ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              {t('contact_subtitle')}
            </motion.p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

            {/* Contact Info */}
            <div className="lg:col-span-1 space-y-8">
              <div className={`p-8 rounded-2xl shadow-sm border ${
                isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-100"
              }`}>
                <h3 className={`text-xl font-bold mb-6 ${
                  isDark ? "text-slate-50" : "text-slate-900"
                }`}>
                  {t('contact_info_title')}
                </h3>

                <div className="space-y-6">

                  <div className="flex items-start space-x-4">
                    <div className="bg-[#0ea5e9]/10 p-3 rounded-xl text-[#0ea5e9]">
                      <Mail size={20} />
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                        {t('contact_email_label')}
                      </p>
                      <p className="text-sm text-slate-500">hello@balkanexplorer.com</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="bg-[#0ea5e9]/10 p-3 rounded-xl text-[#0ea5e9]">
                      <Phone size={20} />
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                        {t('contact_phone_label')}
                      </p>
                      <p className="text-sm text-slate-500">+383 49 123 456</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="bg-[#0ea5e9]/10 p-3 rounded-xl text-[#0ea5e9]">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                        {t('contact_visit_label')}
                      </p>
                      <p className="text-sm text-slate-500">Prishtina, Kosovo</p>
                    </div>
                  </div>

                </div>

                <div className={`mt-10 pt-8 border-t ${
                  isDark ? "border-slate-800" : "border-slate-50"
                }`}>
                  <p className={`text-sm font-bold mb-4 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
                    {t('contact_follow')}
                  </p>
                  <div className="flex space-x-4">
                    {['Instagram', 'Twitter', 'Facebook'].map((social) => (
                      <a
                        key={social}
                        href="#"
                        className={`text-sm font-medium transition-colors ${
                          isDark
                            ? "text-slate-400 hover:text-sky-400"
                            : "text-slate-400 hover:text-[#0ea5e9]"
                        }`}
                      >
                        {social}
                      </a>
                    ))}
                  </div>
                </div>

                <div className={`mt-8 pt-8 border-t ${
                  isDark ? "border-slate-800" : "border-slate-50"
                }`}>
                  <p className="text-sm text-slate-500 mb-4">
                    {t('contact_community_cta')}
                  </p>
                  <Link
                    to="/community"
                    className="inline-flex items-center text-[#0ea5e9] font-bold text-sm hover:underline"
                  >
                    {t('contact_visit_community')}
                    <ArrowRight size={16} className="ml-1" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className={`p-8 sm:p-10 rounded-2xl shadow-sm border h-full ${
                isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-100"
              }`}>
                {submitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="h-full flex flex-col items-center justify-center text-center py-12"
                  >
                    <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6">
                      <Send size={32} />
                    </div>
                    <h3 className={`text-2xl font-bold mb-2 ${isDark ? "text-slate-50" : "text-slate-900"}`}>
                      {t('contact_sent_title')}
                    </h3>
                    <p className="text-slate-500 mb-8 max-w-sm">
                      {t('contact_sent_desc')}
                    </p>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="text-[#0ea5e9] font-bold hover:underline"
                    >
                      {t('contact_send_another')}
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <input
                        type="text"
                        placeholder={t('contact_first_name')}
                        required
                        className={`w-full px-4 py-3 rounded-xl border text-sm outline-none ${
                          isDark
                            ? "bg-slate-800 border-slate-700 text-slate-200"
                            : "bg-slate-50 border-slate-200"
                        }`}
                      />
                      <input
                        type="text"
                        placeholder={t('contact_last_name')}
                        required
                        className={`w-full px-4 py-3 rounded-xl border text-sm outline-none ${
                          isDark
                            ? "bg-slate-800 border-slate-700 text-slate-200"
                            : "bg-slate-50 border-slate-200"
                        }`}
                      />
                    </div>

                    <input
                      type="email"
                      placeholder="john@example.com"
                      required
                      className={`w-full px-4 py-3 rounded-xl border text-sm outline-none ${
                        isDark
                          ? "bg-slate-800 border-slate-700 text-slate-200"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    />

                    <textarea
                      rows={6}
                      required
                      placeholder={t('contact_message')}
                      className={`w-full px-4 py-3 rounded-xl border text-sm outline-none resize-none ${
                        isDark
                          ? "bg-slate-800 border-slate-700 text-slate-200"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    />

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all flex items-center justify-center"
                    >
                      {isSubmitting ? t('contact_sending') : t('contact_send')}
                    </button>

                  </form>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default ContactPage;