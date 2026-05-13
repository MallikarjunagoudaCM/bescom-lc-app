# BESCOM Employee Transfer Management System

Full-stack web application for transparent, merit-based Group C & D employee transfers across BESCOM organisational units.

## Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Frontend  | React 18, React Router 6, Axios   |
| Backend   | Node.js 18, Express 4, JWT Auth   |
| Database  | MongoDB Atlas (Mongoose ODM)      |
| Hosting   | Azure App Service (Free F1 tier)  |

## Features

- **Employee portal** — register, submit transfer requests with up to 3 priority preferences, track application status with full timeline
- **Merit-based ranking** — auto-generated merit list scored on service years (50%), joining date seniority (30%), date of birth (20%)
- **Direct vacancy submission** — each office unit submits its own vacancies directly to the system (no cascading)
- **HR approval workflow** — merit list review, priority-matched approval, waitlist/reject with notes
- **Role-based access** — employee, office_admin, hr_corporate
- **Transfer cycle management** — create cycles, advance through phases, generate merit lists

## Quick Start

### 1. Clone and configure

```bash
git clone <your-repo>
cd bescom-transfer

# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your MongoDB URI and JWT_SECRET

# Frontend
cp frontend/.env.example frontend/.env
```

### 2. Run backend

```bash
cd backend
npm install
npm run seed       # creates HR admin + sample data
npm run dev        # starts on http://localhost:5000
```

### 3. Run frontend

```bash
cd frontend
npm install
npm start          # starts on http://localhost:3000
```

### 4. Login credentials (after seed)

| Role          | Employee ID | Password        |
|---------------|-------------|-----------------|
| HR Admin      | HR0001      | BescomHR@2025   |
| Office Admin  | OA0001      | Office@2025     |
| Sample Emp.   | EMP0001     | Employee@2025   |

## Project Structure

```
bescom-transfer/
├── .github/workflows/          # GitHub Actions CI/CD
│   ├── deploy-backend.yml
│   └── deploy-frontend.yml
│
├── backend/
│   ├── src/
│   │   ├── server.js           # Entry point
│   │   ├── controllers/        # Business logic
│   │   │   ├── authController.js
│   │   │   ├── hrController.js       # Merit generation, approvals
│   │   │   ├── transferController.js # Application submission & tracking
│   │   │   └── vacancyController.js  # Vacancy management
│   │   ├── models/
│   │   │   ├── User.js               # Employee, HR, Office Admin
│   │   │   ├── TransferApplication.js # Applications + merit scores
│   │   │   ├── TransferCycle.js       # Annual transfer cycles
│   │   │   └── Vacancy.js             # Per-unit vacancy entries
│   │   ├── routes/             # REST API routes
│   │   │   ├── auth.js         # POST /register, POST /login, GET /me
│   │   │   ├── transfer.js     # POST /apply, GET /my-applications
│   │   │   ├── vacancy.js      # POST / (submit), GET / (list)
│   │   │   ├── hr.js           # Cycles, merit, approvals
│   │   │   ├── employee.js     # Profile management
│   │   │   └── admin.js        # User management, hierarchy
│   │   ├── middleware/
│   │   │   └── auth.js         # JWT protect + role authorize
│   │   └── utils/
│   │       ├── masterData.js   # BESCOM hierarchy (Zone→Circle→Division→Section)
│   │       ├── validateEnv.js  # Startup env validation
│   │       └── seed.js         # Database seeding script
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js              # Routes + role-based protection
│   │   ├── context/
│   │   │   └── AuthContext.js  # Global auth state (JWT, user)
│   │   ├── services/
│   │   │   └── api.js          # Axios instance + all API calls
│   │   ├── utils/
│   │   │   └── hierarchy.js    # BESCOM org hierarchy for dropdowns
│   │   ├── components/
│   │   │   ├── common/         # Button, Input, Select, Card, Badge
│   │   │   └── layout/         # Navbar, Layout, ProtectedRoute
│   │   └── pages/
│   │       ├── auth/           # Login, Register (2-step)
│   │       ├── employee/       # Dashboard, ApplyTransfer, MyApplications,
│   │       │                   # ApplicationDetail, Profile
│   │       ├── hr/             # HRDashboard, CycleManager, MeritList,
│   │       │                   # VacanciesView
│   │       ├── admin/          # UserManagement
│   │       └── office/         # OfficeDashboard (vacancy submission)
│   ├── server.js               # Static file server for Azure deployment
│   ├── .env.example
│   └── package.json
│
├── AZURE_DEPLOYMENT.md         # Full Azure deployment guide
└── README.md
```

## API Reference

### Auth
| Method | Endpoint                  | Access  | Description             |
|--------|---------------------------|---------|-------------------------|
| POST   | /api/auth/register        | Public  | Register new employee   |
| POST   | /api/auth/login           | Public  | Login, returns JWT      |
| GET    | /api/auth/me              | Any     | Get current user        |
| PUT    | /api/auth/change-password | Any     | Change password         |

### Transfer
| Method | Endpoint                       | Access   | Description              |
|--------|--------------------------------|----------|--------------------------|
| POST   | /api/transfer/apply            | Employee | Submit application        |
| GET    | /api/transfer/my-applications  | Employee | List own applications     |
| GET    | /api/transfer/active-cycle     | Any      | Current active cycle      |
| GET    | /api/transfer/open-cycles      | Any      | Cycles accepting apps     |
| GET    | /api/transfer/:id              | Emp/HR   | Application detail        |

### HR
| Method | Endpoint                              | Access      | Description           |
|--------|---------------------------------------|-------------|-----------------------|
| GET    | /api/hr/dashboard                     | hr_corporate | Stats & summary       |
| POST   | /api/hr/cycles                        | hr_corporate | Create cycle          |
| GET    | /api/hr/cycles                        | hr_corporate | List all cycles       |
| PUT    | /api/hr/cycles/:id/status             | hr_corporate | Advance cycle phase   |
| POST   | /api/hr/cycles/:cycleId/generate-merit| hr_corporate | Run merit algorithm   |
| GET    | /api/hr/merit-list/:cycleId           | hr_corporate | Paginated merit list  |
| PUT    | /api/hr/applications/:id/process      | hr_corporate | Approve/waitlist/reject|

### Vacancy
| Method | Endpoint       | Access             | Description           |
|--------|----------------|--------------------|-----------------------|
| POST   | /api/vacancy   | office_admin, HR   | Submit vacancy        |
| GET    | /api/vacancy/my| office_admin, HR   | Own submissions       |
| GET    | /api/vacancy   | hr_corporate       | All vacancies         |
| PUT    | /api/vacancy/:id| office_admin, HR  | Update vacancy        |

### Admin
| Method | Endpoint                       | Access      | Description         |
|--------|--------------------------------|-------------|---------------------|
| POST   | /api/admin/create-officer      | hr_corporate | Create HR/office user|
| GET    | /api/admin/users               | hr_corporate | List all users       |
| PUT    | /api/admin/users/:id/toggle-active | hr_corporate | Activate/deactivate |
| GET    | /api/admin/hierarchy           | Public       | Org hierarchy data  |

## Deployment

See **AZURE_DEPLOYMENT.md** for the complete step-by-step Azure guide including:
- Resource group and App Service plan creation
- Environment variable configuration
- ZIP deploy for both frontend and backend
- GitHub Actions CI/CD setup
- First-run seeding instructions
- Troubleshooting guide
