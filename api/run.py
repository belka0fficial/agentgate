import uvicorn

from agentgate.config import get_settings

settings = get_settings()
uvicorn.run("agentgate.main:app", host=settings.host, port=settings.port, reload=True)

