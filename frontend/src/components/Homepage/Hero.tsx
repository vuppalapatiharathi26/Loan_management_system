// All icon imports are used in the Key Features and Why Choose sections below
// If these sections are removed in future refactoring, this import can be removed
import EnhancedHero from "./EnhancedHero";
import StatsSection from "./StatsSection";
import CircularFeaturesGallery from "./CircularFeatures";
import LoanProcessFlow from "./LoanProcessFlow";
import TestimonialsSection from "./TestimonialsSection";
import FAQSection from "./FAQSection";
import FinalCTASection from "./FinalCTASection";

const Hero = () => {

  return (
    <>
      {/* Enhanced Hero with animations */}
      <EnhancedHero />

      {/* Stats Section with count-up animations */}
      <StatsSection />

      {/* Circular Features Gallery */}
      <CircularFeaturesGallery />

      {/* Loan Process Flow */}
      <LoanProcessFlow />

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* FAQ Section */}
      <FAQSection />

      {/* Final CTA Section */}
      <FinalCTASection />

      </>
  );
};

export default Hero;
