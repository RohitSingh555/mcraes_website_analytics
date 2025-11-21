# Docker Setup Guide

This project includes Docker Compose configuration to run both the backend and frontend services in containers.

## Prerequisites

- Docker and Docker Compose installed on your machine
- Environment variables configured (optional, can use .env file)

## Quick Start

1. **Build and start services:**
   ```bash
   docker-compose up --build
   ```

2. **Run in detached mode (background):**
   ```bash
   docker-compose up -d --build
   ```

3. **View logs:**
   ```bash
   docker-compose logs -f
   ```

4. **Stop services:**
   ```bash
   docker-compose down
   ```

## Services

### Backend (FastAPI)
- **Container name:** `mcraes-backend`
- **Port:** `8000`
- **URL:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs
- **Health Check:** http://localhost:8000/health

### Frontend (React + Vite)
- **Container name:** `mcraes-frontend`
- **Port:** `3000`
- **URL:** http://localhost:3000

## Environment Variables

Create a `.env` file in the project root with your configuration:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
SCRUNCH_API_TOKEN=your_token
SUPABASE_DB_PASSWORD=your_password
```

The docker-compose.yml will automatically mount the `.env` file to the backend container.

## Network

Both services are connected to the `mcraes-network` Docker network, allowing them to communicate using service names:
- Frontend can reach backend at: `http://backend:8000`
- Nginx proxy forwards `/api` requests from frontend to backend

## Building Individual Services

### Backend only:
```bash
docker build -f Dockerfile.backend -t mcraes-backend .
```

### Frontend only:
```bash
docker build -f Dockerfile.frontend -t mcraes-frontend .
```

## Troubleshooting

1. **Port already in use:**
   - Change ports in `docker-compose.yml` if 8000 or 3000 are already in use

2. **Backend can't connect to database:**
   - Ensure your `.env` file has correct database credentials
   - Check that your database allows connections from Docker containers

3. **Frontend can't reach backend:**
   - Verify both containers are running: `docker-compose ps`
   - Check logs: `docker-compose logs backend frontend`
   - Ensure nginx proxy is working by checking nginx logs

4. **Rebuild after code changes:**
   ```bash
   docker-compose up --build
   ```

## Production Considerations

For production deployment:
1. Set `DEBUG=False` in environment variables
2. Use proper secrets management (not .env files)
3. Configure proper CORS origins in backend
4. Use HTTPS with proper SSL certificates
5. Consider using Docker secrets or external secret management

