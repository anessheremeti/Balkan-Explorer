import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { preloadImage, getOptimizedImageUrl, generateSrcSet } from "../../utils/imageOptimization";

interface ImageGalleryProps {
  images: string[];
  alt: string;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({ images, alt }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Preload next and previous images for smooth transitions
  useEffect(() => {
    const preloadAdjacentImages = async () => {
      if (images.length === 0) return;

      const nextIndex = (currentIndex + 1) % images.length;
      const prevIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;

      try {
        await Promise.all([
          preloadImage(images[nextIndex]),
          preloadImage(images[prevIndex]),
        ]);
      } catch (err) {
        console.warn("Failed to preload adjacent images:", err);
      }
    };

    preloadAdjacentImages();
  }, [currentIndex, images]);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
    setLoading(true);
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) =>
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
    setLoading(true);
  };

  const goToImage = (index: number) => {
    setCurrentIndex(index);
    setLoading(true);
  };

  if (!images || images.length === 0) {
    return (
      <div className="w-full bg-slate-200 rounded-lg flex items-center justify-center" style={{ aspectRatio: "16 / 10" }}>
        <p className="text-slate-500">No images available</p>
      </div>
    );
  }

  const currentImage = getOptimizedImageUrl(images[currentIndex], {
    maxWidth: 1200,
    maxHeight: 750,
    quality: 90,
  });

  const srcSet = generateSrcSet(images[currentIndex], [480, 768, 1024, 1200]);

  return (
    <div className="w-full space-y-4">
      {/* Main Image */}
      <div className="relative w-full bg-slate-100 rounded-xl overflow-hidden group" style={{ aspectRatio: "16 / 10" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full h-full"
          >
            {loading && (
              <div className="absolute inset-0 bg-linear-to-r from-slate-200 via-slate-100 to-slate-200 animate-pulse" />
            )}
            <img
              src={currentImage}
              srcSet={srcSet}
              sizes="(max-width: 480px) 480px, (max-width: 768px) 768px, (max-width: 1024px) 1024px, 1200px"
              alt={`${alt} - Image ${currentIndex + 1}`}
              className="w-full h-full object-contain"
              onLoad={() => setLoading(false)}
              onError={() => setLoading(false)}
              referrerPolicy="no-referrer"
              loading="lazy"
              decoding="async"
            />
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        {images.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-all opacity-0 group-hover:opacity-100 z-10"
              aria-label="Previous image"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-all opacity-0 group-hover:opacity-100 z-10"
              aria-label="Next image"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}

        {/* Image Counter */}
        {images.length > 1 && (
          <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-medium">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((image, index) => {
            const thumbUrl = getOptimizedImageUrl(image, {
              maxWidth: 120,
              maxHeight: 120,
              quality: 80,
            });

            return (
              <motion.button
                key={index}
                onClick={() => goToImage(index)}
                className={`shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                  currentIndex === index
                    ? "border-[#0ea5e9] scale-105"
                    : "border-slate-300 hover:border-slate-400"
                }`}
                style={{ aspectRatio: "1 / 1", width: "80px", minWidth: "80px" }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label={`Select image ${index + 1}`}
              >
                <img
                  src={thumbUrl}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-contain bg-slate-50"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  decoding="async"
                />
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ImageGallery;
