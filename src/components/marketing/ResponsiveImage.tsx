import React from 'react';
import type { MarketingImage } from './marketingMedia';

interface ResponsiveImageProps {
  image: MarketingImage;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  imgClassName?: string;
  style?: React.CSSProperties;
}

/**
 * <picture> with AVIF (when available) + WebP srcset. Intrinsic width/height are
 * always set so the browser reserves space and CLS stays at zero.
 */
export const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  image,
  alt,
  sizes,
  priority = false,
  className,
  imgClassName,
  style,
}) => (
  <picture className={className}>
    {image.avifSrcSet ? <source type="image/avif" srcSet={image.avifSrcSet} sizes={sizes} /> : null}
    <source type="image/webp" srcSet={image.srcSet} sizes={sizes} />
    <img
      src={image.src}
      alt={alt}
      width={image.width}
      height={image.height}
      sizes={sizes}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      // React 19 forwards fetchPriority to the DOM attribute.
      fetchPriority={priority ? 'high' : 'auto'}
      className={imgClassName}
      style={style}
    />
  </picture>
);
