# Maintenance Services Management System

A full-stack web application designed to manage maintenance service requests efficiently. The system provides role-based dashboards, allowing users to access features based on their assigned roles.

## Tech Stack

**Frontend**
- React.js
- TypeScript
- HTML5 & CSS3
- React Router
- Axios

**Backend**
- Node.js
- Express.js
- RESTful APIs

**Database**
- PostgreSQL

**Authentication & Security**
- User registration and login
- Password hashing
- Role-based access control

## Features

- **User Authentication:** Users can create accounts, log in, and log out.
- **Role-Based Dashboards:** Different dashboard interfaces based on user roles.
- **Protected Access:** Users must log in before accessing the application.
- **RESTful API:** Backend endpoints handle communication between the frontend and database.
- **Database Integration:** PostgreSQL stores user information and supports application data management.

## Getting Started

### Prerequisites

Install the following software:

- Node.js and npm
- PostgreSQL
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/hieunguyen601/maintenance-services.git
cd maintenance-services
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the `backend` directory and configure the environment variables required by your server and PostgreSQL connection.

Do not commit your `.env` file to GitHub.

### 4. Start the Backend

Run the backend using the start or development script defined in `backend/package.json`.

### 5. Install and Start the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Vite in your browser.

## Future Improvements

- Maintenance request creation and tracking
- Admin and staff management dashboards
- Request assignment to maintenance staff
- Maintenance status updates
- Search and filtering functionality
- Deployment of the frontend and backend

## Author

**Henry Nguyen**
