# ProblemBridge AI

## Transforming Real-World Problems into Innovation Opportunities

ProblemBridge AI is an AI-powered platform designed to bridge the gap between **real-world problems and innovative solutions**.

The platform allows users to submit problems they observe in their daily life, communities, education, businesses, or other areas. ProblemBridge AI analyzes these problems and helps transform them into structured **innovation opportunities, project ideas, and possible solutions**.

## Problem Statement

Many real-world problems remain unsolved because people may identify a problem but do not know how to convert it into a practical solution or project idea.

Students and aspiring innovators especially face difficulties in:

- Identifying meaningful problems
- Understanding the root cause of a problem
- Converting a problem into a project idea
- Finding suitable technologies for a solution
- Evaluating whether an idea is practical
- Getting guidance on how to start building a solution

Existing platforms often focus on already-defined projects or solutions rather than helping users move from a **real-world problem → innovation opportunity → project idea**.

ProblemBridge AI aims to address this gap.

## Proposed Solution

ProblemBridge AI provides a platform where users can:

1. Describe a real-world problem.
2. Analyze and understand the problem.
3. Identify the possible root causes.
4. Discover innovation opportunities.
5. Generate potential solution ideas using AI.
6. Suggest suitable technologies for the solution.
7. Evaluate the feasibility and impact of an idea.
8. Convert the selected idea into a structured project concept.

### Basic Flow

Real-World Problem
        ↓
ProblemBridge AI
        ↓
Problem Analysis
        ↓
Root Cause Identification
        ↓
Innovation Opportunities
        ↓
AI-Generated Solution Ideas
        ↓
Technology Suggestions
        ↓
Feasibility & Impact
        ↓
Project Concept

## Key Features

### 1. Problem Submission

Users can enter a problem they have observed in the real world.

### 2. AI-Based Problem Analysis

AI analyzes the submitted problem and helps users understand its important aspects.

### 3. Root Cause Identification

The platform helps identify possible reasons behind the problem.

### 4. Innovation Opportunity Generation

Instead of directly jumping to a solution, the system identifies areas where innovation may be possible.

### 5. Solution Idea Generation

AI generates possible solution concepts based on the identified problem and opportunity.

### 6. Technology Recommendations

The platform can suggest technologies that may be suitable for developing the proposed solution.

### 7. Feasibility Analysis

The generated ideas can be evaluated based on factors such as:

- Technical feasibility
- Cost
- Complexity
- Required resources
- Scalability

### 8. Impact Analysis

The platform can help estimate the potential social, educational, environmental, or business impact of a solution.

### 9. Project Idea Generation

A selected innovation opportunity can be converted into a structured project idea that students or developers can use as a starting point.

## Target Users

ProblemBridge AI can be useful for:

- Students
- Developers
- Entrepreneurs
- Researchers
- Innovators
- Startups
- Educational institutions
- Organizations looking for innovative solutions

## Example

### Input

> "Students in rural areas have difficulty accessing quality learning resources."

### Problem Analysis

The platform identifies possible causes such as:

- Limited internet connectivity
- Lack of digital resources
- Limited access to teachers
- Cost of educational resources

### Innovation Opportunity

Create an accessible learning system designed for environments with limited connectivity.

### Possible Solution

An AI-assisted learning platform that provides educational content and personalized guidance with offline or low-bandwidth support.

### Possible Technologies

- Web technologies
- Artificial Intelligence
- Database
- Cloud services
- Mobile technologies

The final output can then become a starting point for developing a real project.

## Technology Stack

The platform is built as a complete full-stack web application:

- **Frontend**: HTML5, CSS3, Vanilla JavaScript SPA, Web Speech API (English, Telugu, Hindi voice recognition)
- **Backend / API**: Node.js, Express.js, RESTful Architecture
- **Database**:
  - Zero-config built-in database (`node:sqlite`) for immediate, hassle-free local execution
  - Configurable MongoDB support via `MONGODB_URI` in `.env`
