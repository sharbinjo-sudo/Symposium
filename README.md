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

The repo includes a root [render.yaml](./render.yaml) blueprint and a backend build script at [backend/build.sh](./backend/build.sh).

Render service settings:

1. Create a new Render web service from this repository.
2. Let Render detect the root `render.yaml`, or point the service at `backend/`.
3. Set these environment variables in Render:
   - `DJANGO_SETTINGS_MODULE=config.settings.prod`
   - `DJANGO_SECRET_KEY=<strong random value>`
   - `DATABASE_URL=<your Neon PostgreSQL URL>`
   - `DJANGO_ALLOWED_HOSTS=<your-render-host>.onrender.com`
   - `DJANGO_CORS_ALLOWED_ORIGINS=https://<your-netlify-site>.netlify.app`
   - `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_ADMIN_TEMPLATE_ID`
   - `EMAILJS_PUBLIC_KEY`, `EMAILJS_PRIVATE_KEY`
   - `ADMIN_NOTIFICATION_EMAIL`
   - `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`
4. Render will run `bash build.sh`, which installs dependencies, collects static files, and applies migrations.
5. The app starts with `gunicorn config.wsgi:application`.

Production Django settings now include:

- WhiteNoise static serving
- secure proxy SSL handling for Render
- PostgreSQL via `DATABASE_URL`
- production cookie and HSTS settings through `config.settings.prod`

## Frontend on Netlify

The repo includes a root [netlify.toml](./netlify.toml) configured for the `frontend/` app.

Netlify settings:

1. Import this repository into Netlify.
2. Netlify should use:
   - base directory: `frontend`
   - build command: `npm run build`
3. Set these environment variables in Netlify:
   - `NEXT_PUBLIC_API_BASE_URL=https://<your-render-host>.onrender.com`
   - `NEXT_PUBLIC_EVENT_DATE=2026-09-12T09:00:00+05:30`
4. Deploy. The Next.js frontend will keep using local Django automatically when this env var is not set, so local development still works.

## Notes

- Local backend remains available through `config.settings.dev`.
- Local frontend still defaults to `http://127.0.0.1:8000`.
- If you want a first production admin account, create it after deployment with `python manage.py createsuperuser` or your custom admin flow.
