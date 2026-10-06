import os
import sys

# Ensure project root directory is accessible in sys.path
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from app import app

app.debug = False

# WSGI handler for Vercel Serverless Function
def handler(request, response):
    return app(request, response)
