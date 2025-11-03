from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


from api.v1.routes import api_router
from core.config import get_settings
from core.error_handlers import register_error_handlers
from core.logging import init_logger
from middleware.request_id import RequestIDMiddleware

settings = get_settings()
init_logger()


app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

register_error_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestIDMiddleware)
app.include_router(api_router, prefix="/api/v1")

