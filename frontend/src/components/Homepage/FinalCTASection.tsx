import { Check, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FinalCTASection = () => {
  const navigate = useNavigate();

  const handleGetLoan = () => {
    navigate('/register');
  };

  return (
    <section className="relative py-24 px-6 overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-green-600 via-emerald-500 to-green-400 opacity-95" />

      {/* Animated pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full" style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, transparent 20%, white 21%, white 34%, transparent 35%, transparent),
                           radial-gradient(circle at 60% 70%, transparent 20%, white 21%, white 34%, transparent 35%, transparent),
                           radial-gradient(circle at 80% 10%, transparent 20%, white 21%, white 34%, transparent 35%, transparent)`,
          backgroundSize: '200% 200%',
          backgroundPosition: '0% 0%',
          animation: 'drift 20s linear infinite',
        }} />
      </div>

      {/* Floating elements */}
      <div className="absolute top-20 right-10 text-6xl animate-bounce" style={{ animationDelay: '0s' }}>
        ⚡
      </div>
      <div className="absolute bottom-20 left-10 text-6xl animate-bounce" style={{ animationDelay: '0.5s' }}>
        💰
      </div>
      <div className="absolute top-1/2 right-20 text-6xl animate-bounce" style={{ animationDelay: '1s' }}>
        🚀
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="text-center space-y-8">
          {/* Main heading */}
          <div>
            <h2 className="text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
              Ready to Transform Your Financial Future?
            </h2>
            <p className="text-2xl text-white/90 mb-2">
              Join thousands of Indians achieving their dreams with MONIFY
            </p>
          </div>

          {/* Feature checklist */}
          <div className="grid md:grid-cols-2 gap-6 mb-12 py-8">
            {[
              'Instant approval within 48 hours',
              '100% digital, paperless process',
              'Transparent and competitive rates',
              'No hidden charges or extra fees',
              'Bank-grade security & encryption',
              '24/7 customer support',
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3 text-white/95">
                <div className="w-8 h-8 bg-white/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check size={20} />
                </div>
                <span className="font-medium">{feature}</span>
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <div className="space-y-6">
            <button onClick={handleGetLoan} className="group px-10 py-5 bg-white text-green-600 rounded-xl font-bold text-xl hover:bg-green-50 transition-all duration-300 shadow-2xl hover:shadow-3xl hover:scale-110 transform active:scale-95 inline-flex items-center gap-3">
              <Zap size={24} />
              Get Your Loan in 48 Hours
              <span className="group-hover:translate-x-2 transition-transform duration-300">→</span>
            </button>
          </div>
        </div>

        {/* Animated border effect */}
        <div className="mt-16 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-2xl" />
          <div className="relative bg-white/10 backdrop-blur-lg border border-white/30 rounded-2xl p-8 hover:border-white/50 transition-colors duration-300">
            <div className="grid md:grid-cols-3 gap-8 text-center text-white">
              <div>
                <div className="text-4xl font-bold mb-2">50K+</div>
                <p className="text-white/80">Happy Customers</p>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">₹500Cr+</div>
                <p className="text-white/80">Loans Disbursed</p>
              </div>
              <div>
                <div className="text-4xl font-bold mb-2">4.8/5</div>
                <p className="text-white/80">Average Rating</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes drift {
          0% {
            transform: translate(0, 0);
          }
          50% {
            transform: translate(20px, -20px);
          }
          100% {
            transform: translate(0, 0);
          }
        }
      `}</style>
    </section>
  );
};

export default FinalCTASection;
