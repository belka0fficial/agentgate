from __future__ import annotations

import json
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterator


def now() -> str:
    return datetime.now(UTC).isoformat()


class Database:
    def __init__(self, data_dir: Path):
        self.path = data_dir / "agentgate.db"
        data_dir.mkdir(parents=True, exist_ok=True)

    @contextmanager
    def connection(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self.path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def initialize(self) -> None:
        with self.connection() as conn:
            conn.execute("PRAGMA journal_mode=WAL")
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS suggestions (
                    id TEXT PRIMARY KEY, title TEXT NOT NULL, summary TEXT NOT NULL,
                    category TEXT NOT NULL, confidence TEXT NOT NULL, urgency TEXT NOT NULL,
                    status TEXT NOT NULL, evidence_json TEXT NOT NULL, source TEXT NOT NULL,
                    source_ref TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
                );
                CREATE UNIQUE INDEX IF NOT EXISTS suggestions_source_ref
                ON suggestions(source, source_ref) WHERE source_ref IS NOT NULL;
                CREATE TABLE IF NOT EXISTS apps (
                    id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL,
                    url TEXT NOT NULL, health_url TEXT, status TEXT NOT NULL,
                    source TEXT NOT NULL, source_ref TEXT, pinned INTEGER NOT NULL DEFAULT 0,
                    position INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
                );
                CREATE UNIQUE INDEX IF NOT EXISTS apps_source_ref
                ON apps(source, source_ref) WHERE source_ref IS NOT NULL;
                CREATE TABLE IF NOT EXISTS character_profile (
                    id TEXT PRIMARY KEY, name TEXT NOT NULL, owner_name TEXT NOT NULL,
                    personality TEXT NOT NULL, background TEXT NOT NULL, speaking_style TEXT NOT NULL,
                    boundaries TEXT NOT NULL, avatar_url TEXT, updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS owner_config (
                    id TEXT PRIMARY KEY, verifier TEXT NOT NULL, updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS verification_refs (
                    id TEXT PRIMARY KEY, source TEXT NOT NULL, source_id TEXT NOT NULL,
                    run_id TEXT, session_id TEXT, status TEXT NOT NULL, summary_json TEXT NOT NULL,
                    expires_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
                );
            """)
            existing_columns = {row[1] for row in conn.execute("PRAGMA table_info(character_profile)").fetchall()}
            character_profile_migrations = {
                "mode": "ALTER TABLE character_profile ADD COLUMN mode TEXT NOT NULL DEFAULT ''",
                "primary_model": "ALTER TABLE character_profile ADD COLUMN primary_model TEXT NOT NULL DEFAULT ''",
                "fallback_model": "ALTER TABLE character_profile ADD COLUMN fallback_model TEXT NOT NULL DEFAULT ''",
                "allowed_tools": "ALTER TABLE character_profile ADD COLUMN allowed_tools TEXT NOT NULL DEFAULT ''",
                "allowed_skills": "ALTER TABLE character_profile ADD COLUMN allowed_skills TEXT NOT NULL DEFAULT ''",
                "avatar_label": "ALTER TABLE character_profile ADD COLUMN avatar_label TEXT NOT NULL DEFAULT ''",
                "emotion_pack": "ALTER TABLE character_profile ADD COLUMN emotion_pack TEXT NOT NULL DEFAULT ''",
            }
            for name, statement in character_profile_migrations.items():
                if name not in existing_columns:
                    conn.execute(statement)

    def rows(self, query: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
        with self.connection() as conn:
            return [dict(row) for row in conn.execute(query, params).fetchall()]

    def row(self, query: str, params: tuple[Any, ...] = ()) -> dict[str, Any] | None:
        with self.connection() as conn:
            row = conn.execute(query, params).fetchone()
            return dict(row) if row else None

    def execute(self, query: str, params: tuple[Any, ...] = ()) -> None:
        with self.connection() as conn:
            conn.execute(query, params)

    def create_suggestion(self, payload: dict[str, Any]) -> dict[str, Any]:
        source_ref = payload.get("source_ref") or None
        if source_ref:
            existing = self.row("SELECT * FROM suggestions WHERE source = ? AND source_ref = ?", (payload["source"], source_ref))
            if existing:
                return self.decode(existing)
        item = {
            "id": str(uuid.uuid4()), "title": payload["title"], "summary": payload["summary"],
            "category": payload.get("category", "general"), "confidence": payload.get("confidence", "medium"),
            "urgency": payload.get("urgency", "normal"), "status": payload.get("status", "new"),
            "evidence_json": json.dumps(payload.get("evidence", [])), "source": payload.get("source", "manual"),
            "source_ref": source_ref, "created_at": now(), "updated_at": now(),
        }
        self.execute("""INSERT INTO suggestions VALUES (:id,:title,:summary,:category,:confidence,:urgency,:status,:evidence_json,:source,:source_ref,:created_at,:updated_at)""", item)
        return self.decode(item)

    def create_app(self, payload: dict[str, Any]) -> dict[str, Any]:
        source_ref = payload.get("source_ref") or None
        if source_ref:
            existing = self.row("SELECT * FROM apps WHERE source = ? AND source_ref = ?", (payload["source"], source_ref))
            if existing:
                return existing
        item = {
            "id": str(uuid.uuid4()), "name": payload["name"], "description": payload.get("description", ""),
            "url": payload["url"], "health_url": payload.get("health_url") or None, "status": payload.get("status", "available"),
            "source": payload.get("source", "manual"), "source_ref": source_ref, "pinned": int(bool(payload.get("pinned", False))),
            "position": int(payload.get("position", 0)), "created_at": now(), "updated_at": now(),
        }
        self.execute("""INSERT INTO apps VALUES (:id,:name,:description,:url,:health_url,:status,:source,:source_ref,:pinned,:position,:created_at,:updated_at)""", item)
        return item

    def upsert_verification(self, payload: dict[str, Any]) -> dict[str, Any]:
        existing = self.row("SELECT * FROM verification_refs WHERE source = ? AND source_id = ?", (payload["source"], payload["source_id"]))
        item = {
            "id": existing["id"] if existing else str(uuid.uuid4()),
            "source": payload["source"], "source_id": payload["source_id"],
            "run_id": payload.get("run_id"), "session_id": payload.get("session_id"),
            "status": payload.get("status", "pending"), "summary_json": json.dumps(payload.get("summary", {})),
            "expires_at": payload.get("expires_at"), "created_at": existing["created_at"] if existing else now(), "updated_at": now(),
        }
        self.execute("""INSERT INTO verification_refs VALUES (:id,:source,:source_id,:run_id,:session_id,:status,:summary_json,:expires_at,:created_at,:updated_at)
            ON CONFLICT(id) DO UPDATE SET run_id=:run_id,session_id=:session_id,status=:status,summary_json=:summary_json,expires_at=:expires_at,updated_at=:updated_at""", item)
        return self.decode(item)

    @staticmethod
    def decode(item: dict[str, Any]) -> dict[str, Any]:
        if "evidence_json" in item:
            item["evidence"] = json.loads(item.pop("evidence_json") or "[]")
        if "summary_json" in item:
            item["summary"] = json.loads(item.pop("summary_json") or "{}")
        return item
