# Codfe :robot: :speech_balloon: - THE APPLICATIONS OF LARGE LANGUAGE MODELS IN DEVELOPING AN INTEGRATED VIRTUAL ASSISTANT SYSTEM TO ENHANCE PROGRAMMER SUPPORT

**Version:** - 3.5 -

**Developer:** Doan Tran Thuan - ITITIU20316 (Fullstack)

**Keywords:** MERN Stack, Elasticsearch, LangChain, RAG, ChatBOT, LLMs (GPT, Gemini)

## Overview

Codfe is a state-of-the-art chatbot application developed using the MERN stack (MongoDB, Express, ReactJS, NodeJS) and powered by cutting-edge Large Language Models (LLMs) such as OpenAI’s GPT models and Gemini. Combining Docker to host Elasticsearch and Kibana. The project serves as a cornerstone for Thesis and Pre-thesis work, showcasing advancements in AI chatbot technology.

This chatbot is designed to provide contextual and accurate responses by leveraging dRAGon :dragon: techniques (data-driven Retrieval-Augmented Generation over neural networks - from RAG techniques that have been researched in articles and developed specifically for Codfe system) and dedicated documentation for Front-end Developers. Future updates will integrate other prominent LLMs such as Llama and Claude, providing an unparalleled conversational experience.

---

## Key Features and Milestones

### Version 1.0
- **Conversational Capability:** Facilitates intelligent conversations powered by GPT-3.5 Turbo and other OpenAI models.
- **User Authentication:** Secure login and user account management to protect sensitive information.
- **Secure Sessions:** Ensures data protection during chat sessions with robust security mechanisms.

### Version 2.0
- **Contextual Understanding:** Uses dRAGon technology to tailor responses based on user-provided documents, avoiding generic or irrelevant answers.
- **Document Integration:** Users can upload and work with documents in formats such as `.docx`, `.pdf`, `.json` or many others.
- **Fast Document Search:** Incorporates Elasticsearch for rapid retrieval of relevant information to assist LLMs in forming precise responses.

### Version 3.0
- **Advanced RAG Integration:** Embeds complex data like code files, guides, and algorithmic solutions to enhance context-based responses.
- **Extended Model Support:** Adds new LLMs like Llama and Gemini to increase versatility.
- **Improved Accessibility:** Supports a wide range of users for diverse use cases and industries.

### Version 3.5
- **Enhanced UI/UX:** Redesigned interface for better usability and aesthetic appeal.
- **New Features:** Includes Search Mode and Chat-Only Mode, accommodating various user preferences and scenarios.
- **Universal Usability:** Tailored to meet a broad spectrum of user needs and applications.

---

## Research and Future Directions

### Current Focus
- Developing **Multi-Project Chat Support**: Allow users to manage and interact with multiple projects within a single account while maintaining strict contextual boundaries to avoid data confusion.
- Enhancing **Contextual Memory**: Focused memory functionality restricted to each "Project Chat," ensuring high relevance in responses.

### Roadmap
- **Multi-Project Chat Support:** Expected completion by May 2025.  
- **Integration with New LLMs:** Ongoing research and updates.  
- **Advanced Retrieval-Augmented Features:** Embedding support for additional data types and documents.

---

## Design System and User Interface

### Figma Design System
Explore the design system used for Codfe on Figma: <a href="https://www.figma.com/design/hHFd0ZhZ3UiUCD4oPsqy2N/Codfe?node-id=0-1&p=f&t=VYfwbKnrBimGY40O-0" target="_blank"><strong>Codfe Design System</strong></a>

The design system includes:
- **UI Components:** Modular and reusable design elements for consistency across the app.  
- **Color Palette:** A modern, visually appealing color scheme optimized for accessibility.  
- **Typography:** Carefully chosen fonts for readability and aesthetic harmony.  

### User Interface (UI) Overview

![image](https://github.com/user-attachments/assets/48afee86-9195-4112-a003-958e64ef5cc8)

- **Login:** A secure and user-friendly page where users can authenticate their accounts using email and password. Features include error messages for invalid credentials and quick redirection to the signup page for new users.

![image](https://github.com/user-attachments/assets/6d276a82-88b4-4d03-8521-4eb9bad131ab)


- **Signup:** A streamlined registration page for new users, allowing them to create an account by providing basic information such as email, password, and username. Includes validation for required fields and password strength.

![image](https://github.com/user-attachments/assets/ade8e697-220a-443e-9e00-fda7dd8f866c)


- **Admin:** A dedicated admin dashboard with features for managing user accounts, monitoring chat sessions, and overseeing system performance. The page provides insights into user activity and tools for managing chatbot settings.

![image](https://github.com/user-attachments/assets/1f4e6da2-2a2c-4642-9633-3750d77a3ed9)


- **Chat:** A dynamic and responsive chat interface featuring real-time message streaming, file-sharing options, and context-based document retrieval. Designed for seamless interaction and optimized for multi-device accessibility.

![image](https://github.com/user-attachments/assets/7d6f51ce-4898-4695-8953-961c4d8cc39b)




### Development Plan
- For the Chat interface: Aim to develop more code rendering capabilities when provided by the system or upon user request. Users can edit or add to better suit their own needs.
- The final design is more consistent with the designed interface, each font and size. The background color must be consistent with the design color code. The stretch for multiple devices is handled more smoothly, minimizing problems with lag, text overlap, and loss of necessary content.

---

## Getting Started

### Prerequisites
- **Node.js**: v20+
- **TypeScript**: Installed globally
- **MongoDB**: Database for storing user data
- **OpenAI API Key**: Required for interacting with LLMs

### Installation

1. Clone the repository:  
   ```bash
   git clone https://github.com/<your-username>/MERN_AI_CHATBOT.git

2. Navigate to the project directory:
   ```bash
   cd MERN_AI_CHATBOT

3. Install dependencies:
   ```bash
   npm install

4. Set up environment variables in .env:

   Copy the `.env.example` file and paste it in the same folder. Then rename the file to `.env`, then change the default settings to "example".

7. Start the development server:
   ```bash
   npm run dev

### Contributions

This project is developed independently by Doan Tran Thuan as a part of academic research. Suggestions, contributions, and collaborations are welcome to help improve the chatbot further.

### Usage

1. Open the application in your browser: http://localhost:5173. Please contact me for elasticsearch settings!
2. Log in or sign up to start using the chatbot.
3. Ask questions or upload documents to receive contextually accurate responses.

### Contact:
For inquiries, reach out to Doan Tran Thuan at [dtthuan.contact@gmail.com].
