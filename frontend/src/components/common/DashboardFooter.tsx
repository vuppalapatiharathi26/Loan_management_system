const DashboardFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full mt-auto bg-green-700/90 backdrop-blur-md text-white border-t border-green-800/60">
      
      {/* Centered Container (Same as Page Content) */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-4">
        
        {/* Privacy / Terms */}
        <div className="flex justify-center items-center gap-8 text-sm font-medium">
          <a
            href="#"
            className="hover:text-green-300 transition-colors duration-200"
          >
            Privacy Policy
          </a>

          <span className="text-green-300">|</span>

          <a
            href="#"
            className="hover:text-green-300 transition-colors duration-200"
          >
            Terms of Service
          </a>
        </div>

        {/* Divider aligned with page */}
        <div className="border-t border-green-800/70 my-3" />

        {/* Copyright */}
        <div className="text-center text-xs text-green-200">
          © {currentYear} Monify. All rights reserved.
        </div>

      </div>
    </footer>
  );
};

export default DashboardFooter;
