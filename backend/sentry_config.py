# Install: pip install sentry-sdk[fastapi]
# Add to backend/requirements.txt: sentry-sdk[fastapi]>=2.0.0
#
# OBS-02: Sentry SDK integrated in Python backend
import os
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.logging import LoggingIntegration


def init_sentry():
    dsn = os.environ.get("SENTRY_DSN")
    if not dsn:
        return
    sentry_sdk.init(
        dsn=dsn,
        integrations=[
            FastApiIntegration(),
            LoggingIntegration(level=None, event_level=None),
        ],
        traces_sample_rate=0.1,
        environment=os.environ.get("ENVIRONMENT", "production"),
    )
