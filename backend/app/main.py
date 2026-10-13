from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import leads
from app.core.config import get_settings
from app.core.handlers import register_handlers

app = FastAPI(title="LeadFlow API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().backend_cors_origins,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Content-Type"],
)
register_handlers(app)
app.include_router(leads.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
