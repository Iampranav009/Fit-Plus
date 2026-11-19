import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, FileText, RefreshCw, AlertTriangle } from 'lucide-react';
import { MarketingLayout } from '../../components/marketing/MarketingLayout';
import { Breadcrumb } from '../../components/marketing/Breadcrumb';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const LEGAL_TABS = [
  { key: 'privacy', label: 'Privacy Policy', to: '/privacy' },
  { key: 'terms', label: 'Terms of Service', to: '/terms' },
  { key: 'refund', label: 'Refund Policy', to: '/refund-policy' },
  { key: 'disclaimer', label: 'Disclaimers', to: '/disclaimer' },
] as const;

export const LegalPage: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;

  let activeTab: 'privacy' | 'terms' | 'refund' | 'disclaimer' = 'privacy';
  if (path.includes('terms')) activeTab = 'terms';
  else if (path.includes('refund')) activeTab = 'refund';
  else if (path.includes('disclaimer')) activeTab = 'disclaimer';

  const TAB_TITLES: Record<string, string> = {
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    refund: 'Refund Policy',
    disclaimer: 'Disclaimers',
  };

  useDocumentTitle(`FitPlus | ${TAB_TITLES[activeTab]}`);

  return (
    <MarketingLayout>
      <div className="mkt-container max-w-[900px] py-8 md:py-12 space-y-8">
        {/* Navigation header */}
        <div className="flex flex-col gap-4 border-b border-white/[0.08] pb-5">
          <Breadcrumb items={[{ label: TAB_TITLES[activeTab] }]} />
          <nav aria-label="Legal documents" className="flex flex-wrap gap-2">
            {LEGAL_TABS.map((tab) => (
              <Link
                key={tab.key}
                to={tab.to}
                aria-current={activeTab === tab.key ? 'page' : undefined}
                className={`min-h-[44px] inline-flex items-center px-4 rounded-full text-[0.875rem] font-medium border transition-colors duration-150 ${
                  activeTab === tab.key
                    ? 'bg-[#FF803E] border-[#FF803E] text-[#0B0B0B]'
                    : 'border-white/[0.14] text-[#ABA59D] hover:text-[#F3EEE7] hover:border-white/30'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Content Section */}
        {activeTab === 'privacy' && (
          <div className="mkt-matte rounded-[24px] p-6 md:p-10">
            <div className="flex items-start gap-4 border-b border-white/[0.08] pb-6">
              <Shield className="w-7 h-7 mt-1 shrink-0 text-[#FF803E]" aria-hidden="true" />
              <div>
                <h1 className="mkt-display text-[clamp(2rem,1.6rem+1.6vw,2.75rem)] leading-none">Privacy Policy & DPDP Compliance</h1>
                <p className="mt-2 text-[0.875rem] text-[#ABA59D]">Digital Personal Data Protection Act, 2023 Compliant</p>
              </div>
            </div>
            <div className="mkt-prose pt-2">
              <p>
                FitPlus (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;the Platform&rdquo;) is committed to protecting your personal health and fitness data in accordance with the Digital Personal Data Protection (DPDP) Act, 2023 and applicable Indian data privacy regulations.
              </p>
              <h2>1. Data Collected</h2>
              <ul>
                <li>Account Identity: Name, email address, Firebase Auth identifiers.</li>
                <li>Fitness Metrics: Body weight, height, workout set logs, and exercise volume.</li>
                <li>Coaching Media: Optional check-in photos stored in private, encrypted cloud storage buckets.</li>
                <li>Commerce: Transaction records and payment gateway identifiers (Cashfree). No debit/credit card CVV or bank passwords are ever stored on FitPlus servers.</li>
              </ul>
              <h2>2. Data Portability &amp; Right to Erasure</h2>
              <p>
                In compliance with DPDP 2023, you have the right to request a complete JSON export of your personal data via <code>/api/account/export</code> or permanently delete your account and all associated personal records under Account Settings.
              </p>
              <h2>3. Third-Party Integrations</h2>
              <p>
                Authentication is handled securely via Firebase Authentication. Database persistence and object storage are hosted on Supabase in regional Indian cloud infrastructure. Payment transactions are processed securely via Cashfree Payments.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'terms' && (
          <div className="mkt-matte rounded-[24px] p-6 md:p-10">
            <div className="flex items-start gap-4 border-b border-white/[0.08] pb-6">
              <FileText className="w-7 h-7 mt-1 shrink-0 text-[#FF803E]" aria-hidden="true" />
              <div>
                <h1 className="mkt-display text-[clamp(2rem,1.6rem+1.6vw,2.75rem)] leading-none">Terms of Service</h1>
                <p className="mt-2 text-[0.875rem] text-[#ABA59D]">Last updated: November 2026</p>
              </div>
            </div>
            <div className="mkt-prose pt-2">
              <p>
                By creating an account or accessing the FitPlus platform, you agree to these Terms of Service.
              </p>
              <h2>1. Coaching Marketplace</h2>
              <p>
                FitPlus facilitates direct communication and program design between independent fitness coaches and clients. Coaches are independent fitness professionals and not direct employees of FitPlus.
              </p>
              <h2>2. Client Obligations</h2>
              <p>
                You must be at least 18 years of age or possess adult consent to use coaching features. You agree to provide accurate health details and disclose any physical limitations or injuries prior to beginning any fitness program.
              </p>
              <h2>3. Platform Commissions &amp; Settlements</h2>
              <p>
                Coaches receive net payouts for coaching packages minus standard platform processing fees. All payouts are disbursed to verified Indian bank accounts via compliant payment gateways.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'refund' && (
          <div className="mkt-matte rounded-[24px] p-6 md:p-10">
            <div className="flex items-start gap-4 border-b border-white/[0.08] pb-6">
              <RefreshCw className="w-7 h-7 mt-1 shrink-0 text-[#FF803E]" aria-hidden="true" />
              <div>
                <h1 className="mkt-display text-[clamp(2rem,1.6rem+1.6vw,2.75rem)] leading-none">Refund &amp; Cancellation Policy</h1>
                <p className="mt-2 text-[0.875rem] text-[#ABA59D]">Fair Coaching Guarantee</p>
              </div>
            </div>
            <div className="mkt-prose pt-2">
              <h2>1. 7-Day Initial Guarantee</h2>
              <p>
                If your coach has not designed or assigned a custom workout or nutrition plan within 7 calendar days of your payment, you are entitled to a full 100% refund without penalty.
              </p>
              <h2>2. Refund Processing</h2>
              <p>
                Approved refunds are processed back to the original payment method (UPI, Netbanking, or Card) via Cashfree within 5–7 business days, generating a corresponding credit note in your financial ledger.
              </p>
              <h2>3. Consultation Cancellations</h2>
              <p>
                1-on-1 consultations can be rescheduled up to 4 hours prior to the scheduled start time at no charge.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'disclaimer' && (
          <div className="mkt-matte rounded-[24px] p-6 md:p-10">
            <div className="flex items-start gap-4 border-b border-white/[0.08] pb-6">
              <AlertTriangle className="w-7 h-7 mt-1 shrink-0 text-[#FF803E]" aria-hidden="true" />
              <div>
                <h1 className="mkt-display text-[clamp(2rem,1.6rem+1.6vw,2.75rem)] leading-none">Fitness &amp; Medical Disclaimer</h1>
                <p className="mt-2 text-[0.875rem] text-[#ABA59D]">ICMR-NIN Indian Food Standards &amp; AI Disclosure</p>
              </div>
            </div>
            <div className="mkt-prose pt-2">
              <h2>1. Not Medical Advice</h2>
              <p>
                FitPlus provides general fitness, exercise, and nutritional guidance designed by coaches. The content on this platform is not intended to substitute for professional medical advice, clinical diagnosis, or medical treatment. Always consult a physician before beginning any strenuous physical exercise program.
              </p>
              <h2>2. Nutritional Data Sources</h2>
              <p>
                Nutritional values for authentic Indian foods (e.g. roti, dal, paneer, brown rice) are based on reference values from the Indian Food Composition Tables (IFCT) published by the National Institute of Nutrition (NIN), ICMR, Hyderabad. Individual portions, cooking methods, and ingredients may cause slight variations.
              </p>
              <h2>3. Gemini AI Plan Copilot Disclosure</h2>
              <p>
                Coaching plans generated using the AI Plan Copilot utilize Google Gemini models. All AI-generated drafts are advisory outlines and must be reviewed, customized, and formally approved by a verified human coach before being published or assigned to any client.
              </p>
            </div>
          </div>
        )}
      </div>
    </MarketingLayout>
  );
};
