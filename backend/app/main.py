from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .routes import default, api_v1

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.API_TITLE,
        version=settings.API_VERSION,
        docs_url=settings.DOCS_URL,
        redoc_url=settings.REDOC_URL
    )

    app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://d13epwpym70inf.cloudfront.net",
        "http://localhost:5173"                               
    ],
    allow_credentials=True,
    allow_methods=["*"],  # or ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers=["*"],
)

    # include routers
    app.include_router(default.router)
    app.include_router(api_v1.router)

    return app


app = create_app()


def get_settings():
    return settings