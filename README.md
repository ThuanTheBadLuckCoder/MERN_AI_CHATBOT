# Codfe 🤖💬 - RAG-based Application for Web Frontend Development

**Version:** 3.5  
**Developer:** Doan Tran Thuan - ITITIU20316 (Fullstack)  
**Designer:** Nguyen Le Quy Tran - UI/UX Design & Design System  
**Keywords:** MERN Stack, Elasticsearch, LangChain, RAG, ChatBOT, LLMs (GPT, Gemini)

## 📋 Table of Contents

- [Overview](#overview)
- [Demo Video](#demo-video)
- [Design Credits](#design-credits)
- [Evaluation System](#evaluation-system)
- [Dataset Integration](#dataset-integration)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation Guide](#installation-guide)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Contact](#contact)

## 🎯 Overview

Codfe is a state-of-the-art chatbot application developed using the MERN stack (MongoDB, Express, ReactJS, NodeJS) and powered by cutting-edge Large Language Models (LLMs) such as OpenAI's GPT models and Google's Gemini. The system combines Docker to host Elasticsearch and Kibana, providing a comprehensive AI-powered virtual assistant for developers.

This chatbot is designed to provide contextual and accurate responses by leveraging dRAGon 🐉 techniques (data-driven Retrieval-Augmented Generation over neural networks) and dedicated documentation for Front-end Developers. The system supports multiple LLMs and provides an unparalleled conversational experience with advanced document processing capabilities.

## 🎬 Demo Video

Watch our comprehensive demo video to see Codfe in action! The video showcases the application's key features, user interface, and demonstrates how the RAG-based chatbot works with different document types and AI models.

[![Codfe Demo Video](https://youtu.be/gczsT44XTFk)]

**Video Highlights:**
- 🚀 **Application Overview**: Complete walkthrough of the Codfe interface
- 💬 **Chat Functionality**: Real-time conversations with GPT and Gemini models
- 📚 **Document Processing**: Uploading and processing various file formats
- 🔍 **RAG Implementation**: Demonstrating context-aware responses with references
- 🎨 **UI/UX Features**: Showcasing the modern, responsive design
- ⚙️ **Admin Features**: User management and system administration

*Click the badge above or download the video file to see the full demonstration.*

## 🎨 Design Credits

**All design contributions belong exclusively to Nguyen Le Quy Tran**

The complete design system, including UI components, color palette, typography, and user interface design, was created by **Nguyen Le Quy Tran**. The design system is available on [Figma](https://www.figma.com/design/hHFd0ZhZ3UiUCD4oPsqy2N/Codfe?node-id=0-1) and includes:

- **UI Components:** Modular and reusable design elements for consistency across the app
- **Color Palette:** A modern, visually appealing color scheme optimized for accessibility
- **Typography:** Carefully chosen fonts for readability and aesthetic harmony
- **Responsive Design:** Mobile-first approach with seamless cross-device compatibility
- **User Experience:** Intuitive navigation and interaction patterns

## 📊 Evaluation System

The project includes a comprehensive evaluation system for assessing response quality and accuracy. The evaluation framework is available at [THESIS_EVALUATION](https://github.com/ThuanTheBadLuckCoder/THESIS_EVALUATION) and includes:

- **Response Evaluation:** Automated assessment of chatbot responses against standard answers
- **Multi-System Comparison:** Comparison of responses from different AI systems
- **Performance Metrics:** Quantitative analysis of response accuracy and relevance
- **Evaluation Scripts:** Python-based evaluation tools and Jupyter notebooks

## 📚 Dataset Integration

The system uses a specialized dataset for providing context-aware responses. The dataset repository is available at [DATA_CODFE](https://github.com/ThuanTheBadLuckCoder/DATA_CODFE) and includes:

- **Structured Content:** High-quality, organized data for RAG pipeline
- **TailwindCSS Documentation:** Comprehensive frontend development resources
- **Web Development Resources:** HTML, CSS, JavaScript, and framework documentation
- **Integration Scripts:** Tools for data preprocessing and Elasticsearch indexing

## ✨ Features

### 🔐 Authentication & Security
- Secure user authentication with JWT tokens
- Password reset functionality with OTP verification
- Session management and cookie-based security
- Role-based access control (Admin/User)

### 💬 Advanced Chat Capabilities
- **Multi-Model Support**: OpenAI GPT-3.5/4 and Google Gemini
- **Contextual Understanding**: dRAGon technology for context-aware responses
- **Reference Tracking**: Automatic tracking of document references used in responses
- **Conversation Management**: Save, load, and manage chat history
- **Real-time Streaming**: Live response streaming for better UX

### 📚 Document Processing
- **Multi-Format Support**: PDF, DOCX, HTML, JSON, CSV, TXT files
- **Web Content Loading**: Extract and process content from URLs
- **Elasticsearch Integration**: Fast and efficient document search
- **Vector Embeddings**: Advanced semantic search capabilities

### 🎨 Modern UI/UX
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **TailwindCSS**: Modern, customizable styling
- **Dark/Light Mode**: User preference support
- **Real-time Animations**: Smooth typing animations and transitions
- **Code Highlighting**: Syntax highlighting for code snippets

### 🔧 Developer Features
- **Admin Dashboard**: User management and system monitoring
- **Index Management**: Create and manage document indices
- **API Documentation**: Comprehensive REST API
- **Error Handling**: Robust error management and logging

## 🛠️ Prerequisites

Before installing Codfe, ensure you have the following software installed on your system:

### Required Software
- **Node.js**: Version 20.0.0 or higher
- **npm**: Version 9.0.0 or higher (comes with Node.js)
- **MongoDB**: Version 6.0 or higher
- **Docker**: Version 20.10 or higher (for Elasticsearch)
- **Git**: For cloning the repository

### API Keys Required
- **OpenAI API Key**: For GPT model integration
- **Google Gemini API Key**: For Gemini model integration
- **Email Service**: Gmail or other SMTP service for password reset

### System Requirements
- **RAM**: Minimum 8GB (16GB recommended for Elasticsearch)
- **Storage**: At least 10GB free space
- **Network**: Stable internet connection for API calls

## 📦 Installation Guide

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/ThuanTheBadLuckCoder/MERN_AI_CHATBOT.git

# Navigate to the project directory
cd MERN_AI_CHATBOT
```

### Step 2: Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to root directory
cd ..
```

### Step 3: Set Up MongoDB

#### Option A: Local MongoDB Installation
```bash
# Install MongoDB (Ubuntu/Debian)
sudo apt update
sudo apt install mongodb

# Start MongoDB service
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Verify installation
mongo --version
```

#### Option B: MongoDB Atlas (Cloud)
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account and cluster
3. Get your connection string
4. Use the connection string in your environment variables

### Step 4: Set Up Elasticsearch with Docker

```bash
# Create a docker-compose.yml file in the root directory
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: elasticsearch
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
    ports:
      - "9200:9200"
      - "9300:9300"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
    networks:
      - elastic

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    container_name: kibana
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch
    networks:
      - elastic

volumes:
  elasticsearch_data:

networks:
  elastic:
    driver: bridge
EOF

# Start Elasticsearch and Kibana
docker-compose up -d

# Verify Elasticsearch is running
curl http://localhost:9200
```

### Step 5: Environment Configuration

#### Backend Environment Variables

Create a `.env` file in the `backend` directory:

```bash
cd backend
touch .env
```

Add the following configuration to `backend/.env`:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URL=mongodb://localhost:27017/codfe_db
# For MongoDB Atlas, use: mongodb+srv://username:password@cluster.mongodb.net/codfe_db

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
COOKIE_SECRET=your_cookie_secret_key_here

# OpenAI Configuration
OPEN_AI_SECRET=your_openai_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Google Gemini Configuration
GOOGLE_API_KEY=your_google_gemini_api_key_here

# Elasticsearch Configuration
ELASTIC_URL=http://localhost:9200
ELASTIC_INDEX=thesis_tailwindcss
ELASTICSEARCH_USER=elastic
ELASTICSEARCH_PASSWORD=changeme

# Email Configuration (for password reset)
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password_here

# Optional: SERP API for web search
SERP_API_KEY=your_serp_api_key_here
```

#### Frontend Environment Variables

Create a `.env` file in the `frontend` directory:

```bash
cd frontend
touch .env
```

Add the following configuration to `frontend/.env`:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:5000
VITE_APP_NAME=Codfe AI Assistant

# Optional: Analytics and monitoring
VITE_APP_VERSION=3.0.0
```

### Step 6: Build the Application

```bash
# Build backend
cd backend
npm run build

# Build frontend
cd ../frontend
npm run build
```

## ⚙️ Configuration

### API Keys Setup

#### OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an account or sign in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key and add it to your `.env` file

#### Google Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key and add it to your `.env` file

#### Email Configuration (Gmail)
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
3. Use the generated password in your `.env` file

### Elasticsearch Configuration

The system uses Elasticsearch for document storage and retrieval. The default configuration includes:

- **Index Name**: `thesis_tailwindcss` (configurable via `ELASTIC_INDEX`)
- **Port**: 9200 (HTTP) and 5601 (Kibana)
- **Security**: Disabled for development (enable for production)

## 🚀 Running the Application

### Development Mode

#### Start Backend Server
```bash
cd backend
npm run dev
```

The backend will start on `http://localhost:5000`

#### Start Frontend Development Server
```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:5173`

### Production Mode

#### Build and Start Backend
```bash
cd backend
npm run build
npm start
```

#### Build and Serve Frontend
```bash
cd frontend
npm run build
npm run preview
```

### Using Docker Compose (Alternative)

For a complete setup with all services:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## 📖 Usage

### 1. First Time Setup

1. **Access the Application**: Open `http://localhost:5173` in your browser
2. **Create Account**: Click "Sign Up" and create a new account
3. **Verify Email**: Check your email for verification (if enabled)
4. **Login**: Use your credentials to log in

### 2. Basic Usage

#### Starting a Chat
1. Click "New Chat" to start a conversation
2. Choose your preferred AI model (GPT or Gemini)
3. Type your question or upload a document
4. Receive contextual responses with references

#### Uploading Documents
1. Click the upload button in the chat interface
2. Select your document (PDF, DOCX, HTML, JSON, CSV, TXT)
3. Choose an index for the document
4. The system will process and index the document

#### Managing Indices
1. Go to the Admin panel (if you have admin privileges)
2. View all available indices
3. Create new indices for different document collections
4. Monitor index statistics and performance

### 3. Advanced Features

#### Reference Tracking
- Each response includes references to source documents
- Click on references to view source content
- References are categorized by type (documentation, code, etc.)

#### Conversation Management
- Save and load previous conversations
- Export chat history
- Delete conversations you no longer need

#### Admin Features
- User management
- System monitoring
- Index management
- Performance analytics

## 🔌 API Documentation

### Authentication Endpoints

```http
POST /user/signup
POST /user/login
POST /user/logout
GET /user/auth-status
POST /user/request-reset
POST /user/auth-otp
PATCH /user/change-password
```

### Chat Endpoints

```http
POST /chat/new-gpt
POST /chat/new-gemini
POST /chat/new-basic
GET /chat/all-conversations
GET /chat/:conversationId
GET /chat/:conversationId/references
DELETE /chat/delete/:conversationId
```

### Document Management

```http
POST /file/new
POST /link/new
POST /link/check-url
GET /indice/all-indices
POST /indice/new
GET /indice/details/:index
GET /indice/sources/:index
```

### Example API Usage

```javascript
// Login
const loginResponse = await fetch('/user/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, remember: true })
});

// Send chat message
const chatResponse = await fetch('/chat/new-gpt', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    message: "How do I create a responsive navbar?",
    conversationId: "conversation-123"
  })
});
```

## 🔧 Troubleshooting

### Common Issues

#### 1. MongoDB Connection Error
```bash
# Check if MongoDB is running
sudo systemctl status mongodb

# Start MongoDB if not running
sudo systemctl start mongodb

# Check MongoDB logs
sudo journalctl -u mongodb
```

#### 2. Elasticsearch Connection Error
```bash
# Check if Elasticsearch container is running
docker ps | grep elasticsearch

# Restart Elasticsearch
docker-compose restart elasticsearch

# Check Elasticsearch logs
docker-compose logs elasticsearch
```

#### 3. Port Already in Use
```bash
# Check what's using the port
lsof -i :5000
lsof -i :5173

# Kill the process
kill -9 <PID>
```

#### 4. API Key Issues
- Verify your API keys are correct
- Check if you have sufficient credits
- Ensure the API keys are properly set in `.env`

#### 5. Build Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear cache
npm cache clean --force
```

### Performance Optimization

#### For Development
- Use `npm run dev` for hot reloading
- Monitor memory usage with `htop` or Task Manager
- Use browser dev tools for frontend debugging

#### For Production
- Enable Elasticsearch security
- Use environment-specific configurations
- Implement proper logging and monitoring
- Set up reverse proxy (nginx) for better performance

### Logs and Debugging

#### Backend Logs
```bash
cd backend
npm run dev
# Logs will appear in the terminal
```

#### Frontend Logs
- Open browser developer tools (F12)
- Check Console tab for errors
- Check Network tab for API calls

#### Elasticsearch Logs
```bash
docker-compose logs elasticsearch
```

## 🤝 Contributing

This project is developed as part of academic research. Contributions are welcome:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Related Repositories

This project is part of a larger ecosystem. Please also check out:

- **[EVALUATION_CODFE](https://github.com/ThuanTheBadLuckCoder/THESIS_EVALUATION)**: Evaluation system for assessing response quality and accuracy
- **[DATA_CODFE](https://github.com/ThuanTheBadLuckCoder/DATA_CODFE)**: Dataset repository for RAG integration and context provision

### Development Guidelines

- Follow TypeScript best practices
- Use meaningful commit messages
- Test your changes thoroughly
- Update documentation as needed
- Follow the existing code style
- Respect design contributions by Nguyen Le Quy Tran (https://www.linkedin.com/in/nglequytran/)

## 📞 Contact

**Developer:** Doan Tran Thuan - ITITIU20316  
**Email:** [dtthuan.contact@gmail.com](mailto:dtthuan.contact@gmail.com)  
**Designer:** Nguyen Le Quy Tran  
**Project:** RAG-based Application for Web Frontend Development - Codfe

### Support

For technical support or questions:
1. Check the troubleshooting section above
2. Review the API documentation
3. Check existing issues on GitHub
4. Contact the developer via email

## 📄 License

This project is developed for academic research purposes. Please respect the intellectual property and use responsibly.

---

**Note:** This system requires active internet connection for AI model API calls. Ensure you have stable connectivity for optimal performance.
