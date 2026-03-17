import { Facebook, Twitter, Linkedin, Mail, Phone, MapPin, Zap, Shield, TrendingUp, Award } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerSections = {
    product: {
      title: 'Loan Products',
      links: [
        { name: 'Personal Loans', href: '#' },
        { name: 'Business Loans', href: '#' },
        { name: 'Emergency Loans', href: '#' },
        { name: 'Loan Calculator', href: '#' },
      ],
    },
    resources: {
      title: 'Resources',
      links: [
        { name: 'Loan Guidelines', href: '#' },
        { name: 'KYC Documentation', href: '#' },
        { name: 'FAQ', href: '#' },
        { name: 'Blog', href: '#' },
      ],
    },
    company: {
      title: 'Company',
      links: [
        { name: 'About Us', href: '#' },
        { name: 'Careers', href: '#' },
        { name: 'Privacy Policy', href: '#' },
        { name: 'Terms & Conditions', href: '#' },
      ],
    },
    support: {
      title: 'Support',
      links: [
        { name: 'Contact Us', href: '#' },
        { name: 'Customer Service', href: '#' },
        { name: 'Report Issues', href: '#' },
        { name: 'Feedback', href: '#' },
      ],
    },
  };

  const features = [
    { icon: Zap, label: 'Instant Approval', description: 'Get approved in 48 hours' },
    { icon: Shield, label: 'Secure & Safe', description: 'Bank-grade encryption' },
    { icon: TrendingUp, label: 'Best Rates', description: 'Competitive interest rates' },
    { icon: Award, label: 'Trusted', description: '50K+ happy customers' },
  ];

  const contactInfo = [
    { icon: Phone, text: '+91-1800-MONIFY-1' },
    { icon: Mail, text: 'support@monify.in' },
    { icon: MapPin, text: 'Mumbai, India' },
  ];

  return (
    <footer className="w-full bg-gradient-to-b from-gray-900 via-green-900 to-gray-900 text-white">
      {/* Top Section - Features */}
      <div className="bg-green-800/40 backdrop-blur border-y border-green-700/50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div key={idx} className="flex items-center gap-4 hover:bg-green-700/20 p-4 rounded-lg transition-colors duration-300">
                  <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="text-green-400" size={24} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-300">{feature.label}</h4>
                    <p className="text-sm text-gray-300">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-5 gap-12 mb-12">
          {/* Brand Section */}
          <div className="md:col-span-1">
            <div className="mb-6">
              <h3 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent">
                MONIFY
              </h3>
              <p className="text-gray-400 mt-2 text-sm">
                Intelligent Loan Management System for Everyone
              </p>
            </div>
            <div className="space-y-3">
              {contactInfo.map((info, idx) => {
                const Icon = info.icon;
                return (
                  <div key={idx} className="flex items-center gap-3 text-sm text-gray-300 hover:text-green-400 transition-colors duration-300">
                    <Icon size={18} className="flex-shrink-0" />
                    <span>{info.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Links Sections */}
          {Object.values(footerSections).map((section, idx) => (
            <div key={idx}>
              <h4 className="text-lg font-semibold text-green-400 mb-6 border-b border-green-700/50 pb-3">
                {section.title}
              </h4>
              <ul className="space-y-3">
                {section.links.map((link, linkIdx) => (
                  <li key={linkIdx}>
                    <a
                      href={link.href}
                      className="text-gray-300 hover:text-green-400 transition-colors duration-300 text-sm flex items-center gap-2 group"
                    >
                      <span className="w-1.5 h-1.5 bg-green-600 rounded-full group-hover:bg-green-400 transition-colors duration-300" />
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-green-700/30 pt-8">
          {/* Bottom Section */}
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Left - Copyright & Legal */}
            <div className="space-y-3">
              <p className="text-gray-400 text-sm">
                © {currentYear} MONIFY - Intelligent Loan Management System. All Rights Reserved.
              </p>
              <p className="text-gray-500 text-xs">
                MONIFY is registered under RBI's Digital Banking Framework. We comply with all financial regulations and data protection laws.
              </p>
            </div>

            {/* Right - Social Links */}
            <div className="flex justify-start md:justify-end gap-6">
              <h4 className="text-sm font-semibold text-green-400 hidden sm:block">Follow Us:</h4>
              <div className="flex gap-4">
                {[
                  { icon: Facebook, label: 'Facebook', href: '#' },
                  { icon: Twitter, label: 'Twitter', href: '#' },
                  { icon: Linkedin, label: 'LinkedIn', href: '#' },
                ].map((social, idx) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={idx}
                      href={social.href}
                      aria-label={social.label}
                      className="w-10 h-10 bg-green-600/20 hover:bg-green-600/40 rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 border border-green-600/30 hover:border-green-400"
                    >
                      <Icon size={20} className="text-green-400 hover:text-green-300" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Trust Badge */}
          <div className="mt-8 p-4 bg-green-600/10 border border-green-600/20 rounded-lg">
            <p className="text-center text-gray-300 text-xs">
              🔒 Your financial data is protected with AES-256 encryption. We are compliant with GDPR, ISO 27001, and RBI guidelines.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
