from .base import *

DEBUG = True

# Allow local loopback hosts even if DJANGO_ALLOWED_HOSTS is restricted in .env.
ALLOWED_HOSTS = list(dict.fromkeys([*ALLOWED_HOSTS, "127.0.0.1", "localhost", "0.0.0.0"]))
