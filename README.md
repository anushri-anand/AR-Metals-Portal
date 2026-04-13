Work in progress

# AR Metals Operations Portal

This repository is a work-in-progress operations portal for AR Metals. It currently contains a Django REST backend and a Next.js frontend for managing employee records, procurement, production, estimation, and costing workflows.

## Current Status

The application structure and main data-entry workflows are in place, but reporting, final UI polish, permissions hardening, and some backend save flows are still being completed.

## Tech Stack

- Backend: Django, Django REST Framework, PostgreSQL, JWT authentication
- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Database: PostgreSQL

## Modules Completed So Far

- Authentication and role-aware navigation
- Employee personal details entry, update, and view
- Employee time sheet entry, annual leave, and time sheet view
- Employee salary section with payroll and salary advance tracking
- Procurement vendor data entry
- Procurement purchase order flows for project, asset, and inventory
- Procurement inventory issuance flow
- Procurement payment entry and update with phase tracking
- Production project details entry, update, and view
- Production time allocation entry
- Production work completion and delivery entry
- Estimation client data entry and view
- Estimation tender log entry and view
- Estimation master list entry and view
- Estimation costing with BOQ import, revision number, costing details, and BOQ export
- Horizontally scrollable tables with frozen heading rows

## Estimation Notes

- Tender numbers are entered in `Estimation -> Tender Log`.
- BOQ/costing work happens in `Estimation -> Costing`.
- Costing supports importing Excel/CSV BOQ files with these columns: `SN`, `Client's BOQ`, `Item Description`, `Qty`, and `Unit`.
- BOQ export creates an Excel-openable file with `SN`, `Client's BOQ`, `Item Description`, `Qty`, `Unit`, `Selling Rate`, and `Selling Amount`.
- Master list rates can be edited from `Estimation -> Master List -> View`.

## Local Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install django djangorestframework django-cors-headers djangorestframework-simplejwt psycopg python-dotenv
python manage.py migrate
python manage.py runserver
```

Create `backend/.env` with PostgreSQL settings:

```env
SECRET_KEY=your-secret-key
DEBUG=True
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_HOST=localhost
DB_PORT=5432
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open the frontend at:

```text
http://localhost:3000
```

The backend expects requests from `http://localhost:3000`.

## Useful Commands

Run backend checks:

```bash
cd backend
source venv/bin/activate
python manage.py check
python manage.py migrate
```

Run frontend checks:

```bash
cd frontend
npm run lint
npx tsc --noEmit --incremental false
```

## Important Notes

- This is not final production-ready software yet.
- The database should be migrated after pulling new backend changes.
- A pinned backend dependency file, such as `requirements.txt`, should be added before deployment.
- Reports/views across all modules are planned as a next major step.
- Sample data has been removed from the local database.
