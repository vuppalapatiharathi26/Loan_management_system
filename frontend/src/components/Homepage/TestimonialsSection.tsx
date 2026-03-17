import { useState, useEffect } from 'react';
import { Quote, Star } from 'lucide-react';

interface Testimonial {
  id: number;
  name: string;
  role: string;
  avatar: string;
  quote: string;
  rating: number;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: 'Rajesh Kumar',
    role: 'Small Business Owner',
    avatar: '👨‍💼',
    quote: 'MONIFY made the loan process incredibly simple. I got approval in 2 days!',
    rating: 5,
  },
  {
    id: 2,
    name: 'Priya Singh',
    role: 'Entrepreneur',
    avatar: '👩‍💼',
    quote: 'The transparency and speed are unmatched. Highly recommended!',
    rating: 5,
  },
  {
    id: 3,
    name: 'Amit Patel',
    role: 'Freelancer',
    avatar: '👨‍🎓',
    quote: 'Best digital lending platform. The customer support is excellent too.',
    rating: 5,
  },
];

const TestimonialsSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  useEffect(() => {
    if (!isAutoPlay) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlay]);

  return (
    <section className="py-24 px-6 bg-gradient-to-br from-green-50 to-emerald-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            What Our Users Say
          </h2>
          <p className="text-xl text-gray-600">
            Join thousands of satisfied customers who've achieved their dreams
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.id}
              onMouseEnter={() => {
                setActiveIndex(index);
                setIsAutoPlay(false);
              }}
              onMouseLeave={() => setIsAutoPlay(true)}
              className={`relative rounded-2xl overflow-hidden transition-all duration-500 transform cursor-pointer ${
                activeIndex === index
                  ? 'scale-105 shadow-2xl ring-2 ring-green-500'
                  : 'shadow-lg hover:shadow-xl hover:scale-102'
              }`}
            >
              {/* Animated gradient background */}
              <div
                className={`absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-600 ${
                  activeIndex === index ? 'opacity-100' : 'opacity-80'
                } transition-opacity duration-300`}
              />

              {/* Decorative blob */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-3xl transform translate-x-8 -translate-y-8 animate-pulse" />

              {/* Content */}
              <div className="relative z-10 p-8 flex flex-col h-full text-white">
                {/* Quote mark */}
                <Quote className="w-8 h-8 mb-4 opacity-80" />

                {/* Avatar */}
                <div className="text-6xl mb-4">{testimonial.avatar}</div>

                {/* Quote */}
                <p className="text-lg font-semibold mb-6 flex-1">
                  "{testimonial.quote}"
                </p>

                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} size={20} fill="white" className="text-white" />
                  ))}
                </div>

                {/* Name and role */}
                <div>
                  <p className="font-bold text-lg">{testimonial.name}</p>
                  <p className="text-green-100 text-sm">{testimonial.role}</p>
                </div>
              </div>

              {/* Animated border on active */}
              {activeIndex === index && (
                <div className="absolute inset-0 border-2 border-white rounded-2xl animate-pulse" />
              )}
            </div>
          ))}
        </div>

        {/* Navigation dots */}
        <div className="flex justify-center gap-3">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setActiveIndex(index);
                setIsAutoPlay(false);
              }}
              className={`h-3 rounded-full transition-all duration-300 ${
                index === activeIndex
                  ? 'bg-green-600 w-8'
                  : 'bg-gray-300 w-3 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
