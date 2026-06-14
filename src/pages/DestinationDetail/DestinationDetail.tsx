import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Star, MapPin, Calendar, Globe, DollarSign } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import ImageGallery from "../../components/ImageGallery/ImageGallery";
import { DestinationDetailSkeleton } from "../../components/Skeleton/Skeleton";
import destinationService from "../../hooks/destinationService";
import type { Destination } from "../../hooks/destinationService";
import { useTheme } from "../../context/ThemeContext";

const DestinationDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { t } = useTranslation("pages");
  const isDark = theme === "dark";

  const [destination, setDestination] = useState<Destination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDestination = async () => {
      if (!id) {
        setError("Destination ID is missing");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const service = await destinationService();
        const data = await service.getDestinationById(id);
        

        if (!data) {
          setError("Destination not found");
          setDestination(null);
        } else {
          setDestination(data);
        }
      } catch (err) {
        console.error("Error fetching destination:", err);
        setError("Failed to load destination details");
      } finally {
        setLoading(false);
      }
    };

    fetchDestination();
  }, [id]);

  const handleBack = () => {
    // Try to maintain scroll position by scrolling up
    window.scrollTo(0, 0);
    navigate(-1);
  };

  const handlePlanTrip = () => {
    if (destination) {
      // Navigate to trip planning page with destination context
      navigate("/", { state: { destination } });
      localStorage.setItem("selectedDestination", JSON.stringify(destination.name));
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col ${isDark ? "bg-slate-900" : "bg-white"}`}>
        <Navbar />
        <div className={`flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 ${isDark ? "bg-slate-900" : "bg-white"}`}>
          <DestinationDetailSkeleton />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !destination) {
    return (
      <div className={`min-h-screen flex flex-col ${isDark ? "bg-slate-900" : "bg-white"}`}>
        <Navbar />
        <div className={`flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-20 text-center`}>
          <div className={`inline-block p-8 rounded-lg ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
            <h1 className={`text-2xl font-bold mb-4 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
              {error || t("dest_detail_not_found_title")}
            </h1>
            <p className={`mb-6 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              {error ? t("dest_detail_error_desc") : t("dest_detail_not_found_desc")}
            </p>
            <motion.button
              onClick={handleBack}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center space-x-2 bg-[#0ea5e9] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#0ea5e9]/90 transition-colors"
            >
              <ArrowLeft size={18} />
              <span>{t("dest_detail_go_back")}</span>
            </motion.button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? "bg-slate-900 text-slate-100" : "bg-white text-slate-900"}`}>
      <Navbar />

      <main className="flex-1">
        {/* Back Button */}
        <motion.button
          onClick={handleBack}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`fixed top-24 left-4 sm:left-6 lg:left-8 z-40 flex items-center space-x-2 px-4 py-2 rounded-lg backdrop-blur-md transition-all hover:scale-110 ${
            isDark
              ? "bg-slate-800/80 hover:bg-slate-700/80 text-slate-100"
              : "bg-white/80 hover:bg-slate-50/80 text-slate-900"
          }`}
          whileHover={{ x: -5 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-semibold hidden sm:inline">{t("dest_detail_back")}</span>
        </motion.button>

        {/* Content Container */}
        <div className={`max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-10`}>
          {/* Image Gallery */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <ImageGallery
              images={destination.images || [destination.hero_image]}
              alt={destination.name}
            />
          </motion.div>

          {/* Destination Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-4"
          >
            {/* Breadcrumb */}
            <div className="flex items-center space-x-2 text-sm">
              <span className={isDark ? "text-slate-400" : "text-slate-500"}>{t("dest_detail_breadcrumb")}</span>
              <span className={isDark ? "text-slate-600" : "text-slate-300"}>/</span>
              <span className="font-semibold text-[#0ea5e9]">{destination.country}</span>
            </div>

            {/* Title and Rating */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold mb-2">{destination.name}</h1>
                <p className={`text-lg ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                  {destination.country}
                </p>
              </div>

              {destination.rating && (
                <div className={`flex items-center space-x-1 px-4 py-2 rounded-lg ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
                  <Star size={20} className="text-yellow-500 fill-yellow-500" />
                  <span className="text-lg font-bold">{destination.rating}</span>
                  <span className={`text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    ({destination.places_count} {t("dest_detail_places")})
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            <p className={`text-lg leading-relaxed ${isDark ? "text-slate-300" : "text-slate-700"}`}>
              {destination.description}
            </p>
          </motion.div>

          {/* Info Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {destination.location && (
              <InfoCard
                icon={MapPin}
                label={t("dest_detail_label_location")}
                value={destination.location}
                isDark={isDark}
              />
            )}
            {destination.best_time_to_visit && (
              <InfoCard
                icon={Calendar}
                label={t("dest_detail_label_best_time")}
                value={destination.best_time_to_visit}
                isDark={isDark}
              />
            )}
            {destination.language && (
              <InfoCard
                icon={Globe}
                label={t("dest_detail_label_language")}
                value={destination.language}
                isDark={isDark}
              />
            )}
            {destination.currency && (
              <InfoCard
                icon={DollarSign}
                label={t("dest_detail_label_currency")}
                value={destination.currency}
                isDark={isDark}
              />
            )}
          </motion.div>

          {/* Highlights Section */}
          {destination.highlights && destination.highlights.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="space-y-6"
            >
              <h2 className="text-3xl font-bold">{t("dest_detail_highlights")}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {destination.highlights.map((highlight, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                    className={`p-6 rounded-xl border-2 ${
                      isDark
                        ? "bg-slate-800 border-slate-700 hover:border-[#0ea5e9]"
                        : "bg-slate-50 border-slate-200 hover:border-[#0ea5e9]"
                    } transition-all hover:shadow-lg`}
                    whileHover={{ y: -8 }}
                  >
                    <h3 className="text-xl font-bold mb-2">{highlight.name}</h3>
                    {highlight.description && (
                      <p className={isDark ? "text-slate-400" : "text-slate-600"}>
                        {highlight.description}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 pt-8"
          >
            <motion.button
              onClick={handlePlanTrip}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex-1 bg-[#0ea5e9] text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-[#0ea5e9]/90 transition-colors"
            >
              {t("dest_detail_plan_trip", { name: destination.name })}
            </motion.button>
            <motion.button
              onClick={handleBack}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex-1 px-8 py-4 rounded-lg font-bold text-lg border-2 transition-colors ${
                isDark
                  ? "border-slate-700 text-slate-100 hover:bg-slate-800"
                  : "border-slate-300 text-slate-900 hover:bg-slate-50"
              }`}
            >
              {t("dest_detail_back_to_list")}
            </motion.button>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

// Info Card Component
interface InfoCardProps {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  isDark: boolean;
}

const InfoCard: React.FC<InfoCardProps> = ({ icon: Icon, label, value, isDark }) => (
  <motion.div
    whileHover={{ y: -4 }}
    className={`p-4 rounded-lg flex items-start space-x-3 ${
      isDark ? "bg-slate-800 border border-slate-700" : "bg-slate-50 border border-slate-200"
    }`}
  >
    <Icon size={24} className="text-[#0ea5e9] shrink-0 mt-1" />
    <div>
      <p className={`text-sm font-semibold ${isDark ? "text-slate-400" : "text-slate-600"}`}>
        {label}
      </p>
      <p className="text-base font-bold">{value}</p>
    </div>
  </motion.div>
);

export default DestinationDetail;
