from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
from app.infrastructure.database.models import UserSnapshot
from datetime import datetime, timezone


def upsert_user_snapshot(db: Session, user_id: str, email: str, **kwargs):
    update_fields = {"updated_at": datetime.now(timezone.utc), **kwargs}
    if email:
        update_fields["email"] = email

    stmt = insert(UserSnapshot).values(
        user_id=user_id,
        email=email,
        updated_at=datetime.now(timezone.utc),
        **kwargs,
    ).on_conflict_do_update(
        index_elements=["user_id"],
        set_=update_fields,
    )
    db.execute(stmt)
    db.commit()


def get_user_snapshot(db: Session, user_id: str) -> UserSnapshot | None:
    return db.query(UserSnapshot).filter(UserSnapshot.user_id == user_id).first()


def get_all_user_ids(db: Session) -> list[str]:
    return [row.user_id for row in db.query(UserSnapshot.user_id).all()]
