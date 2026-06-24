from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    rabbitmq_url: str
    openrouter_api_key: str
    llm_model: str = "openai/gpt-oss-20b:free"
    jwt_secret: str
    port: int = 3004

    class Config:
        env_file = ".env"


settings = Settings()
