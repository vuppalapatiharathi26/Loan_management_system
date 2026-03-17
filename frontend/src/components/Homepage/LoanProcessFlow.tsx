import { ArrowRight, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProcessStep {
  number: number;
  title: string;
  description: string;
  icon: string;
  duration: string;
}

const steps: ProcessStep[] = [
  {
    number: 1,
    title: 'Check CIBIL',
    description: 'Check score and eligibility from homepage',
    icon: '📝',
    duration: '2 min',
  },
  {
    number: 2,
    title: 'Create Account',
    description: 'Register and verify your email',
    icon: '✅',
    duration: '5 min',
  },
  {
    number: 3,
    title: 'Complete KYC',
    description: 'Submit identity and address documents',
    icon: '👤',
    duration: '10 - 12 hrs',
  },
  {
    number: 4,
    title: 'Apply for Loan',
    description: 'Submit application and receive disbursal',
    icon: '💰',
    duration: '1 day',
  },
];

const LoanProcessFlow = () => {
  const navigate = useNavigate();

  const handleStartJourney = () => {
    navigate('/register');
  };

  return (
    <section className="relative py-24 px-6 overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-emerald-500 to-purple-600 opacity-90" />

      {/* Decorative animated elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-20">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-4">
            Simple 4-Step Process
          </h2>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Get approved for your loan in just 48 hours with our streamlined process
          </p>
        </div>

        {/* Process steps */}
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Arrow between steps */}
              {index < steps.length - 1 && (
                <div className="hidden md:flex absolute top-32 -right-4 items-center justify-center">
                  <ArrowRight className="text-white/40 w-8 h-8 animate-pulse" />
                </div>
              )}

              {/* Step card */}
              <div className="bg-white/10 backdrop-blur-md border border-white/30 rounded-2xl p-8 hover:bg-white/20 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 group cursor-pointer">
                {/* Step number with animation */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-white to-blue-100 rounded-full flex items-center justify-center font-bold text-2xl text-blue-600 group-hover:scale-110 transition-transform duration-300">
                    {step.number}
                  </div>
                  {step.number < steps.length && (
                    <div className="w-1 h-1 bg-white/40 rounded-full" />
                  )}
                </div>

                {/* Icon */}
                <div className="text-6xl mb-4 text-center group-hover:scale-125 transition-transform duration-300">
                  {step.icon}
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-white mb-3 text-center">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-white/80 text-center mb-4">
                  {step.description}
                </p>

                {/* Duration badge */}
                <div className="flex items-center justify-center gap-2 bg-white/10 rounded-full px-4 py-2 w-fit mx-auto">
                  <span className="text-white/70 text-sm">⏱️ {step.duration}</span>
                </div>

                {/* Hover effect line */}
                <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-white to-transparent w-0 group-hover:w-full transition-all duration-500 rounded-b-2xl" />
              </div>
            </div>
          ))}
        </div>

        {/* Mobile steps (vertical) */}
        <div className="md:hidden space-y-6">
          {steps.map((step, index) => (
            <div key={step.number} className="flex gap-6">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center font-bold text-2xl text-blue-600 mb-4">
                  {step.number}
                </div>
                {index < steps.length - 1 && (
                  <div className="w-1 h-20 bg-white/30" />
                )}
              </div>
              <div className="flex-1 pt-2">
                <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                <p className="text-white/80 mb-3">{step.description}</p>
                <span className="text-sm text-white/60">⏱️ {step.duration}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-20 flex flex-col sm:flex-row items-center justify-center gap-6">
          <button onClick={handleStartJourney} className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-semibold text-lg transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 transform active:scale-95">
            Start Your Journey
          </button>
          <div className="flex items-center gap-3 text-white/80">
            <CheckCircle size={20} />
            <span>No credit card required</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LoanProcessFlow;
