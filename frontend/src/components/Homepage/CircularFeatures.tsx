import { useState, useEffect } from 'react';
import { Zap, Shield, Clock, TrendingUp, ChevronDown } from 'lucide-react';

interface Feature {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  emoji: string;
  color: string;
}

const features: Feature[] = [
  {
    id: 0,
    title: 'Lightning Fast',
    description: 'Get loan approvals in minutes, not days. Our automated system processes applications instantly.',
    icon: <Zap size={32} />,
    emoji: '⚡',
    color: 'from-yellow-400 to-orange-500',
  },
  {
    id: 1,
    title: 'Bank-Grade Security',
    description: 'Your data is protected with military-grade encryption and compliance with all banking standards.',
    icon: <Shield size={32} />,
    emoji: '🔐',
    color: 'from-blue-400 to-cyan-500',
  },
  {
    id: 2,
    title: '24/7 Tracking',
    description: 'Monitor your loan status anytime, anywhere with real-time updates and notifications.',
    icon: <Clock size={32} />,
    emoji: '⏰',
    color: 'from-purple-400 to-pink-500',
  },
  {
    id: 3,
    title: 'Smart Decisions',
    description: 'AI-powered credit evaluation ensures fair and transparent loan decisions for everyone.',
    icon: <TrendingUp size={32} />,
    emoji: '📈',
    color: 'from-green-400 to-emerald-500',
  },
];

const CircularFeaturesGallery = () => {
  const [activeFeature, setActiveFeature] = useState(0);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
      setRotation((prev) => (prev + 90) % 360);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const handleFeatureClick = (id: number) => {
    setActiveFeature(id);
    setRotation(id * 90);
  };

  const currentFeature = features[activeFeature];

  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Why Our Platform Stands Out
          </h2>
          <p className="text-xl text-gray-600">
            Experience the perfect blend of speed, security, and simplicity
          </p>
        </div>

        <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
          {/* Circular Gallery */}
          <div className="flex-1 flex items-center justify-center">
            <div className="relative w-80 h-80">
              {/* Center circle with active content */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="absolute inset-12 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 shadow-2xl flex flex-col items-center justify-center p-8 text-center border-4 border-white">
                  <div className="text-6xl mb-4">{currentFeature.emoji}</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {currentFeature.title}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {currentFeature.description}
                  </p>
                </div>
              </div>

              {/* Orbital circles */}
              <div
                className="absolute inset-0 transition-transform duration-1000"
                style={{ transform: `rotate(${rotation}deg)` }}
              >
                {features.map((feature, index) => {
                  const angle = (index * 360) / features.length;
                  const radius = 140;
                  const x = Math.cos((angle * Math.PI) / 180) * radius;
                  const y = Math.sin((angle * Math.PI) / 180) * radius;

                  return (
                    <button
                      key={feature.id}
                      onClick={() => handleFeatureClick(feature.id)}
                      className="absolute w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg hover:scale-110 transition-transform duration-300 cursor-pointer border-4 border-white"
                      style={{
                        left: `calc(50% + ${x}px - 40px)`,
                        top: `calc(50% + ${y}px - 40px)`,
                        background: `linear-gradient(135deg, var(--tw-gradient-stops))`,
                        '--tw-gradient-from': feature.color.split(' ')[1],
                        '--tw-gradient-to': feature.color.split(' ')[3],
                      } as React.CSSProperties}
                      title={feature.title}
                    >
                      {feature.emoji}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Indicator dots */}
            {/* <div className="">
              {features.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleFeatureClick(index)}
                  className={`h-3 rounded-full transition-all duration-300 ${
                    index === activeFeature
                      ? 'bg-green-600 w-8'
                      : 'bg-gray-300 w-3 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div> */}
          </div>

          {/* Details Panel */}
          <div className="flex-1">
            <div className="space-y-6">
              {features.map((feature) => (
                <button
                  key={feature.id}
                  onClick={() => handleFeatureClick(feature.id)}
                  className={`w-full text-left p-6 rounded-xl transition-all duration-300 transform hover:scale-105 ${
                    activeFeature === feature.id
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg scale-105'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">{feature.emoji}</div>
                    <div className="flex-1">
                      <h4 className="text-xl font-bold mb-2">{feature.title}</h4>
                      <p className={`text-sm ${activeFeature === feature.id ? 'text-green-100' : 'text-gray-600'}`}>
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="flex justify-center mt-12">
          <div className="animate-bounce">
            <ChevronDown className="text-green-600" size={32} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default CircularFeaturesGallery;
