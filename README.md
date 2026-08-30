# Symbosium - CYBERPUNK'26 Website

Split-stack event platform built from the planning brief:

- `frontend/`: Next.js + TypeScript public website and admin UI shell
- `backend/`: Django REST Framework API, registration system, and custom admin auth

## Local development

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

## Environment files

- Copy `frontend/.env.example` to `frontend/.env.local`
- Copy `backend/.env.example` to `backend/.env`
- Set `ADMIN_NOTIFICATION_EMAIL` in `backend/.env` to the mailbox that should receive registration alerts

The project is config-driven, so dates, event rules, fees, and contact details are centralized instead of scattered across pages.

## Backend on Render

The backend folder includes [backend/render.yaml](./backend/render.yaml) and [backend/build.sh](./backend/build.sh).

Render service settings:

1. Create a new Render web service from this repository.
2. Set the Render root directory to `backend`.
3. Set these environment variables in Render:
   - `DJANGO_SETTINGS_MODULE=config.settings.prod`
   - `DJANGO_SECRET_KEY=<strong random value>`
   - `DATABASE_URL=<your Supabase Postgres pooler URL>`
   - `DJANGO_ALLOWED_HOSTS=<your-render-host>.onrender.com`
   - `DJANGO_CORS_ALLOWED_ORIGINS=https://<your-netlify-site>.netlify.app`
   - `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_ADMIN_TEMPLATE_ID`
   - `EMAILJS_PUBLIC_KEY`, `EMAILJS_PRIVATE_KEY`
   - Optional fallback: `EMAILJS_FALLBACK_SERVICE_ID`, `EMAILJS_FALLBACK_TEMPLATE_ID`, `EMAILJS_FALLBACK_ADMIN_TEMPLATE_ID`
   - Optional fallback keys: `EMAILJS_FALLBACK_PUBLIC_KEY`, `EMAILJS_FALLBACK_PRIVATE_KEY`
   - Rejection email: `EMAILJS_REJECTION_SERVICE_ID`, `EMAILJS_REJECTION_TEMPLATE_ID`
   - Optional rejection keys/fallback: `EMAILJS_REJECTION_PUBLIC_KEY`, `EMAILJS_REJECTION_PRIVATE_KEY`, `EMAILJS_FALLBACK_REJECTION_SERVICE_ID`, `EMAILJS_FALLBACK_REJECTION_TEMPLATE_ID`, `EMAILJS_FALLBACK_REJECTION_PUBLIC_KEY`, `EMAILJS_FALLBACK_REJECTION_PRIVATE_KEY`
   - `ADMIN_NOTIFICATION_EMAIL`
   - `BACKBLAZE_B2_ENABLED=true`
   - `BACKBLAZE_B2_BUCKET_NAME`, `BACKBLAZE_B2_KEY_ID`, `BACKBLAZE_B2_APPLICATION_KEY`
   - `BACKBLAZE_B2_ENDPOINT_URL`, `BACKBLAZE_B2_REGION`
4. Render will run `bash build.sh`, which installs dependencies, collects static files, and applies migrations.
5. The app starts with `gunicorn config.wsgi:application`.

Production Django settings now include:

- WhiteNoise static serving
- secure proxy SSL handling for Render
- Supabase PostgreSQL via `DATABASE_URL`
- production cookie and HSTS settings through `config.settings.prod`

## Frontend on Netlify

The frontend folder includes [frontend/netlify.toml](./frontend/netlify.toml).

Netlify settings:

1. Import this repository into Netlify.
2. Netlify should use:
   - base directory: `frontend`
   - build command: `npm run build`
3. Set these environment variables in Netlify:
   - `NODE_VERSION=22`
   - `NEXT_PUBLIC_API_BASE_URL=https://<your-render-host>.onrender.com`
   - `NEXT_PUBLIC_EVENT_DATE=2026-09-11T09:30:00+05:30`
4. Deploy. The Next.js frontend will keep using local Django automatically when this env var is not set, so local development still works.

## Notes

- Local backend remains available through `config.settings.dev`.
- Local frontend still defaults to `http://127.0.0.1:8000`.
- Create the first production organizer account after deployment with `python manage.py create_admin_user --email <admin-email> --password <strong-password> --name "<name>"`. The app uses the custom `AdminUser` login flow, not Django's default admin login.
