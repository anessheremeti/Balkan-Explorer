import React from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Users, Globe, Shield, Heart, ArrowRight } from 'lucide-react';
import Footer from '../../components/Footer/Footer';
import Navbar from '../../components/Navbar/Navbar';

const AboutUsPage: React.FC = () => {
  const values = [
    {
      icon: <Globe className="w-6 h-6" />,
      title: 'Local Expertise',
      description: 'We partner with local guides and experts to bring you the most authentic Balkan experiences.'
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Safe & Reliable',
      description: 'Your safety is our priority. We only recommend verified places and secure travel routes.'
    },
    {
      icon: <Heart className="w-6 h-6" />,
      title: 'Passion for Travel',
      description: 'Built by travelers, for travelers. We love the Balkans and want you to love them too.'
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Community Driven',
      description: 'Our platform thrives on the stories and tips shared by our vibrant community of explorers.'
    }
  ];

  return (
    <>
    <Navbar />
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative py-20 bg-slate-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <motion.span 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-block px-4 py-1.5 rounded-full bg-[#0ea5e9]/10 text-[#0ea5e9] text-sm font-bold tracking-wide uppercase mb-6"
            >
              Our Mission
            </motion.span>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl font-extrabold text-slate-900 mb-8 tracking-tight"
            >
              Making Balkan travel <br />
              <span className="text-[#0ea5e9]">accessible to everyone.</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed"
            >
              BalkanExplorer was founded with a simple goal: to help people discover the hidden beauty, rich history, and warm hospitality of the Balkan peninsula through personalized, AI-powered planning.
            </motion.p>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-[#0ea5e9]/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl" />
      </section>

      {/* Story Section */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl">
              <img 
                src="https://picsum.photos/seed/balkan-story/800/800" 
                alt="Balkan Landscape" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 bg-white p-6 rounded-2xl shadow-xl border border-slate-100 hidden sm:block">
              <p className="text-3xl font-bold text-[#0ea5e9]">10k+</p>
              <p className="text-sm font-medium text-slate-500">Happy Travelers</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">The Vision Behind BalkanExplorer</h2>
            <p className="text-slate-600 leading-relaxed">
              The Balkans offer some of the most stunning landscapes and cultural experiences in Europe, yet they often remain a challenge to navigate for many travelers. Information is frequently fragmented, and the most authentic experiences are often hidden from mainstream platforms.
            </p>
            <p className="text-slate-600 leading-relaxed">
              BalkanExplorer was created to solve this by unifying local expertise with cutting-edge AI technology. Our mission is to provide a seamless, community-driven platform that empowers explorers to discover the true heart of the region with confidence and ease.
            </p>
            <div className="pt-4">
              <Link 
                to="/community" 
                className="inline-flex items-center space-x-2 text-[#0ea5e9] font-bold hover:underline"
              >
                <span>Read community stories</span>
                <ArrowRight size={18} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">What We Stand For</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Our values guide everything we do, from the features we build to the partnerships we form.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-[#0ea5e9] flex items-center justify-center mb-6">
                  {value.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{value.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-[#0ea5e9] rounded-[2rem] p-12 text-center text-white shadow-2xl shadow-[#0ea5e9]/20 relative overflow-hidden"
          >
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-extrabold mb-6">Ready to join the community?</h2>
              <p className="text-white/80 mb-10 max-w-xl mx-auto text-lg">
                Connect with thousands of other travelers and start sharing your own Balkan adventures today.
              </p>
              <Link 
                to="/community" 
                className="inline-flex items-center space-x-2 bg-white text-[#0ea5e9] px-8 py-4 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all active:scale-95 shadow-lg"
              >
                <span>Go to Community</span>
                <Users size={20} />
              </Link>
            </div>
            
            {/* Decorative circles */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-1/2 translate-y-1/2" />
          </motion.div>
        </div>
      </section>
    </div>
    <Footer />
    </>
  );
};

export default AboutUsPage;
