import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FAQItem {
  id: number;
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    id: 1,
    question: 'How long does the loan approval process take?',
    answer:
      'Most loans are approved within 24-48 hours. After you complete your KYC verification and submit your application, our team reviews it and provides a decision. Some pre-approved customers get approvals in as little as 30 minutes!',
  },
  {
    id: 2,
    question: 'What documents do I need to apply?',
    answer:
      'You need a valid government-issued ID (Aadhaar/PAN), recent bank statements, and proof of income. All documents are uploaded digitally - no physical paperwork required!',
  },
  {
    id: 3,
    question: 'Can I track my loan application status?',
    answer:
      'Yes! You can track your application status 24/7 through our mobile app and website. We send real-time notifications for every status update.',
  },
  {
    id: 4,
    question: 'What is your interest rate?',
    answer:
      'Our interest rates are competitive and depend on your credit score, loan amount, and tenure. You can use our EMI calculator to get an instant estimate without any obligation.',
  },
  {
    id: 5,
    question: 'Is my personal information safe?',
    answer:
      'Absolutely! We use bank-grade encryption and comply with all data protection regulations. Your information is never shared with third parties without your consent.',
  },
  {
    id: 6,
    question: 'Can I prepay my loan early?',
    answer:
      'Yes, you can prepay your loan anytime without any penalties. We encourage financial flexibility and don\'t charge extra for early repayment.',
  },
];

const FAQSection = () => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggleFAQ = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-gray-600">
            Find answers to common questions about our lending process
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq) => (
            <div
              key={faq.id}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-300"
            >
              <button
                onClick={() => toggleFAQ(faq.id)}
                className="w-full px-6 py-5 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white hover:from-green-50 hover:to-emerald-50 transition-colors duration-300"
              >
                <h3 className="text-lg font-semibold text-gray-900 text-left">
                  {faq.question}
                </h3>
                <ChevronDown
                  className={`flex-shrink-0 w-5 h-5 text-green-600 transition-transform duration-300 ${
                    expandedId === faq.id ? 'transform rotate-180' : ''
                  }`}
                />
              </button>

              {/* Expandable content */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  expandedId === faq.id ? 'max-h-96' : 'max-h-0'
                }`}
              >
                <div className="px-6 py-4 bg-gradient-to-b from-green-50/50 to-transparent border-t border-gray-200">
                  <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA below FAQ */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-4">
            Didn't find your answer? Contact our support team.
          </p>
          <button className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors duration-300">
            Contact Support
          </button>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
