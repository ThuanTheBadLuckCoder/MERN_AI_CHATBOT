# Docker Setup for MERN AI Chatbot

This document provides instructions for setting up and running the MERN AI Chatbot application using Docker and Docker Compose.

## Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)

## Quick Start

### 1. Environment Setup

1. Copy the environment example file:
   ```bash
   cp backend/.env.example backend/.env
   ```

2. Edit `backend/.env` with your actual API keys and configurations:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `GEMINI_API_KEY`: Your Google Gemini API key
   - `JWT_SECRET`: A secure random string for JWT tokens
   - `COOKIE_SECRET`: A secure random string for cookies
   - `ELASTIC_API_KEY`: Your Elasticsearch API key (if using)

### 2. Build and Run

Build and start all services:
```bash
docker-compose up --build
```

Or run in detached mode:
```bash
docker-compose up -d --build
```

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **MongoDB**: localhost:27017
- **Elasticsearch**: http://localhost:9200

## Services Overview

### Frontend (React + Vite)
- **Port**: 3000
- **Technology**: React, TypeScript, Vite, Tailwind CSS
- **Serves**: Static files via Nginx

### Backend (Node.js + Express)
- **Port**: 5000
- **Technology**: Node.js, Express, TypeScript
- **Features**: REST API, JWT authentication, AI integrations

### MongoDB
- **Port**: 27017
- **Credentials**: admin/password123
- **Database**: mern_ai_chatbot

### Elasticsearch (Optional)
- **Port**: 9200, 9300
- **Purpose**: Vector search and document indexing

## Docker Commands

### Start services
```bash
docker-compose up
```

### Start services in background
```bash
docker-compose up -d
```

### Stop services
```bash
docker-compose down
```

### Stop and remove volumes
```bash
docker-compose down -v
```

### View logs
```bash
docker-compose logs -f [service-name]
```

### Rebuild specific service
```bash
docker-compose up --build [service-name]
```

## Development

### Hot Reload Development
For development with hot reload, you can run services separately:

1. Start only the database:
   ```bash
   docker-compose up mongodb elasticsearch
   ```

2. Run backend in development mode:
   ```bash
   cd backend
   npm run dev
   ```

3. Run frontend in development mode:
   ```bash
   cd frontend
   npm run dev
   ```

### Container Management

View running containers:
```bash
docker ps
```

Execute commands in running container:
```bash
docker exec -it mern-ai-backend /bin/sh
```

View container logs:
```bash
docker logs mern-ai-backend
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: If ports are already in use, modify the port mappings in `docker-compose.yml`

2. **MongoDB connection issues**: Ensure MongoDB is running and the connection string is correct

3. **Build failures**: Clear Docker cache:
   ```bash
   docker system prune -a
   ```

4. **Permission issues**: On Linux, you may need to run Docker commands with `sudo`

### Logs and Debugging

View all service logs:
```bash
docker-compose logs
```

View specific service logs:
```bash
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mongodb
```

Follow logs in real-time:
```bash
docker-compose logs -f
```

## Production Deployment

### Security Considerations

1. **Change default passwords**: Update MongoDB credentials in `docker-compose.yml`
2. **Use environment files**: Store sensitive data in `.env` files
3. **Enable HTTPS**: Configure SSL certificates for production
4. **Network security**: Restrict network access and use firewalls

### Performance Optimization

1. **Resource limits**: Add memory and CPU limits to services
2. **Volume optimization**: Use named volumes for better performance
3. **Image optimization**: Use multi-stage builds and minimize layer size

### Example Production Configuration

```yaml
# Add to docker-compose.yml services
deploy:
  resources:
    limits:
      memory: 1G
      cpus: '0.5'
    reservations:
      memory: 512M
      cpus: '0.25'
```

## Backup and Recovery

### Database Backup
```bash
docker exec mern-ai-mongodb mongodump --uri="mongodb://admin:password123@localhost:27017/mern_ai_chatbot?authSource=admin" --out /backup
```

### Volume Backup
```bash
docker run --rm -v mern-ai-chatbot_mongodb_data:/data -v $(pwd):/backup alpine tar czf /backup/mongodb_backup.tar.gz /data
```

## Contributing

1. Make changes to source code
2. Test with Docker:
   ```bash
   docker-compose up --build
   ```
3. Submit pull request

## Support

For issues and questions:
- Check the logs: `docker-compose logs`
- Review environment variables
- Ensure all required API keys are set
- Check Docker and Docker Compose versions 