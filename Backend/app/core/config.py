from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "loan_management"
    IDEMPOTENCY_WINDOW_HOURS: int = 48
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_CURRENCY: str = "inr"
    STRIPE_API_VERSION: str = "2023-10-16"

    class Config:
        env_file = ".env"

settings = Settings()