- **Authentication**: JWT (JSON Web Tokens) with `bcryptjs` password hashing and role-based access control
- **AI Processing Engine**: Multi-factor root cause extraction, semantic duplicate detection, priority & urgency scoring (0-100), smart routing, and pluggable Google Gemini API adapter (`GEMINI_API_KEY`)
- **File Uploads**: `multer` storage for problem evidence and solution documentation

## Quick Start & Running Locally

### 1. Prerequisites
- Node.js (v18 or newer recommended, tested on Node v26)
- npm

### 2. Installation
```bash
git clone https://github.com/pranithareddy10/ProblemBridge-AI.git
cd ProblemBridge-AI
npm install
```

### 3. Environment Configuration
Create or modify `.env` (a ready-to-use template is available in `.env.example`):
```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key_here

# Optional: MongoDB connection string (leave blank to use built-in zero-config database)
# MONGODB_URI=mongodb://localhost:27017/problembridge

# Optional: Google Gemini API Key for external LLM generation (local AI NLP fallback runs automatically if blank)
# GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Seed Initial Data
Populate realistic community problems, innovation challenges, demo accounts, and solution proposals:
```bash
npm run seed
```

### 5. Start the Application
```bash
# Production start
npm start

# Development mode (with live reload)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser.

### 6. Run Automated Tests
```bash
npm test
```

---

## Default Demo Credentials

The database comes pre-seeded with accounts for testing every role:

| Role | Email | Password |
|---|---|---|
| **Citizen** | `citizen@problembridge.test` | `password123` |
| **Student / Innovator** | `innovator@problembridge.test` | `password123` |
| **Authority / Organization** | `authority@ghmc.gov.in` | `password123` |
| **Admin / Reviewer** | `admin@problembridge.test` | `password123` |

---

## REST API Reference

### 🔐 Authentication (`/api/auth`)
- `POST /api/auth/register` - Create account with role (`Citizen`, `Student / Innovator`, `Authority / Organization`, `Admin / Reviewer`).
- `POST /api/auth/login` - Authenticate user and receive JWT token.
- `GET /api/auth/me` - Fetch authenticated user profile.

### 📢 Problems & AI Analysis (`/api/problems`)
- `POST /api/problems/analyze` - Real-time AI preview: extracts root causes, checks duplicates, calculates urgency score, and determines smart routing.
- `POST /api/problems` - Submit problem report with optional image/video evidence file.
- `GET /api/problems` - List reported problems (supports `?category=`, `?route=`, `?search=`).
- `GET /api/problems/:id` - Fetch problem details with AI breakdown and authority status.
- `POST /api/problems/:id/support` - Support an existing problem to avoid duplicate reports.
- `PATCH /api/problems/:id/authority-status` - Update municipal resolution workflow status (`Authority Reviewing`, `Work Assigned`, `Resolution in Progress`, `Resolved`).
- `POST /api/problems/:id/verify` - Citizen verification loop (`yes` = Citizen Verified Resolved / `no` = Reopened).

### 💡 Innovation Challenges (`/api/challenges`)
- `GET /api/challenges` - Browse open challenges with category and search filters.
- `GET /api/challenges/:id` - Challenge brief with required skills and submitted solutions.
- `POST /api/challenges` - Create a new challenge.
- `POST /api/challenges/:id/watch` - Save/bookmark challenge to innovator workspace.

### 🚀 Solutions & Projects (`/api/solutions`)
- `POST /api/solutions` - Submit a solution proposal or complete project with live website URL, source code, and demo link.
- `GET /api/solutions` - List submitted solutions.
- `GET /api/solutions/:id` - View solution details, verified resources, and progress timeline.
- `PATCH /api/solutions/:id/status` - Update lifecycle progress (`Proposed [10%]`, `In Development [30%]`, `Testing [50%]`, `Ready for Review [70%]`, `Implemented [90%]`, `Problem Solved [100%]`).

### 📊 Platform Analytics (`/api/stats`)
- `GET /api/stats` - Live platform metrics (problems reported, solved, active challenges, innovators, and smart routing breakdown percentages).

### 🩺 System Health (`/api/health`)
- `GET /api/health` - Server health status and uptime.