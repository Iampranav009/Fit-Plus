import React from 'react';
import { Link } from 'react-router-dom';
import { BrandMark } from '../ui/BrandMark';
import { PWAInstallButton } from '../ui/PWAInstallButton';
import { CTA, LEGAL_LINKS } from './links';

const COLUMNS = [
  {
    heading: 'Clients',
    links: [
      { label: CTA.findTrainer.label, to: CTA.findTrainer.to },
      { label: CTA.clientDemo.label, to: CTA.clientDemo.to },
      { label: CTA.howItWorks.label, to: CTA.howItWorks.to },
    ],
  },
  {
    heading: 'Trainers',
    links: [
      { label: 'FitPlus for trainers', to: CTA.forTrainers.to },
      { label: CTA.coachDemo.label, to: CTA.coachDemo.to },
      { label: CTA.createAccount.label, to: CTA.createAccount.to },
    ],
  },
  {
    heading: 'Account',
    links: [
      { label: CTA.signIn.label, to: CTA.signIn.to },
      { label: 'Reset password', to: '/auth?mode=reset' },
    ],
  },
  { heading: 'Legal', links: LEGAL_LINKS.map((l) => ({ label: l.label, to: l.to })) },
];

export const SiteFooter: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <footer className="border-t border-white/[0.08] mt-auto">
    <div className="mkt-container py-12">
      {compact ? null : (
        <div className="grid grid-cols-2 md:grid-cols-[1.4fr_repeat(4,1fr)] gap-x-6 gap-y-10">
          <div className="col-span-2 md:col-span-1 max-w-[280px]">
            <BrandMark />
            <p className="mt-3 mkt-small">
              Personal fitness coaching for India. Independent trainers, structured plans, real check-ins.
            </p>
            <div className="mt-4">
              <PWAInstallButton compact />
            </div>
          </div>
          {COLUMNS.map((col) => (
            <nav key={col.heading} aria-label={`${col.heading} links`}>
              <h2 className="text-[0.8125rem] font-semibold text-[#F3EEE7]">{col.heading}</h2>
              <ul className="mt-3 space-y-1">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="mkt-link inline-flex min-h-[36px] items-center text-[0.875rem]">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      )}
      <div
        className={`${compact ? '' : 'mt-12 pt-6 border-t border-white/[0.08]'} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
      >
        <p className="mkt-small">© {new Date().getFullYear()} FitPlus · Made for India · Prices in INR</p>
        {compact ? (
          <ul className="flex flex-wrap gap-x-5 gap-y-1">
            {LEGAL_LINKS.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="mkt-link text-[0.8125rem] inline-flex min-h-[36px] items-center">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  </footer>
);
