# LifeOS - Personal Life Management Platform

LifeOS is a comprehensive, gamified productivity platform designed to help you organize your life, build habits, and achieve your goals. It combines task management, note-taking, financial tracking, and focus tools into a single, unified interface wrapped in a rewarding gamification layer.

## 🌟 Key Features

### 🎮 Gamification
*   **XP System**: Earn experience points for completing tasks, maintaining streaks, and logging focus sessions.
*   **Levels**: Level up your profile as you become more productive.
*   **Achievements**: Unlock badges for milestones (e.g., "7-Day Streak", "Task Master").
*   **Activity Graph**: GitHub-style contribution grid to visualize your daily consistency.

### ✅ Task Management
*   **Smart Lists**: Organize tasks by Today, This Week, and Priorities.
*   **Quick Add**: Rapidly capture tasks to keep your flow uninterrupted.
*   **Progress Tracking**: Visual indicators for daily and weekly completion rates.

### 📝 Knowledge Base
*   **Rich Text Notes**: Create and organize notes with a clean, modern editor.
*   **Categorization**: Tag and sort notes for easy retrieval.

### 💰 Financial Tracking
*   **Budget Management**: Track income and expenses.
*   **Visual Reports**: Understand your spending habits with intuitive charts.

### ⏱️ Focus Tools
*   **Pomodoro Timer**: Built-in focus timer to help you stay in the zone.
*   **Focus Stats**: Track your deep work hours and sessions.

### 📱 PWA Support
*   **Installable**: Works as a native app on both Desktop and Mobile.
*   **Offline Capable**: Access your data even without an internet connection.
*   **Responsive**: Seamlessly adapts to any screen size.

## 🛠️ Tech Stack

*   **Frontend**: React, Tailwind CSS, Framer Motion, Radix UI
*   **Backend**: Python, FastAPI
*   **Database**: MongoDB
*   **Authentication**: JWT-based secure auth

## 🚀 Getting Started

### Prerequisites
*   Node.js & npm
*   Python 3.8+
*   MongoDB (Local or Atlas)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/jayantpatel06/LifeOS.git
    cd LifeOS
    ```

2.  **Backend Setup**
    ```bash
    cd backend
    # Create virtual environment
    python -m venv venv
    # Activate virtual environment
    # Windows:
    .\venv\Scripts\activate
    # Linux/Mac:
    source venv/bin/activate
    
    # Install dependencies
    pip install -r requirements.txt
    
    # Set up environment variables
    # Create a .env file with:
    # MONGO_URL=mongodb://localhost:27017
    # DB_NAME=lifemanager
    # JWT_SECRET=your_secret_key
    # CORS_ORIGINS=http://localhost:3000,http://YOUR_LOCAL_IP:3000
    ```

3.  **Frontend Setup**
    ```bash
    cd frontend
    # Install dependencies
    npm install
    
    # Set up environment variables
    # Create a .env file with:
    # REACT_APP_BACKEND_URL=http://localhost:8000
    ```

### Running the App

1.  **Start the Backend**
    ```bash
    cd backend
    python -m uvicorn server:app --reload --host 0.0.0.0 --port 8000
    ```

2.  **Start the Frontend**
    ```bash
    cd frontend
    npm start --host
    ```

3.  Open `http://localhost:3000` (or your local IP for mobile access) in your browser.

## 📱 Mobile Access (Local Network)

To access the app from your phone while running locally:
1.  Ensure your computer and phone are on the same Wi-Fi.
2.  Update `frontend/.env` with your computer's local IP (e.g., `REACT_APP_BACKEND_URL=http://192.168.1.5:8000`).
3.  Access via `http://192.168.1.5:3000` on your phone's browser.

## 📄 License

This project is licensed under the MIT License.
