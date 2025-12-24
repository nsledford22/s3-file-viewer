from fastapi import APIRouter
from ..schemas import HealthSchema, ErrorSchema

router = APIRouter()


@router.get("/", response_model=dict)
def index():
    return {"status": "ok", "message": "Welcome to the API"}


@router.get("/health", response_model=HealthSchema)
def health():
    return {"status": "healthy"}


@router.get("/not-found-example", response_model=ErrorSchema, status_code=404)
def not_found_example():
    return {"error": "not found"}
