# Maintenance Request Management System

A full-stack web application designed to help apartment tenants submit maintenance requests and allow managers and maintenance workers to track and manage them efficiently.

## Features

- **User Authentication:** Sign up and log in using email/password or Google.
- **Role-Based Dashboards:** Separate dashboards for tenants, maintenance workers, and managers.
- **Tenants:** Submit maintenance requests and track their status.
- **Managers:** View all requests and assign maintenance workers.
- **Maintenance Workers:** View assigned tasks and update their progress.
- **Request Tracking:** Track requests from pending to completed.

## Tech Stack

**Frontend:** React, TypeScript, Vite, HTML, CSS

**Backend:** Node.js, Express.js, REST APIs

**Database:** PostgreSQL

**Authentication:** JWT, Google OAuth

**Deployment:** Vercel (Frontend), Render (Backend), Neon (Database)

## Project Structure

```text
Maintenance-Request-System-Project/
├── frontend/     # React + TypeScript
├── backend/      # Express APIs
└── README.md
```

## Getting Started

1. Clone the repository:

   ```bash
   git clone https://github.com/hieunguyen601/Maintenance-Request-System-Project.git
   ```

2. Install dependencies in both folders:

   ```bash
   cd frontend
   npm install

   cd ../backend
   npm install
   ```

3. Configure the required environment variables for PostgreSQL, JWT, and Google authentication.

4. Start the backend:

   ```bash
   npm start
   ```

5. Start the frontend in a separate terminal:

   ```bash
   cd frontend
   npm run dev
   ```

## How It Works

1. A tenant submits a maintenance request.
2. A manager reviews the request and assigns a maintenance worker.
3. The maintenance worker updates the request status.
4. The tenant and manager can track its progress.

## Author

**Henry Nguyen**

Computer Science Student | University of Houston
