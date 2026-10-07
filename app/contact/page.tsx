'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/public/Header';
import { Footer } from '@/components/public/Footer';
import { AdminLoginModal } from '@/components/admin/AdminLoginModal';
import { Mail, MessageSquare, Send, CheckCircle2, Home, ArrowLeft } from 'lucide-react';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !message) return;
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-neutral-500 mb-6">
          <Link href="/" className="hover:text-[#E60023] flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
          <span>/</span>
          <span className="text-neutral-800 dark:text-neutral-200 font-semibold">Contact Us</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Left info column */}
          <div className="md:col-span-5 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/60 text-[#E60023] text-xs font-bold border border-red-200 dark:border-red-800/60">
                <MessageSquare className="w-4 h-4" />
                <span>Get In Touch</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
                Contact Us
              </h1>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Have a question about a photo prompt, prompt curation request, partnership inquiry, or technical feedback? We&apos;d love to hear from you.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-950/60 text-[#E60023] flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-neutral-900 dark:text-white">Email Address</h4>
                  <p className="text-neutral-500 mt-0.5">contact@geminipromptgenerator.online</p>
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-500">
                <p>Curated by <strong className="text-neutral-800 dark:text-neutral-200">tool.reelz</strong></p>
                <p className="mt-0.5">Average response time: within 24–48 business hours.</p>
              </div>
            </div>
          </div>

          {/* Right form column */}
          <div className="md:col-span-7">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xs">
              {submitted ? (
                <div className="py-12 text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
                    Message Sent Successfully!
                  </h3>
                  <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                    Thank you for reaching out. We will review your message and get back to you shortly.
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setName('');
                      setEmail('');
                      setSubject('');
                      setMessage('');
                    }}
                    className="px-5 py-2 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-all"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Rivera"
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E60023]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E60023]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g. Prompt Request or Feedback"
                      className="w-full px-4 py-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E60023]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1.5">
                      Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Write your thoughts or inquiry here..."
                      className="w-full p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#E60023]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-[#E60023] hover:bg-[#ad081b] text-white text-xs font-bold shadow-md shadow-red-500/20 flex items-center justify-center gap-2 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Message</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#E60023] hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </main>

      <AdminLoginModal />
      <Footer />
    </div>
  );
}
