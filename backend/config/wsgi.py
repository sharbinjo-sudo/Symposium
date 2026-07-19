import os

from .env import load_local_env
from django.core.wsgi import get_wsgi_application

load_local_env()
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

application = get_wsgi_application()
