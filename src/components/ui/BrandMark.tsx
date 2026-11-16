import React from 'react';

interface BrandMarkProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const BrandMark: React.FC<BrandMarkProps> = ({ size = 'md', className = '' }) => {
  const textClass =
    size === 'lg' ? 'text-[28px]' : size === 'sm' ? 'text-[19px]' : 'text-[22px]';
  const plusSize = size === 'lg' ? 18 : size === 'sm' ? 13 : 15;

  return (
    <span
      className={`inline-flex items-center gap-0.5 font-semibold tracking-[-0.03em] text-[#F5F5F7] whitespace-nowrap shrink-0 select-none ${textClass} ${className}`}
      aria-label="FitPlus"
    >
      <span>fit</span>
      <svg
        width={plusSize}
        height={plusSize}
        viewBox="0 0 18 18"
        fill="none"
        aria-hidden="true"
        className="translate-y-[0.5px]"
      >
        <rect x="7.5" y="2" width="3" height="14" rx="1.5" fill="#FF803E" />
        <rect x="2" y="7.5" width="14" height="3" rx="1.5" fill="#FF803E" />
      </svg>
    </span>
  );
};
