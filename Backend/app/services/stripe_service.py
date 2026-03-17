import stripe

from app.core.config import settings


class StripeService:
    def __init__(self):
        if not settings.STRIPE_SECRET_KEY:
            raise ValueError("Stripe secret key is not configured")
        stripe.api_key = settings.STRIPE_SECRET_KEY
        if settings.STRIPE_API_VERSION:
            stripe.api_version = settings.STRIPE_API_VERSION

    def create_payment_intent(self, *, amount: float, currency: str, metadata: dict, idempotency_key: str):
        amount_in_cents = int(round(float(amount) * 100))
        return stripe.PaymentIntent.create(
            amount=amount_in_cents,
            currency=currency,
            metadata=metadata,
            automatic_payment_methods={"enabled": True},
            idempotency_key=idempotency_key
        )

    def construct_event(self, *, payload: bytes, sig_header: str):
        if not settings.STRIPE_WEBHOOK_SECRET:
            raise ValueError("Stripe webhook secret is not configured")
        return stripe.Webhook.construct_event(
            payload=payload,
            sig_header=sig_header,
            secret=settings.STRIPE_WEBHOOK_SECRET
        )

    def retrieve_payment_intent(self, intent_id: str):
        return stripe.PaymentIntent.retrieve(intent_id)
