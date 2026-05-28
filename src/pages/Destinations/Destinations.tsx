import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, MapPin, Star, Filter, ArrowRight, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import kotor from '../../assets/Gemini_Generated_Image_2kjty02kjty02kjt.png'
import sarande from '../../assets/Gemini_Generated_Image_1m3iwg1m3iwg1m3i.png'
import ohrid from '../../assets/Gemini_Generated_Image_i2h63xi2h63xi2h6.png'
import gjirokaster from '../../assets/645090253_1636169380738503_8816130649849691409_n.jpg'
import prizren from '../../assets/download.jpg'
import budva from '../../assets/download (1).jpg'
import {useTheme} from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';

const DestinationsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { t } = useTranslation('pages');

  const isDark = theme === "dark"
  // Mock data based on the provided schema structure
  const destinations = [
    {
      id: '1',
      name: 'Sarandë',
      country: 'Albania',
      image_url: sarande,
      rating: 4.8,
      places_count: 42,
      description: 'The unofficial capital of the Albanian Riviera, known for its deep blue waters and vibrant nightlife.'
    },
    {
      id: '2',
      name: 'Kotor',
      country: 'Montenegro',
      image_url:kotor ,
      rating: 4.9,
      places_count: 35,
      description: 'A fortified town on Montenegro’s Adriatic coast, in a bay near the limestone cliffs of Mt. Lovćen.'
    },
    {
      id: '3',
      name: 'Ohrid',
      country: 'North Macedonia',
      image_url: ohrid,
      rating: 4.7,
      places_count: 28,
      description: 'One of the oldest human settlements in Europe, famous for its 365 churches and the crystal clear Lake Ohrid.'
    },
    {
      id: '4',
      name: 'Prizren',
      country: 'Kosovo',
      image_url: prizren,
      rating: 4.6,
      places_count: 24,
      description: 'The cultural capital of Kosovo, nestled at the foot of the Sharr Mountains with a rich Ottoman heritage.'
    },
    {
      id: '5',
      name: 'Gjirokastër',
      country: 'Albania',
      image_url: gjirokaster,
      rating: 4.7,
      places_count: 19,
      description: 'A stone city of a thousand steps, UNESCO world heritage site known for its Ottoman-era houses.'
    },
    {
      id: '6',
      name: 'Budva',
      country: 'Montenegro',
      image_url:budva,
      rating: 4.5,
      places_count: 31,
      description: 'The center of Montenegrin tourism, famous for its medieval walled city and sandy beaches.'
    },
    {
      id: '7',
      name: 'Pejë',
      country: 'Kosovo',
      image_url: 'data:image/jpeg;base64,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',
      rating: 4.8,
      places_count: 22,
      description: 'The gateway to the Rugova Canyon and the Accursed Mountains, perfect for outdoor enthusiasts.'
    },
    {
      id: '8',
      name: 'Skopje',
      country: 'North Macedonia',
      image_url: 'data:image/jpeg;base64,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',
      rating: 4.4,
      places_count: 45,
      description: 'A city where history meets modernity, known for its grand statues and the charming Old Bazaar.'
    }
  ];

  const filteredDestinations = destinations.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
    <Navbar />
    <div className={`min-h-screen ${isDark ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'} pb-20`}>
      {/* Hero Section */}
      <div className="relative h-100 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://picsum.photos/seed/balkans-hero/1920/1080?blur=2" 
            className="w-full h-full object-cover opacity-40"
            alt="Balkans Hero"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-linear-to-b from-slate-900/40 to-slate-50/50" />
        </div>

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-6xl font-extrabold text-slate-900 mb-6 tracking-tight"
          >
            {t('dest_title')} <span className="text-[#0ea5e9]">{t('dest_title_highlight')}</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-slate-700 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            {t('dest_subtitle')}
          </motion.p>

          {/* Search Bar */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="relative max-w-2xl mx-auto"
          >
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-slate-400">
              <Search size={22} />
            </div>
            <input
              type="text"
              placeholder={t('dest_search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-6 py-5 bg-white border-none rounded-2xl shadow-xl shadow-slate-200/50 text-slate-900 text-lg focus:ring-2 focus:ring-[#0ea5e9]/20 transition-all outline-none"
            />
          </motion.div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
        {/* Filters & Stats */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors shadow-sm">
              <Filter size={18} />
              <span>{t('dest_all_regions')}</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50 transition-colors shadow-sm">
              <span>{t('dest_top_rated')}</span>
            </button>
          </div>
          <p className="text-slate-500 font-medium">
            {t('dest_showing')} <span className="text-slate-900">{filteredDestinations.length}</span> {t('dest_destinations')}
          </p>
        </div>

        {/* Destinations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredDestinations.map((dest, index) => (
            <motion.div
              key={dest.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -8 }}
              onClick={() => navigate(`/destination/${dest.id}`)}
              className="group bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden transition-all hover:shadow-xl hover:shadow-slate-200/50 cursor-pointer"
            >
              {/* Image Container */}
              <div className="relative h-64 overflow-hidden">
                <img 
                  src={dest.image_url} 
                  alt={dest.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 left-4">
                  <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center space-x-1.5 shadow-sm">
                    <Star size={14} className="text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-bold text-slate-900">{dest.rating}</span>
                  </div>
                </div>
                <div className="absolute bottom-4 left-4">
                  <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center space-x-1.5 text-white">
                    <MapPin size={14} />
                    <span className="text-xs font-bold uppercase tracking-wider">{dest.country}</span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{dest.name}</h3>
                  <div className="text-xs font-bold text-[#0ea5e9] bg-[#0ea5e9]/10 px-2.5 py-1 rounded-lg">
                    {dest.places_count} Places
                  </div>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed mb-6 line-clamp-2">
                  {dest.description}
                </p>
                
                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <button 
                    onClick={() => navigate(`/destination/${dest.id}`)}
                    className="flex items-center space-x-2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <Info size={18} />
                    <span className="text-xs font-bold uppercase tracking-widest">{t('dest_details')}</span>
                  </button>
                  <button className="flex items-center space-x-2 bg-[#0f172a] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all active:scale-95">
                    <span>{t('dest_plan_trip')}</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {filteredDestinations.length === 0 && (
          <div className="text-center py-20">
            <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
              <Search size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">{t('dest_no_results')}</h3>
            <p className="text-slate-500">{t('dest_no_results_desc')}</p>
          </div>
        )}
      </div>
    </div>
    <Footer />
    </div>
  );
};

export default DestinationsPage;
