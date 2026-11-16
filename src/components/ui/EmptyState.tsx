import React from 'react';
import { Button } from './Button';

export type EmptyArtworkType = 'plan' | 'coach' | 'progress' | 'achievement' | 'clients';

interface EmptyStateProps {
  artwork: EmptyArtworkType;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
}

const EmptyArtwork: React.FC<{ type: EmptyArtworkType }> = ({ type }) => {
  if (type === 'plan') {
    return (
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
        <rect x="13" y="10" width="30" height="38" rx="7" stroke="rgba(255,255,255,0.14)" strokeWidth="2" fill="#252A35" />
        <rect x="21" y="6" width="14" height="7" rx="3" stroke="#A2A8B5" strokeWidth="1.8" fill="#1C2029" />
        <path d="M20 24h16M20 31h11" stroke="#A2A8B5" strokeWidth="2" strokeLinecap="round" />
        <circle cx="38" cy="39" r="8" fill="#2B1C16" stroke="#FF803E" strokeWidth="1.8" />
        <path d="M35 39h6M38 36v6" stroke="#FF803E" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === 'coach' || type === 'clients') {
    return (
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
        <circle cx="20" cy="21" r="6" stroke="#A2A8B5" strokeWidth="2" />
        <circle cx="37" cy="21" r="6" stroke="#FF803E" strokeWidth="2" />
        <path d="M10 42c1.5-6 6-9 10-9s8.5 3 10 9" stroke="#A2A8B5" strokeWidth="2" strokeLinecap="round" />
        <path d="M27 42c1.5-6 5.5-9 10-9s8.5 3 10 9" stroke="#FF803E" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === 'achievement') {
    return (
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
        <circle cx="28" cy="26" r="14" fill="#2B1C16" stroke="#FF803E" strokeWidth="2" />
        <path d="M28 20v12M22 26h12" stroke="#FF803E" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M21 38l-3 11 10-4 10 4-3-11" stroke="#A2A8B5" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
      <path d="M10 42h36" stroke="rgba(255,255,255,0.14)" strokeWidth="2" strokeLinecap="round" />
      <path d="M13 36l9-8 8 4 13-14" stroke="#A2A8B5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="13" cy="36" r="3" fill="#7C8393" />
      <circle cx="22" cy="28" r="3" fill="#7C8393" />
      <circle cx="30" cy="32" r="3" fill="#A2A8B5" />
      <circle cx="43" cy="18" r="3.5" fill="#FF803E" />
    </svg>
  );
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  artwork,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondaryAction,
}) => {
  return (
    <div className="surface-card rounded-[22px] px-6 py-8 flex flex-col items-center text-center gap-3">
      <EmptyArtwork type={artwork} />
      <h3 className="text-[18px] font-semibold text-[#F5F5F7] max-w-md">{title}</h3>
      <p className="text-[14px] text-[#A2A8B5] max-w-md leading-relaxed">{description}</p>
      {(actionLabel || secondaryLabel) && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          {actionLabel && onAction ? (
            <Button onClick={onAction} size="sm">
              {actionLabel}
            </Button>
          ) : null}
          {secondaryLabel && onSecondaryAction ? (
            <Button variant="secondary" onClick={onSecondaryAction} size="sm">
              {secondaryLabel}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
};
