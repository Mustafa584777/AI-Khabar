'app/pricing/page.tsx';
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Check, 
  Sparkles, 
  Zap, 
  ShieldCheck, 
  HelpCircle, 
  ArrowLeft, 
  Crown, 
  Star, 
  ChevronDown, 
  ChevronUp, 
  Lock,
  CreditCard
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successPaid, setSuccessPaid] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleSelectPlan = (planName: string, price: string) => {
    setSelectedPlan(`${planName} (${isYearly ? 'Yearly' : 'Monthly'}) - ${price}`);
    setIsModalOpen(true);
    setSuccessPaid(false);
  };

  const handleSimulatePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setSuccessPaid(true);
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });
    }, 1500);
  };

  const faqs = [
    {
      q: "Can I switch between monthly and yearly billing anytime?",
      a: "Yes! You can upgrade from monthly to yearly anytime to unlock the 20% discount and 2 months free benefit. The price difference will be prorated automatically."
    },
    {
      q: "What payment methods are supported?",
      a: "We support all major credit/debit cards (Visa, MasterCard, RuPay), UPI, Net Banking, and secure wallets via Razorpay and Stripe gateways."
    },
    {
      q: "Is there a refund policy?",
      a: "We offer a 7-day no-questions-asked money-back guarantee on all yearly plans if you are not fully satisfied with our AI prompt tools."
    },
    {
      q: "How does the automatic model fallback work?",
      a: "Pro and Enterprise users enjoy instant automatic fallback across Gemini 2.5 Flash, Gemini 3.7 Flash, and Gemini 3.1 Flash-Lite, ensuring 100% uptime and zero rate-limit interruptions."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Top Bar */}
      <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium transition">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-semibold border border-indigo-100">
          <Sparkles className="w-4 h-4" /> Secure 256-bit Encrypted Checkout
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 pt-10 pb-16 text-center space-y-4">
        <span className="inline-block px-3.5 py-1.5 rounded-full bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider">
          Flexible Pricing Plans
        </span>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
          Supercharge Your AI Prompt Generation
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Unlock unlimited professional photo prompts, advanced AI editors, and priority multi-model support with zero limits.
        </p>

        {/* Monthly / Yearly Toggle */}
        <div className="pt-6 flex items-center justify-center gap-4">
          <span className={`text-sm font-semibold ${!isYearly ? 'text-indigo-600' : 'text-slate-500'}`}>
            Monthly Billing
          </span>
          <button
            onClick={() => setIsYearly(!isYearly)}
            className="w-16 h-8 bg-indigo-600 rounded-full p-1 transition relative shadow-inner cursor-pointer"
            aria-label="Toggle Billing Cycle"
          >
            <div
              className={`w-6 h-6 bg-white rounded-full shadow-md transform transition duration-300 ${
                isYearly ? 'translate-x-8' : 'translate-x-0'
              }`}
            />
          </button>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${isYearly ? 'text-indigo-600' : 'text-slate-500'}`}>
              Yearly Billing
            </span>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full animate-pulse">
              Save 20% + 2 Months Free
            </span>
          </div>
        </div>
      </section>

      {/* Pricing Cards Grid */}
      <section className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        
        {/* Free Plan */}
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm flex flex-col justify-between transition hover:shadow-md">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">Starter Free</h3>
              <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">Basic</span>
            </div>
            <p className="text-slate-600 text-sm mb-6">Essential features for exploring curated AI photo prompts.</p>
            <div className="mb-6">
              <span className="text-4xl font-extrabold text-slate-900">₹0</span>
              <span className="text-slate-500 text-sm"> / forever</span>
            </div>
            <ul className="space-y-3.5 text-sm text-slate-700 mb-8">
              <li className="flex items-center gap-3"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> 10 Daily Prompt Generations</li>
              <li className="flex items-center gap-3"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> Standard Community Gallery Access</li>
              <li className="flex items-center gap-3"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> Basic Copy-Paste Prompts</li>
              <li className="flex items-center gap-3 text-slate-400"><span className="w-4 h-4 flex items-center justify-center font-bold text-xs">—</span> No Advanced AI Editor</li>
              <li className="flex items-center gap-3 text-slate-400"><span className="w-4 h-4 flex items-center justify-center font-bold text-xs">—</span> Standard Model Queue</li>
            </ul>
          </div>
          <button
            onClick={() => handleSelectPlan("Starter Free", "₹0")}
            className="w-full py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition"
          >
            Get Started Free
          </button>
        </div>

        {/* Pro Plan (Most Popular) */}
        <div className="bg-white rounded-2xl p-8 border-2 border-indigo-600 shadow-xl flex flex-col justify-between relative transform lg:-translate-y-2">
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 fill-white" /> Most Popular Choice
          </div>
          <div>
            <div className="flex items-center justify-between mb-4 mt-2">
              <h3 className="text-2xl font-bold text-slate-900">Pro Creator</h3>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">Recommended</span>
            </div>
            <p className="text-slate-600 text-sm mb-6">Designed for professional creators, designers, and prompt engineers.</p>
            <div className="mb-6 flex items-baseline gap-2">
              <span className="text-5xl font-extrabold text-slate-900">
                {isYearly ? '₹399' : '₹499'}
              </span>
              <span className="text-slate-500 text-sm"> / month {isYearly && '(billed annually)'}</span>
            </div>
            <ul className="space-y-3.5 text-sm text-slate-700 mb-8">
              <li className="flex items-center gap-3"><Check className="w-4 h-4 text-indigo-600 shrink-0 font-bold" /> <strong>Unlimited</strong> AI Prompt Generations</li>
              <li className="flex items-center gap-3"><Check className="w-4 h-4 text-indigo-600 shrink-0 font-bold" /> Advanced Prompt Editor & AI Assistant</li>
              <li className="flex items-center gap-3"><Check className="w-4 h-4 text-indigo-600 shrink-0 font-bold" /> Priority Multi-Model Auto-Fallback</li>
              <li className="flex items-center gap-3"><Check className="w-4 h-4 text-indigo-600 shrink-0 font-bold" /> High-Resolution Photo Prompt Exports</li>
              <li className="flex items-center gap-3"><Check className="w-4 h-4 text-indigo-600 shrink-0 font-bold" /> Priority Email & Discord Support</li>
            </ul>
          </div>
          <button
            onClick={() => handleSelectPlan("Pro Creator", isYearly ? '₹4,788 / year' : '₹499 / month')}
            className="w-full py-3.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4 fill-white" /> Upgrade to Pro
          </button>
        </div>

        {/* Enterprise / Lifetime Plan */}
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm flex flex-col justify-between transition hover:shadow-md">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">Enterprise & Lifetime</h3>
              <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold">VIP</span>
            </div>
            <p className="text-slate-600 text-sm mb-6">For studios, agencies, and power teams requiring dedicated access.</p>
            <div className="mb-6">
              <span className="text-4xl font-extrabold text-slate-900">
                {isYearly ? '₹11,999' : '₹14,999'}
              </span>
              <span className="text-slate-500 text-sm"> {isYearly ? '/ lifetime access' : '/ one-time'}</span>
            </div>
            <ul className="space-y-3.5 text-sm text-slate-700 mb-8">
              <li className="flex items-center gap-3"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> Everything in Pro Creator Included</li>
              <li className="flex items-center gap-3"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> Team Collaboration Workspace</li>
              <li className="flex items-center gap-3"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> Custom API Key Integration</li>
              <li className="flex items-center gap-3"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> Dedicated Account Manager</li>
              <li className="flex items-center gap-3"><Check className="w-4 h-4 text-emerald-500 shrink-0" /> Lifetime Updates & Early Access</li>
            </ul>
          </div>
          <button
            onClick={() => handleSelectPlan("Enterprise Lifetime", isYearly ? '₹11,999' : '₹14,999')}
            className="w-full py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition flex items-center justify-center gap-2"
          >
            <Crown className="w-4 h-4 text-amber-400" /> Get Lifetime Access
          </button>
        </div>

      </section>

      {/* Feature Comparison Matrix */}
      <section className="max-w-6xl mx-auto px-6 mt-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900">Compare Plan Features</h2>
          <p className="text-slate-600 mt-2">Find the right tier tailored to your creative workflow.</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 text-sm font-semibold">
                <th className="p-4 pl-6">Feature</th>
                <th className="p-4 text-center">Starter Free</th>
                <th className="p-4 text-center bg-indigo-50/50 text-indigo-900">Pro Creator</th>
                <th className="p-4 text-center">Enterprise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
              <tr>
                <td className="p-4 pl-6 font-medium text-slate-900">Prompt Generations</td>
                <td className="p-4 text-center">10 / day</td>
                <td className="p-4 text-center font-bold text-indigo-600 bg-indigo-50/50">Unlimited</td>
                <td className="p-4 text-center font-bold">Unlimited + Priority</td>
              </tr>
              <tr>
                <td className="p-4 pl-6 font-medium text-slate-900">AI Model Auto-Fallback</td>
                <td className="p-4 text-center">Standard</td>
                <td className="p-4 text-center bg-indigo-50/50 text-emerald-600 font-bold">Instant (Flash & Pro)</td>
                <td className="p-4 text-center text-emerald-600 font-bold">Ultra-Priority</td>
              </tr>
              <tr>
                <td className="p-4 pl-6 font-medium text-slate-900">Advanced Prompt Editor</td>
                <td className="p-4 text-center">—</td>
                <td className="p-4 text-center bg-indigo-50/50 text-emerald-600 font-bold">✓ Included</td>
                <td className="p-4 text-center text-emerald-600 font-bold">✓ Included</td>
              </tr>
              <tr>
                <td className="p-4 pl-6 font-medium text-slate-900">Custom Tags & Organization</td>
                <td className="p-4 text-center">Basic</td>
                <td className="p-4 text-center bg-indigo-50/50 text-emerald-600 font-bold">Advanced Sync</td>
                <td className="p-4 text-center text-emerald-600 font-bold">Full Workspace</td>
              </tr>
              <tr>
                <td className="p-4 pl-6 font-medium text-slate-900">Support</td>
                <td className="p-4 text-center">Community</td>
                <td className="p-4 text-center bg-indigo-50/50">Priority Email</td>
                <td className="p-4 text-center">Dedicated 24/7</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-3xl mx-auto px-6 mt-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900">Frequently Asked Questions</h2>
          <p className="text-slate-600 mt-2">Got questions about billing or plans? We are here to help.</p>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div key={index} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm transition">
                <button
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full p-5 text-left font-semibold text-slate-900 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp className="w-5 h-5 text-indigo-600" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>
                {isOpen && (
                  <div className="p-5 pt-0 text-slate-600 text-sm leading-relaxed border-t border-slate-100">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Checkout / Payment Modal Simulation */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            {!successPaid ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-indigo-600 font-bold">
                    <CreditCard className="w-5 h-5" /> Secure Checkout
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                  >
                    ✕
                  </button>
                </div>
                <div className="bg-indigo-50 rounded-xl p-4 mb-6 border border-indigo-100">
                  <p className="text-xs text-indigo-700 font-semibold uppercase tracking-wider">Selected Plan</p>
                  <p className="text-lg font-extrabold text-slate-900 mt-1">{selectedPlan}</p>
                </div>
                <div className="space-y-4 mb-6 text-sm text-slate-600">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>Billing Cycle</span>
                    <span className="font-semibold text-slate-900">{isYearly ? 'Yearly (20% OFF)' : 'Monthly'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>Tax & Gateway Fees</span>
                    <span className="font-semibold text-emerald-600">Included (GST 0%)</span>
                  </div>
                  <div className="flex justify-between py-1 text-base font-bold text-slate-900">
                    <span>Total Due</span>
                    <span className="text-indigo-600">Secure Instant Access</span>
                  </div>
                </div>
                <button
                  disabled={isProcessing}
                  onClick={handleSimulatePayment}
                  className="w-full py-3.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing Payment...
                    </span>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" /> Pay & Activate Instantly
                    </>
                  )}
                </button>
              </>
            ) : (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl font-bold shadow-inner">
                  ✓
                </div>
                <h3 className="text-2xl font-bold text-slate-900">Payment Successful!</h3>
                <p className="text-slate-600 text-sm">
                  Welcome to <strong className="text-indigo-600">{selectedPlan}</strong>. Your account has been upgraded instantly.
                </p>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition"
                >
                  Start Creating Now
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
