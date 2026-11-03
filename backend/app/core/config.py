from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    TWILIO_ACCOUNT_SID: str
    TWILIO_AUTH_TOKEN: str
    TWILIO_WHATSAPP_NUMBER: str

    # Optional: distributor's own details, used in alerts / payment reminders
    OWNER_PHONE: str = ""      # e.g. whatsapp:+919876543210
    UPI_ID: str = ""           # e.g. mystore@okhdfcbank
    BUSINESS_NAME: str = "Our Distributor"

    class Config:
        env_file = ".env"


settings = Settings()
