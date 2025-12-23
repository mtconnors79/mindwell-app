/**
 * LazyImage Component
 *
 * Optimized image component for the web portal with:
 * - Native lazy loading
 * - Async decoding
 * - Loading placeholder
 * - Error fallback
 * - WebP support detection
 */

import { useState, useRef, useEffect } from 'react';

const LazyImage = ({
  src,
  alt,
  className = '',
  width,
  height,
  placeholder = null,
  fallback = null,
  objectFit = 'cover',
  ...props
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    // Reset state when src changes
    setLoaded(false);
    setError(false);
  }, [src]);

  const handleLoad = () => {
    setLoaded(true);
    setError(false);
  };

  const handleError = () => {
    setLoaded(false);
    setError(true);
  };

  // Default placeholder - gray background with pulse animation
  const defaultPlaceholder = (
    <div
      className="animate-pulse bg-gray-200 rounded"
      style={{
        width: width || '100%',
        height: height || '100%',
      }}
    />
  );

  // Default error fallback
  const defaultFallback = (
    <div
      className="flex items-center justify-center bg-gray-100 rounded text-gray-400"
      style={{
        width: width || '100%',
        height: height || '100%',
      }}
    >
      <svg
        className="w-8 h-8"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    </div>
  );

  if (error) {
    return fallback || defaultFallback;
  }

  return (
    <div className="relative" style={{ width, height }}>
      {/* Placeholder shown while loading */}
      {!loaded && (placeholder || defaultPlaceholder)}

      {/* Actual image */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={`${className} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        style={{
          objectFit,
          width: width || '100%',
          height: height || '100%',
          position: !loaded ? 'absolute' : 'relative',
          top: 0,
          left: 0,
        }}
        loading="lazy"
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    </div>
  );
};

/**
 * Check if browser supports WebP
 */
LazyImage.supportsWebP = () => {
  if (typeof window === 'undefined') return false;

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
};

/**
 * Preload images
 * @param {string[]} urls - Array of image URLs to preload
 */
LazyImage.preload = (urls) => {
  urls.forEach((url) => {
    const img = new Image();
    img.src = url;
  });
};

export default LazyImage;
