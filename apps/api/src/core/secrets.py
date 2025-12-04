import os
from functools import lru_cache
from typing import Optional

from google.api_core.exceptions import GoogleAPIError
from google.auth.exceptions import DefaultCredentialsError
from google.cloud import secretmanager


class SecretResolutionError(RuntimeError):
    """Raised when a secret cannot be resolved."""


@lru_cache(maxsize=None)
def _secret_client() -> secretmanager.SecretManagerServiceClient:
    """Lazily construct the Secret Manager client so local dev stays fast."""
    return secretmanager.SecretManagerServiceClient()


def resolve_secret(env_key: str, *, secret_env_key: Optional[str] = None) -> str:
    """
    Return the value for `env_key`.

    1. Use the direct environment variable if defined.
    2. Otherwise look for a Secret Manager resource identifier in
       `<env_key>_SECRET` (or an explicitly provided `secret_env_key`) and fetch it.
    3. Cache the fetched value back into `os.environ` for downstream callers.
    """

    direct_value = os.getenv(env_key)
    if direct_value:
        return direct_value

    secret_name = os.getenv(secret_env_key or f"{env_key}_SECRET")
    if not secret_name:
        raise SecretResolutionError(
            f"Missing {env_key} and no secret identifier "
            f"found in {secret_env_key or f'{env_key}_SECRET'}."
        )

    try:
        response = _secret_client().access_secret_version(name=secret_name)
    except (GoogleAPIError, DefaultCredentialsError) as exc:
        raise SecretResolutionError(
            f"Unable to fetch secret for {env_key} from {secret_name}: {exc}"
        ) from exc

    value = response.payload.data.decode("utf-8").strip()
    os.environ[env_key] = value
    return value
