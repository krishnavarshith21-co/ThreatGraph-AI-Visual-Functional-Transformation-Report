"""ThreatGraph AI — FastAPI Backend Application."""

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Load environment configuration (backend/.env takes precedence over root .env)
_backend_env = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
_root_env = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
if os.path.exists(_root_env):
    load_dotenv(_root_env)
if os.path.exists(_backend_env):
    load_dotenv(_backend_env, override=True)

from app.services.graph_service import graph_service
from app.routers import health, alerts, investigations, graph, reports


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle: connect to services on startup, cleanup on shutdown."""
    try:
        graph_service.connect()
        print("✓ FalkorDB connected")
    except Exception as e:
        print(f"✗ FalkorDB connection failed: {e}")
    yield
    print("Shutting down ThreatGraph AI backend")


app = FastAPI(
    title="ThreatGraph AI",
    description="Graph-powered cybersecurity investigation API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
frontend_origins_raw = os.getenv("FRONTEND_ORIGINS", "http://localhost:5173,http://localhost:3000")
if frontend_origins_raw.strip() == "*":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    frontend_origins = [o.strip() for o in frontend_origins_raw.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=frontend_origins,
        allow_origin_regex=r"https://.*\.vercel\.app",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Routers
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(alerts.router, prefix="/api", tags=["Alerts"])
app.include_router(investigations.router, prefix="/api", tags=["Investigations"])
app.include_router(graph.router, prefix="/api", tags=["Graph"])
app.include_router(reports.router, prefix="/api", tags=["Reports"])
