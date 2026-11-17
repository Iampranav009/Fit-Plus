import React from 'react';
import { Search, X } from 'lucide-react';

interface GlassSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}

export const GlassSearchBar: React.FC<GlassSearchBarProps> = ({
  value,
  onChange,
  placeholder = 'Search',
  ariaLabel,
  className = '',
}) => {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Search
        className="w-4 h-4 text-[#A2A8B5] absolute left-4 pointer-events-none"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder}
        className="glass-input w-full min-h-[48px] rounded-[14px] pl-11 pr-11 text-[15px] text-[#F5F5F7] placeholder:text-[#7C8393]"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-1.5 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-[10px] text-[#A2A8B5] hover:text-[#F5F5F7] hover:bg-white/[0.06] cursor-pointer"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
};
