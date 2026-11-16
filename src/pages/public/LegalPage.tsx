import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Shield, FileText, RefreshCw, AlertTriangle } from 'lucide-react';

export const LegalPage: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;

  let activeTab: 'privacy' | 'terms' | 'refund' | 'disclaimer' = 'privacy';
  if (path.includes('terms')) activeTab = 'terms';
  else if (path.includes('refund')) activeTab = 'refund';
  else if (path.includes('disclaimer')) activeTab = 'disclaimer';

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 px-4 py-8 md:py-12 flex justify-center">
      <div className="max-w-4xl w-full space-y-8">
        {/* Navigation header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to FitPlus
          </Link>
          <div className="flex gap-2">
            <Link
              to="/privacy"
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeTab === 'privacy'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeTab === 'terms'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Terms of Service
            </Link>
            <Link
              to="/refund-policy"
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeTab === 'refund'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Refund Policy
            </Link>
            <Link
              to="/disclaimer"
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                activeTab === 'disclaimer'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Disclaimers
            </Link>
          </div>
        </div>

        {/* Content Section */}
        {activeTab === 'privacy' && (
          <div className="space-y-6 bg-neutral-900/50 backdrop-blur-xl border border-neutral-800/80 rounded-2xl p-6 md:p-8">
            <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
              <Shield className="w-6 h-6 text-emerald-400" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold">Privacy Policy & DPDP Compliance</h1>
                <p className="text-xs text-neutral-400">Digital Personal Data Protection Act, 2023 Compliant</p>
              </div>
            </div>
            <div className="prose prose-invert max-w-none text-sm text-neutral-300 space-y-4">
              <p>
                FitPlus (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;the Platform&rdquo;) is committed to protecting your personal health and fitness data in accordance with the Digital Personal Data Protection (DPDP) Act, 2023 and applicable Indian data privacy regulations.
              </p>
              <h2 className="text-base font-semibold text-white">1. Data Collected</h2>
              <ul className="list-disc pl-5 space-y-1 text-neutral-400">
                <li>Account Identity: Name, email address, Firebase Auth identifiers.</li>
                <li>Fitness Metrics: Body weight, height, workout set logs, and exercise volume.</li>
                <li>Coaching Media: Optional check-in photos stored in private, encrypted cloud storage buckets.</li>
                <li>Commerce: Transaction records and payment gateway identifiers (Cashfree). No debit/credit card CVV or bank passwords are ever stored on FitPlus servers.</li>
              </ul>
              <h2 className="text-base font-semibold text-white">2. Data Portability &amp; Right to Erasure</h2>
              <p>
                In compliance with DPDP 2023, you have the right to request a complete JSON export of your personal data via <code className="text-emerald-400">/api/account/export</code> or permanently delete your account and all associated personal records under Account Settings.
              </p>
              <h2 className="text-base font-semibold text-white">3. Third-Party Integrations</h2>
              <p>
                Authentication is handled securely via Firebase Authentication. Database persistence and object storage are hosted on Supabase in regional Indian cloud infrastructure. Payment transactions are processed securely via Cashfree Payments.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'terms' && (
          <div className="space-y-6 bg-neutral-900/50 backdrop-blur-xl border border-neutral-800/80 rounded-2xl p-6 md:p-8">
            <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
              <FileText className="w-6 h-6 text-blue-400" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold">Terms of Service</h1>
                <p className="text-xs text-neutral-400">Last updated: November 2026</p>
              </div>
            </div>
            <div className="prose prose-invert max-w-none text-sm text-neutral-300 space-y-4">
              <p>
                By creating an account or accessing the FitPlus platform, you agree to these Terms of Service.
              </p>
              <h2 className="text-base font-semibold text-white">1. Coaching Marketplace</h2>
              <p>
                FitPlus facilitates direct communication and program design between independent fitness coaches and clients. Coaches are independent fitness professionals and not direct employees of FitPlus.
              </p>
              <h2 className="text-base font-semibold text-white">2. Client Obligations</h2>
              <p>
                You must be at least 18 years of age or possess adult consent to use coaching features. You agree to provide accurate health details and disclose any physical limitations or injuries prior to beginning any fitness program.
              </p>
              <h2 className="text-base font-semibold text-white">3. Platform Commissions &amp; Settlements</h2>
              <p>
                Coaches receive net payouts for coaching packages minus standard platform processing fees. All payouts are disbursed to verified Indian bank accounts via compliant payment gateways.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'refund' && (
          <div className="space-y-6 bg-neutral-900/50 backdrop-blur-xl border border-neutral-800/80 rounded-2xl p-6 md:p-8">
            <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
              <RefreshCw className="w-6 h-6 text-amber-400" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold">Refund &amp; Cancellation Policy</h1>
                <p className="text-xs text-neutral-400">Fair Coaching Guarantee</p>
              </div>
            </div>
            <div className="prose prose-invert max-w-none text-sm text-neutral-300 space-y-4">
              <h2 className="text-base font-semibold text-white">1. 7-Day Initial Guarantee</h2>
              <p>
                If your coach has not designed or assigned a custom workout or nutrition plan within 7 calendar days of your payment, you are entitled to a full 100% refund without penalty.
              </p>
              <h2 className="text-base font-semibold text-white">2. Refund Processing</h2>
              <p>
                Approved refunds are processed back to the original payment method (UPI, Netbanking, or Card) via Cashfree within 5–7 business days, generating a corresponding credit note in your financial ledger.
              </p>
              <h2 className="text-base font-semibold text-white">3. Consultation Cancellations</h2>
              <p>
                1-on-1 consultations can be rescheduled up to 4 hours prior to the scheduled start time at no charge.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'disclaimer' && (
          <div className="space-y-6 bg-neutral-900/50 backdrop-blur-xl border border-neutral-800/80 rounded-2xl p-6 md:p-8">
            <div className="flex items-center gap-3 border-b border-neutral-800 pb-4">
              <AlertTriangle className="w-6 h-6 text-rose-400" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold">Fitness &amp; Medical Disclaimer</h1>
                <p className="text-xs text-neutral-400">ICMR-NIN Indian Food Standards &amp; AI Disclosure</p>
              </div>
            </div>
            <div className="prose prose-invert max-w-none text-sm text-neutral-300 space-y-4">
              <h2 className="text-base font-semibold text-white">1. Not Medical Advice</h2>
              <p>
                FitPlus provides general fitness, exercise, and nutritional guidance designed by coaches. The content on this platform is not intended to substitute for professional medical advice, clinical diagnosis, or medical treatment. Always consult a physician before beginning any strenuous physical exercise program.
              </p>
              <h2 className="text-base font-semibold text-white">2. Nutritional Data Sources</h2>
              <p>
                Nutritional values for authentic Indian foods (e.g. roti, dal, paneer, brown rice) are based on reference values from the Indian Food Composition Tables (IFCT) published by the National Institute of Nutrition (NIN), ICMR, Hyderabad. Individual portions, cooking methods, and ingredients may cause slight variations.
              </p>
              <h2 className="text-base font-semibold text-white">3. Gemini AI Plan Copilot Disclosure</h2>
              <p>
                Coaching plans generated using the AI Plan Copilot utilize Google Gemini models. All AI-generated drafts are advisory outlines and must be reviewed, customized, and formally approved by a verified human coach before being published or assigned to any client.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
