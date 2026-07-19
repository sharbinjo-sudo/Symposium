import os

from .env import load_local_env
from django.core.asgi import get_asgi_application

load_local_env()
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

application = get_asgi_application()
