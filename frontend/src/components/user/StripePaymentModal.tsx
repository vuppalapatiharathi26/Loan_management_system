import { useMemo, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import type { StripeElementsOptions } from "@stripe/stripe-js";

type StripePaymentModalProps = {
  isOpen: boolean;
  clientSecret: string | null;
  title?: string;
  onClose: () => void;
  onSuccess: (paymentIntentId: string) => void;
};

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

const CheckoutForm = ({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (paymentIntentId: string) => void;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: "if_required",
    });

    if (error) {
      setMessage(error.message || "Payment failed");
      setProcessing(false);
      return;
    }

    if (paymentIntent?.status === "succeeded" || paymentIntent?.status === "processing") {
      setProcessing(false);
      if (paymentIntent?.id) {
        onSuccess(paymentIntent.id);
      } else {
        setMessage("Payment confirmed but missing intent id.");
      }
      return;
    }

    setMessage("Payment not completed. Please try again.");
    setProcessing(false);
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="space-y-4">
        <PaymentElement />
        {message && <div className="text-sm text-red-600">{message}</div>}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className="px-4 py-2 border rounded hover:bg-gray-50"
            onClick={onClose}
            disabled={processing}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
            disabled={processing || !stripe}
          >
            {processing ? (
              <span className="inline-flex items-center gap-2">
                <span className="inline-flex h-4 w-4 items-center justify-center">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                </span>
                Processing...
              </span>
            ) : (
              "Pay Now"
            )}
          </button>
        </div>
      </form>
      {processing && (
        <div className="absolute inset-0 z-10 rounded-lg bg-white/70 backdrop-blur-sm">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="relative h-14 w-14">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-100" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-emerald-600 border-r-emerald-500 animate-spin" />
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-emerald-50 to-white" />
              </div>
              <div className="text-sm font-medium text-gray-700">Finalizing payment...</div>
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: "0s" }} />
                <span className="h-2 w-2 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: "0.15s" }} />
                <span className="h-2 w-2 rounded-full bg-emerald-600 animate-bounce" style={{ animationDelay: "0.3s" }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StripePaymentModal = ({ isOpen, clientSecret, title, onClose, onSuccess }: StripePaymentModalProps) => {
  const [stripeError, setStripeError] = useState<string | null>(null);

  const options = useMemo<StripeElementsOptions | null>(() => {
    if (!clientSecret) return null;
    return { clientSecret };
  }, [clientSecret]);

  if (!isOpen) return null;

  if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
        <div className="w-full max-w-lg rounded-xl bg-white shadow-lg border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div className="text-lg font-semibold text-gray-900">Stripe Payment</div>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border rounded hover:bg-gray-50"
            >
              Close
            </button>
          </div>
          <div className="p-5 text-sm text-red-600">
            Missing Stripe publishable key. Set `VITE_STRIPE_PUBLISHABLE_KEY` in `frontend/.env`.
          </div>
        </div>
      </div>
    );
  }

  if (!clientSecret || !options) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
        <div className="w-full max-w-lg rounded-xl bg-white shadow-lg border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div className="text-lg font-semibold text-gray-900">Stripe Payment</div>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border rounded hover:bg-gray-50"
            >
              Close
            </button>
          </div>
          <div className="p-5 text-sm text-red-600">
            Payment could not be initialized. Please try again.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-lg border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="text-lg font-semibold text-gray-900">{title || "Stripe Payment"}</div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 border rounded hover:bg-gray-50"
          >
            Close
          </button>
        </div>
        <div className="p-5 space-y-3">
          {stripeError && <div className="text-sm text-red-600">{stripeError}</div>}
          <Elements
            stripe={stripePromise}
            options={options}
            onError={(e) => setStripeError(e.message || "Stripe error")}
          >
            <CheckoutForm onClose={onClose} onSuccess={onSuccess} />
          </Elements>
        </div>
      </div>
    </div>
  );
};

export default StripePaymentModal;
