import React, { useState } from 'react';
import { getAssetSrc } from '../../lib/assets';

interface MediaImageProps {
  assetKey?: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  lazy?: boolean;
  aspectClass?: string;
}

export const MediaImage: React.FC<MediaImageProps> = ({
  assetKey,
  alt,
  className = '',
  imgClassName = 'object-cover',
  lazy = false,
  aspectClass = 'aspect-[4/3]',
}) => {
  const [failed, setFailed] = useState(false);
  const src = getAssetSrc(assetKey);

  return (
    <div
      className={`relative overflow-hidden bg-[#1C2029] ${aspectClass} ${className}`}
    >
      {!failed ? (
        <img
          src={src}
          alt={alt}
          loading={lazy ? 'lazy' : 'eager'}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className={`w-full h-full ${imgClassName}`}
        />
      ) : (
        <div
          className="w-full h-full flex flex-col items-center justify-center bg-[radial-gradient(circle_at_70%_30%,rgba(255,128,62,0.18)_0%,#1C2029_68%)] p-4 text-center"
          aria-hidden={alt === ''}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="4" y="9" width="3" height="6" rx="1" stroke="#A2A8B5" strokeWidth="1.7" />
            <rect x="17" y="9" width="3" height="6" rx="1" stroke="#A2A8B5" strokeWidth="1.7" />
            <path d="M7 12h10" stroke="#FF803E" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </div>
  );
};
