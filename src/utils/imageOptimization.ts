/**
 * Image Optimization Utilities
 * Provides best practices for image handling, caching, and responsive loading
 */

export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 1-100
  format?: "webp" | "jpg" | "png";
}

/**
 * Generate optimized image URL using Unsplash API parameters
 * @param baseUrl - Original image URL
 * @param options - Optimization options
 * @returns Optimized image URL
 */
export const getOptimizedImageUrl = (
  baseUrl: string,
  options: ImageOptimizationOptions = {}
): string => {
  const {
    maxWidth = 1200,
    maxHeight = 800,
    quality = 80,
    format = "auto",
  } = options;

  if (!baseUrl) return "";

  // Handle Unsplash URLs
  if (baseUrl.includes("unsplash.com")) {
    const params = new URLSearchParams({
      w: maxWidth.toString(),
      h: maxHeight.toString(),
      q: quality.toString(),
      auto: format === "auto" ? "format" : format,
      fit: "crop",
    });
    return `${baseUrl}?${params.toString()}`;
  }

  // Handle other URLs without modification
  return baseUrl;
};

/**
 * Preload image for better perceived performance
 * @param src - Image source URL
 * @returns Promise that resolves when image is loaded
 */
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
};

/**
 * Preload multiple images
 * @param sources - Array of image URLs
 * @returns Promise that resolves when all images are loaded
 */
export const preloadImages = (sources: string[]): Promise<void[]> => {
  return Promise.all(sources.map((src) => preloadImage(src).catch(() => undefined)));
};

/**
 * Generate srcset for responsive images
 * @param baseUrl - Original image URL
 * @param widths - Array of responsive widths
 * @returns srcset string for img element
 */
export const generateSrcSet = (baseUrl: string, widths: number[] = [480, 768, 1024, 1200]): string => {
  return widths
    .map((width) => {
      const url = getOptimizedImageUrl(baseUrl, { maxWidth: width });
      return `${url} ${width}w`;
    })
    .join(", ");
};

/**
 * Image cache implementation for client-side caching
 */
export class ImageCache {
  private cache: Map<string, string> = new Map();
  private readonly maxSize: number = 50; // Maximum number of images to cache

  set(key: string, value: string): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  get(key: string): string | undefined {
    return this.cache.get(key);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; maxSize: number } {
    return { size: this.cache.size, maxSize: this.maxSize };
  }
}

// Global image cache instance
export const globalImageCache = new ImageCache();

/**
 * Validate image URL for security and format
 * @param url - URL to validate
 * @returns true if URL is valid and safe
 */
export const isValidImageUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    const validProtocols = ["http:", "https:"];
    const validHosts = ["unsplash.com", "images.unsplash.com"];
    
    return (
      validProtocols.includes(urlObj.protocol) &&
      validHosts.some((host) => urlObj.hostname.includes(host))
    );
  } catch {
    return false;
  }
};

/**
 * Get appropriate image size based on device pixel ratio
 * @param baseSize - Base width in pixels
 * @returns Adjusted width for device pixel ratio
 */
export const getDeviceAdjustedSize = (baseSize: number): number => {
  const dpr = window.devicePixelRatio || 1;
  return Math.ceil(baseSize * Math.min(dpr, 2)); // Cap at 2x for performance
};

/**
 * Format bytes to human-readable size
 * @param bytes - Number of bytes
 * @returns Formatted string (e.g., "2.5 MB")
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};
