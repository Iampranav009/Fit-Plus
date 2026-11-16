import React from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from '../ui/BrandMark';

export const PublicTopBar: React.FC = () => {
  return (
    <header className="sticky top-0 z-30 px-3 sm:px-6 lg:px-8 pt-2.5 pt-safe">
      <div className="glass-nav max-w-[1280px] mx-auto h-15 rounded-[18px] px-4 sm:px-6 flex items-center justify-between gap-6">
        <Link to="/" aria-label="FitPlus home" className="whitespace-nowrap shrink-0">
          <BrandMark />
        </Link>

        <nav
          aria-label="Public navigation"
          className="hidden md:flex items-center gap-6 text-[14px] font-medium text-[#A2A8B5]"
        >
          <Link to="/discover" className="hover:text-[#F5F5F7] transition-colors whitespace-nowrap shrink-0">
            Find a trainer
          </Link>
          <Link to="/welcome" className="hover:text-[#F5F5F7] transition-colors whitespace-nowrap shrink-0">
            Welcome
          </Link>
          <Link
            to="/join/FIT-ARJUN-2026"
            className="hover:text-[#F5F5F7] transition-colors whitespace-nowrap shrink-0"
          >
            Sample invite
          </Link>
          <Link to="/auth" className="hover:text-[#F5F5F7] transition-colors whitespace-nowrap shrink-0">
            Demo access
          </Link>
        </nav>

        <div className="flex items-center shrink-0">
          <Link
            to="/auth"
            className="inline-flex items-center justify-center min-h-[40px] px-4 py-2 rounded-[12px] bg-[#FF803E] text-[#101218] text-[14px] font-semibold hover:bg-[#FF9259] transition-colors shadow-[0_8px_20px_-6px_rgba(255,128,62,0.55)] whitespace-nowrap shrink-0"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
};
