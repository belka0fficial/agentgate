from __future__ import annotations

from typing import Any

import httpx
from fastapi import HTTPException

from .config import Settings


class Upstream:
    def __init__(self, settings: Settings):
        self.settings = settings

    def base(self, name: str) -> str:
        return {"hermes": self.settings.hermes_url, "toolgate": self.settings.toolgate_url, "memorygate": self.settings.memorygate_url}[name]

    def headers(self, name: str) -> dict[str, str]:
        if name == "hermes":
            return {"Authorization": f"Bearer {self.settings.hermes_api_key}"} if self.settings.hermes_api_key else {}
        if name == "toolgate":
            return {"X-ToolGate-Key": self.settings.toolgate_admin_key} if self.settings.toolgate_admin_key else {}
        headers = {"X-MemoryGate-Key": self.settings.memorygate_admin_key} if self.settings.memorygate_admin_key else {}
        if self.settings.memorygate_agent_id:
            headers["X-Agent-Id"] = self.settings.memorygate_agent_id
        return headers

    async def request(self, name: str, method: str, path: str, *, json: Any = None, params: dict[str, Any] | None = None) -> Any:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.request(method, f"{self.base(name)}{path}", headers=self.headers(name), json=json, params=params)
        except httpx.HTTPError as exc:
            raise HTTPException(503, {"source": name, "message": "Service unreachable"}) from exc
        text = response.text
        try:
            body = response.json() if text else None
        except ValueError:
            body = {"message": text[:500]}
        if response.is_error:
            detail = body.get("detail", body) if isinstance(body, dict) else body
            raise HTTPException(response.status_code, {"source": name, "message": detail})
        return body
