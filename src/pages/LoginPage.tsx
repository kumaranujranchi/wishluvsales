import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Lock } from 'lucide-react';
import { useState } from 'react';

import { SignIn } from '@clerk/clerk-react';

export function LoginPage() {
  const [showForgotPassword, setShowForgotPassword] = useState(false);
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
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-card-custom overflow-hidden transform transition-all duration-500">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-[#1673FF] to-[#0A1C37] px-8 py-10 text-center relative overflow-hidden">
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
            <div className="px-6 py-8 flex justify-center">
              <SignIn 
                routing="path" 
                path="/login"
                fallbackRedirectUrl="/dashboard"
              />
            </div>
            
            {/* Security Badge */}
            <div className="px-8 pb-6 bg-white/95">
              <div className="pt-4 border-t border-gray-200 animate-fadeInUp" style={{ animationDelay: '500ms' }}>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                  <Shield size={16} className="text-[#2BA67A]" />
                  <span>256-bit SSL Encrypted Connection</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Links */}
          <div className="mt-8 text-center space-y-4 animate-fadeIn" style={{ animationDelay: '600ms' }}>
            <p className="text-white/60 text-sm">
              Don't have an account?{' '}
              <button className="text-white font-semibold hover:underline transition-all">
                Contact Administrator
              </button>
            </p>
            <p className="text-white/40 text-xs">
              &copy; 2024 WishPro. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Apple-style Jumping Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
            onClick={() => setShowForgotPassword(false)}
          ></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative z-10 animate-bounce-in transform transition-all scale-100">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="text-[#1673FF]" size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Reset Password</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Please contact your system administrator or email support at
                <br />
                <a href="mailto:anuj.kumar@wishluvbuildcon.com" className="text-[#1673FF] font-medium hover:underline">
                  anuj.kumar@wishluvbuildcon.com
                </a>
                <br />
                to initiate a password reset.
              </p>
              <div className="pt-4">
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full py-3 bg-[#1673FF] hover:bg-[#0A1C37] text-white rounded-xl font-semibold transition-colors duration-200"
                >
                  Okay, understood
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
