import { useEffect, useRef, useState } from 'react';
import { Users, Banknote, TrendingUp, Star } from 'lucide-react';

interface StatProps {
  value: number;
  label: string;
  icon: React.ReactNode;
  suffix?: string;
}

const StatCounter: React.FC<StatProps> = ({ value, label, icon, suffix = '' }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
      }
    }, { threshold: 0.1 });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 2000;
    const increment = value / (duration / 16);
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [isVisible, value]);

  return (
    <div
      ref={ref}
      className="bg-white rounded-xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 text-center border border-gray-100 animate-fadeIn"
    >
      <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-4 hover:rotate-6 transition-transform duration-300">
        {icon}
      </div>
      <div className="text-4xl font-bold text-green-600 mb-2">
        {count}
        {suffix}
      </div>
      <p className="text-gray-600 font-medium">{label}</p>
    </div>
  );
};

const StatsSection = () => {
  return (
    <section className="py-20 px-6 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto">
        <div
          className="text-center mb-16 animate-slideDown"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Trusted by Thousands
          </h2>
          <p className="text-xl text-gray-600">
            Our platform has helped thousands achieve their financial goals
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          <StatCounter
            value={50000}
            label="Happy Users"
            icon={<Users className="text-green-600" size={32} />}
            suffix="+"
          />
          <StatCounter
            value={25000}
            label="Loans Disbursed"
            icon={<Banknote className="text-green-600" size={32} />}
            suffix="+"
          />
          <StatCounter
            value={500}
            label="Crore Disbursed"
            icon={<TrendingUp className="text-green-600" size={32} />}
            suffix="+"
          />
          <StatCounter
            value={4.8}
            label="Average Rating"
            icon={<Star className="text-green-600" size={32} />}
            suffix="/5"
          />
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
