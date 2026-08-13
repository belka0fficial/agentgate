FROM node:22-bookworm-slim AS dashboard
WORKDIR /src/dashboard
COPY dashboard/package*.json ./
RUN npm ci
COPY dashboard/ ./
RUN npm run build

FROM python:3.12-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    AGENTGATE_HOST=0.0.0.0 \
    AGENTGATE_PORT=8030 \
    AGENTGATE_DATA_DIR=/app/data
WORKDIR /app
COPY api/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt
COPY api/ /app/api/
COPY --from=dashboard /src/dashboard/dist /app/dashboard/dist
WORKDIR /app/api
EXPOSE 8030
CMD ["python", "-m", "uvicorn", "agentgate.main:app", "--host", "0.0.0.0", "--port", "8030"]
