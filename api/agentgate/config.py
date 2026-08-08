from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    host: str
    port: int
    data_dir: Path
    admin_key: str
    session_secret: str
    mcp_key: str
    hermes_url: str
    hermes_api_key: str
    toolgate_url: str
    toolgate_admin_key: str
    memorygate_url: str
    memorygate_admin_key: str
    memorygate_agent_id: str


def _value(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def get_settings() -> Settings:
    project_root = Path(__file__).resolve().parents[2]
    data_dir = Path(_value("AGENTGATE_DATA_DIR", str(project_root / "data"))).expanduser().resolve()
    return Settings(
        host=_value("AGENTGATE_HOST", "127.0.0.1"),
        port=int(_value("AGENTGATE_PORT", "8030")),
        data_dir=data_dir,
        admin_key=_value("AGENTGATE_ADMIN_KEY"),
        session_secret=_value("AGENTGATE_SESSION_SECRET"),
        mcp_key=_value("AGENTGATE_MCP_KEY"),
        hermes_url=_value("HERMES_URL", "http://127.0.0.1:8642").rstrip("/"),
        hermes_api_key=_value("HERMES_API_KEY"),
        toolgate_url=_value("TOOLGATE_URL", "http://127.0.0.1:8010").rstrip("/"),
        toolgate_admin_key=_value("TOOLGATE_ADMIN_KEY"),
        memorygate_url=_value("MEMORYGATE_URL", "http://127.0.0.1:8020").rstrip("/"),
        memorygate_admin_key=_value("MEMORYGATE_ADMIN_KEY"),
        memorygate_agent_id=_value("MEMORYGATE_AGENT_ID", "hermes"),
    )
