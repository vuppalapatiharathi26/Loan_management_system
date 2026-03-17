import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import CibilEstimatorModal from './CibilEstimatorModal';

const EnhancedHero = () => {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const [cibilOpen, setCibilOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      if (window.scrollY > 100) {
        setShowScrollIndicator(false);
      } else {
        setShowScrollIndicator(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section className="relative min-h-screen px-6 md:px-20 flex items-center bg-gradient-to-r from-green-500 via-emerald-500 to-green-300 overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Blob 1 */}
        <div
          className="absolute top-10 left-10 w-96 h-96 rounded-full bg-white/10 blur-3xl animate-blob"
          style={{
            animation: 'blob 7s infinite',
            animationDelay: '0s',
            transform: `translateY(${scrollY * 0.5}px)`,
          }}
        />
        {/* Blob 2 */}
        <div
          className="absolute bottom-20 right-20 w-80 h-80 rounded-full bg-white/10 blur-3xl animate-blob"
          style={{
            animation: 'blob 7s infinite',
            animationDelay: '2s',
            transform: `translateY(${scrollY * 0.3}px)`,
          }}
        />
        {/* Blob 3 */}
        <div
          className="absolute top-1/2 right-1/4 w-72 h-72 rounded-full bg-white/5 blur-3xl animate-blob"
          style={{
            animation: 'blob 7s infinite',
            animationDelay: '4s',
            transform: `translateY(${scrollY * 0.7}px)`,
          }}
        />
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto w-full relative z-10">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left side - Text */}
          <div className="space-y-8 animate-slideUp">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/30 w-fit hover:bg-white/30 transition-all duration-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
              </span>
              <span className="text-white text-sm font-semibold">Live Platform</span>
            </div>

            {/* Main heading with gradient text */}
            <div>
              <h1 className="text-5xl md:text-5xl font-bold mb-6 leading-tight">
                <span className="text-white">Finance Made Simple.Growth Made Possible.</span>
                <br />
                <span className="bg-gradient-to-r from-white via-green-100 to-emerald-100 bg-clip-text text-transparent">
            
                </span>
              </h1>
              <p className="text-xl text-white/90 max-w-xl">
                Apply for loans easily and track approvals in one place. No paperwork, no delays.
              </p>
            </div>

            {/* Promoted CIBIL estimator */}
            <div className="rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 p-5 max-w-xl hover:bg-white/20 transition-all duration-300">
              <div className="text-white text-2xl font-bold leading-snug">
                Only 23% of Indians have a credit score above 700.
              </div>
              <div className="text-white/90 mt-2">
                Check your estimated score in 60 seconds free.
              </div>
              <button
                type="button"
                onClick={() => setCibilOpen(true)}
                className="mt-4 inline-flex items-center justify-center px-6 py-3 bg-white text-green-700 rounded-lg font-semibold hover:bg-green-50 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Check My Score
              </button>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 pt-4">
              <button
                onClick={() => navigate('/register')}
                className="group px-8 py-4 bg-white text-green-600 rounded-lg hover:bg-green-50 font-semibold text-lg transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 transform active:scale-95"
              >
                Get Started Now
                <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform duration-300">
                  →
                </span>
              </button>
              <button
                onClick={() => navigate('/login')}
                className="px-8 py-4 bg-white/20 backdrop-blur-md text-white border-2 border-white/40 rounded-lg hover:bg-white/30 hover:border-white font-semibold text-lg transition-all duration-300 hover:scale-105 transform active:scale-95"
              >
                Login
              </button>
            </div>

            {/* Features list */}
            <div className="grid grid-cols-2 gap-4 pt-8">
              {[
                { icon: '⚡', text: 'Instant Approval' },
                { icon: '🔐', text: 'Bank-Grade Security' },
                { icon: '📱', text: '100% Digital' },
                { icon: '💰', text: 'Transparent Rates' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 text-white/90 hover:text-white transition-colors"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - Image with glassmorphism */}
          <div className="relative animate-slideDown" style={{ animationDelay: '0.2s' }}>
            <div className="relative rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl bg-white/10 border border-white/20 hover:border-white/40 transition-all duration-300 group">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <img
                src="https://images.unsplash.com/photo-1758524944006-ba8116008496?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaW50ZWNoJTIwbW9iaWxlJTIwYmFua2luZ3xlbnwxfHx8fDE3NzAwMjk3Njd8MA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Loan Management"
                className="w-full h-96 md:h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />

              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-green-600/20 to-transparent" />
            </div>

            {/* Floating stats */}
            <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl p-6 shadow-2xl backdrop-blur-xl border border-white/20 hover:scale-105 transition-transform duration-300">
              <div className="text-3xl font-bold text-green-600">50K+</div>
              <div className="text-sm text-gray-600 font-medium">Happy Users</div>
            </div>

            <div className="absolute -top-6 -right-6 bg-white rounded-2xl p-6 shadow-2xl backdrop-blur-xl border border-white/20 hover:scale-105 transition-transform duration-300">
              <div className="text-3xl font-bold text-green-600">₹500Cr</div>
              <div className="text-sm text-gray-600 font-medium">Disbursed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      {showScrollIndicator && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <ChevronDown className="text-white/80 w-8 h-8" />
        </div>
      )}

      {/* Animated styles */}
      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-blob {
          animation: blob 7s infinite;
        }

        .animate-slideUp {
          animation: slideUp 0.8s ease-out;
        }

        .animate-slideDown {
          animation: slideDown 0.8s ease-out;
        }

        .animate-bounce {
          animation: bounce 2s infinite;
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
          }
        }
      `}</style>

      <CibilEstimatorModal open={cibilOpen} onClose={() => setCibilOpen(false)} />
    </section>
  );
};

export default EnhancedHero;
