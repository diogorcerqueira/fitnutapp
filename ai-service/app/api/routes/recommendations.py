from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pydantic import BaseModel
from typing import Optional
from app.config import settings
from app.infrastructure.database.database import SessionLocal
from app.infrastructure.repositories.recommendation_repository import get_user_recommendations
from app.infrastructure.repositories.user_snapshot_repository import get_user_snapshot, upsert_user_snapshot

router = APIRouter(prefix="/api/v1/ai", tags=["AI Recommendations"])
_bearer = HTTPBearer()


def _get_user_id(credentials: HTTPAuthorizationCredentials = Depends(_bearer)) -> str:
    try:
        payload = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.get(
    "/recommendations/{user_id}",
    summary="Listar recomendações IA do utilizador",
    response_description="Últimas 10 recomendações geradas pela IA",
    responses={
        200: {"description": "Lista de recomendações"},
        401: {"description": "Token inválido"},
        403: {"description": "Sem permissão para ver recomendações de outro utilizador"},
    },
)
def get_recommendations(user_id: str, requesting_user: str = Depends(_get_user_id)):
    if requesting_user != user_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    db = SessionLocal()
    try:
        recs = get_user_recommendations(db, user_id, limit=10)
        return {
            "user_id": user_id,
            "recommendations": [
                {
                    "id": r.event_id,
                    "recommendation": r.recommendation,
                    "focus_area": r.focus_area,
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                }
                for r in recs
            ],
        }
    finally:
        db.close()


class PreferencesUpdate(BaseModel):
    available_equipment: Optional[str] = None


@router.get(
    "/preferences",
    summary="Obter preferências de equipamento do utilizador",
    response_description="Equipamento disponível para o utilizador",
    responses={
        200: {"description": "Preferências actuais"},
        401: {"description": "Token inválido"},
    },
)
def get_preferences(requesting_user: str = Depends(_get_user_id)):
    db = SessionLocal()
    try:
        snapshot = get_user_snapshot(db, requesting_user)
        return {"available_equipment": snapshot.available_equipment if snapshot else None}
    finally:
        db.close()


@router.put(
    "/preferences",
    summary="Actualizar preferências de equipamento disponível",
    response_description="Preferências actualizadas",
    responses={
        200: {"description": "Preferências guardadas"},
        401: {"description": "Token inválido"},
    },
)
def update_preferences(body: PreferencesUpdate, requesting_user: str = Depends(_get_user_id)):
    db = SessionLocal()
    try:
        snapshot = get_user_snapshot(db, requesting_user)
        email = snapshot.email if snapshot else ""
        upsert_user_snapshot(db, user_id=requesting_user, email=email, available_equipment=body.available_equipment)
        return {"available_equipment": body.available_equipment}
    finally:
        db.close()
