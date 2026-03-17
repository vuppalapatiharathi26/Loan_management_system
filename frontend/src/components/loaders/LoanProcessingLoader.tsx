import { CheckCircle2, Circle } from "lucide-react";

interface Step {
  id: number;
  label: string;
}

interface LoanProcessingLoaderProps {
  currentStep: number;
  steps?: Step[];
  isComplete?: boolean;
}

/**
 * LoanProcessingLoader Component
 * 
 * Step-based loader for loan application processing
 * - Shows current step with spinner
 * - Displays completed steps with checkmark
 * - Pending steps shown as empty circles
 * - Modern fintech-style UI
 * 
 * @example
 * <LoanProcessingLoader 
 *   currentStep={2}
 *   steps={[
 *     { id: 1, label: "Submitting Application" },
 *     { id: 2, label: "Verifying Eligibility" },
 *     { id: 3, label: "Calculating EMI" }
 *   ]}
 * />
 */
const LoanProcessingLoader = ({
  currentStep,
  steps = [
    { id: 1, label: "Submitting Application" },
    { id: 2, label: "Verifying Eligibility" },
    { id: 3, label: "Calculating EMI" },
  ],
  isComplete = false,
}: LoanProcessingLoaderProps) => {
  return (
    <div className="w-full flex flex-col items-center justify-center py-12">
      {/* Step Container */}
      <div className="w-full max-w-md space-y-6">
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = step.id < currentStep;

          return (
            <div key={step.id}>
              {/* Step Row */}
              <div className="flex items-center gap-4">
                {/* Step Icon */}
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCompleted
                      ? "bg-green-100"
                      : isActive
                      ? "bg-blue-100"
                      : "bg-gray-100"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  ) : isActive ? (
                    <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Circle className="h-6 w-6 text-gray-400" />
                  )}
                </div>

                {/* Step Label */}
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium transition-colors ${
                      isCompleted
                        ? "text-green-600"
                        : isActive
                        ? "text-blue-600"
                        : "text-gray-400"
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
              </div>

              {/* Connector Line (between steps) */}
              {index < steps.length - 1 && (
                <div className="ml-5 h-6 flex items-center">
                  <div
                    className={`w-0.5 h-full transition-colors duration-500 ${
                      isCompleted ? "bg-green-400" : "bg-gray-200"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Completion Message */}
      {isComplete && (
        <div className="mt-8 text-center animate-fade-in">
          <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
          <p className="text-lg font-semibold text-gray-900">
            Loan Application Processing Complete
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Your application is being reviewed by our team.
          </p>
        </div>
      )}
    </div>
  );
};

export default LoanProcessingLoader;
