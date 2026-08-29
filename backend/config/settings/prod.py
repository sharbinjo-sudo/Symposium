import os

from .base import *  # noqa: F403

DEBUG = False
if not BACKBLAZE_B2_ENABLED:  # noqa: F405
  raise ImproperlyConfigured("BACKBLAZE_B2_ENABLED must be true in production so uploads do not use local disk.")  # noqa: F405
SECURE_SSL_REDIRECT = os.getenv("DJANGO_SECURE_SSL_REDIRECT", "true").lower() == "true"
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = int(os.getenv("DJANGO_SECURE_HSTS_SECONDS", "31536000"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
SECURE_CROSS_ORIGIN_OPENER_POLICY = "same-origin"
SECURE_CROSS_ORIGIN_EMBEDDER_POLICY = None
X_FRAME_OPTIONS = "DENY"
