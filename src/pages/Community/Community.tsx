import React from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Heart, Share2, User, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import { useTheme } from '../../context/ThemeContext';

const CommunityPage: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useTranslation('pages');
  const isDark = theme === 'dark';

  const posts = [
    {
      id: 1,
      author: 'Arben Krasniqi',
      location: 'Theth, Albania',
      contentKey: 'community_post1_content',
      likes: 124,
      comments: 18,
      timeKey: 'community_time_2h',
      image: 'https://picsum.photos/seed/theth/800/400',
    },
    {
      id: 2,
      author: 'Elena Petrova',
      location: 'Ohrid, North Macedonia',
      contentKey: 'community_post2_content',
      likes: 89,
      comments: 5,
      timeKey: 'community_time_5h',
      image: 'https://picsum.photos/seed/ohrid/800/400',
    },
    {
      id: 3,
      author: 'Marko Vidovic',
      location: 'Kotor, Montenegro',
      contentKey: 'community_post3_content',
      likes: 210,
      comments: 24,
      timeKey: 'community_time_yesterday',
      image: 'https://picsum.photos/seed/kotor/800/400',
    },
  ];

  return (
    <>
      <Navbar />
      <div className={`${isDark ? 'bg-slate-950 text-slate-200' : 'bg-slate-50/50 text-slate-900'} min-h-screen pt-10 pb-20`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-12 text-center">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-4xl font-extrabold mb-4 tracking-tight ${
                isDark ? 'text-slate-50' : 'text-slate-900'
              }`}
            >
              {t('community_title')}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`text-lg max-w-2xl mx-auto leading-relaxed ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {t('community_subtitle')}
            </motion.p>
          </div>

          {/* Create Post Placeholder */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`rounded-2xl p-6 mb-10 flex items-center space-x-4 border shadow-sm transition-all ${
              isDark
                ? 'bg-slate-900 border-slate-700'
                : 'bg-white border-slate-100'
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-400'
            }`}>
              <User size={24} />
            </div>
            <button
              className={`flex-grow text-left px-5 py-3 rounded-xl border transition-colors ${
                isDark
                  ? 'bg-slate-950 border-slate-700 text-slate-400 hover:bg-slate-800'
                  : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
              }`}
            >
              {t('community_share_placeholder')}
            </button>
          </motion.div>

          {/* Feed */}
          <div className="space-y-8">
            {posts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`rounded-2xl border shadow-sm overflow-hidden transition-all ${
                  isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-100'
                }`}
              >
                {/* Post Header */}
                <div className="p-6 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      isDark ? 'bg-sky-900/40 text-sky-400' : 'bg-[#0ea5e9]/10 text-[#0ea5e9]'
                    }`}>
                      {post.author[0]}
                    </div>
                    <div>
                      <h3 className={`text-sm font-bold ${
                        isDark ? 'text-slate-50' : 'text-slate-900'
                      }`}>
                        {post.author}
                      </h3>
                      <div className={`flex items-center text-xs mt-0.5 ${
                        isDark ? 'text-slate-400' : 'text-slate-400'
                      }`}>
                        <MapPin size={12} className="mr-1" />
                        {post.location} • {t(post.timeKey)}
                      </div>
                    </div>
                  </div>
                  <button className={`${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
                    <Share2 size={18} />
                  </button>
                </div>

                {/* Post Content */}
                <div className="px-6 pb-4">
                  <p className={`${isDark ? 'text-slate-300' : 'text-slate-600'} leading-relaxed mb-4`}>
                    {t(post.contentKey)}
                  </p>
                </div>

                {/* Post Image */}
                <div className="relative h-64 sm:h-80 w-full">
                  <img
                    src={post.image}
                    alt={post.location}
                    className="absolute inset-0 w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Post Footer */}
                <div className={`p-4 px-6 flex items-center space-x-6 border-t ${
                  isDark ? 'border-slate-800' : 'border-slate-50'
                }`}>
                  <button className={`flex items-center space-x-2 transition-colors ${
                    isDark ? 'text-slate-400 hover:text-red-500' : 'text-slate-500 hover:text-red-500'
                  }`}>
                    <Heart size={20} />
                    <span className="text-sm font-medium">{post.likes}</span>
                  </button>
                  <button className={`flex items-center space-x-2 transition-colors ${
                    isDark ? 'text-slate-400 hover:text-sky-400' : 'text-slate-500 hover:text-[#0ea5e9]'
                  }`}>
                    <MessageSquare size={20} />
                    <span className="text-sm font-medium">{post.comments}</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Load More */}
          <div className="mt-12 text-center">
            <button className={`px-8 py-3 rounded-xl font-bold transition-all shadow-sm border ${
              isDark ? 'bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}>
              {t('community_load_more')}
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default CommunityPage;