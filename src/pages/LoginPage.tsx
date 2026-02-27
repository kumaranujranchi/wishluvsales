import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';

import { SignIn } from '@clerk/clerk-react';

export function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1C37] via-[#0F2744] to-[#1673FF] relative overflow-y-auto overflow-x-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-20 -left-20 md:left-10 w-72 h-72 bg-white rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 -right-20 md:right-10 w-96 h-96 bg-[#1673FF] rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Back to Home Link */}
      <div className="absolute top-6 left-6 z-50 animate-fadeIn">
        <Link
          to="/"
          className="group flex items-center space-x-2 text-white/80 hover:text-white transition-colors duration-300"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform duration-300" />
          <span className="text-sm font-medium">Back to Home</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="min-h-[100dvh] flex items-center justify-center p-4 md:p-8 relative z-10">
        <div className="max-w-md w-full animate-fadeInUp">
          {/* Login Card */}
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-card-custom transform transition-all duration-500">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-[#1673FF] to-[#0A1C37] px-8 py-10 text-center relative rounded-t-3xl overflow-hidden">
              <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
              <div className="relative z-10">
                <div className="inline-flex items-center justify-center mb-4 transform transition-transform duration-500 hover:scale-110 hover:rotate-3">
                  <img src="/logo-light.png" alt="WishPro Logo" className="w-20 h-20 object-contain rounded-2xl" />
                </div>
                <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Welcome Back</h1>
                <p className="text-white/80 text-sm">Sign in to access your WishPro dashboard</p>
              </div>
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
            </div>

            {/* Clerk SignIn Section */}
            <div className="px-4 sm:px-8 pt-8 pb-6 flex justify-center">
              <SignIn
                fallbackRedirectUrl="/dashboard"
                appearance={{
                  layout: {
                    showOptionalFields: false,
                    socialButtonsPlacement: 'bottom',
                  },
                  elements: {
                    // Remove Clerk's own header completely - we have our own
                    headerTitle: 'hidden',
                    headerSubtitle: 'hidden',
                    header: 'hidden',
                    // Card styling - seamless with white background
                    card: 'shadow-none border-0 p-2 sm:p-4 bg-transparent w-full',
                    rootBox: 'w-full flex justify-center',
                    formResendCodeLink: 'text-[#1673FF]',
                    // Form button styling
                    formButtonPrimary:
                      'bg-gradient-to-r from-[#1673FF] to-[#0A1C37] hover:opacity-90 transition-all duration-200 text-white font-semibold py-3.5 rounded-xl w-full text-sm normal-case shadow-lg shadow-blue-500/20',
                    // Input field styling
                    formFieldInput:
                      'border border-gray-200 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-[#1673FF]/30 focus:border-[#1673FF] outline-none w-full transition-all duration-200 bg-gray-50/50',
                    formFieldLabel: 'text-gray-700 font-semibold text-[13px] mb-1.5 ml-1',
                    // Social buttons
                    socialButtonsBlockButton:
                      'border border-gray-200 rounded-xl py-3 text-sm font-medium hover:bg-gray-50 transition-all duration-200 bg-white shadow-sm',
                    dividerLine: 'bg-gray-100',
                    dividerText: 'text-gray-400 text-xs font-medium uppercase tracking-wider',
                    // Footer - hide "Don't have an account" and "Secured by Clerk"
                    footer: 'hidden',
                    footerAction: 'hidden',
                    identityPreviewEditButton: 'text-[#1673FF]',
                  },
                }}
              />
            </div>

            {/* Security Badge */}
            <div className="px-8 pb-6 bg-white/95">
              <div className="pt-4 border-t border-gray-100">
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-400">
                  <Shield size={16} className="text-[#2BA67A]" />
                  <span>256-bit SSL Encrypted Connection</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-6 text-center space-y-2 animate-fadeIn" style={{ animationDelay: '600ms' }}>
            <p className="text-white/60 text-sm">
              Don't have an account?{' '}
              <span className="text-white font-semibold">Contact Administrator</span>
            </p>
            <p className="text-white/30 text-xs">
              &copy; 2024 WishPro. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
