"""Shared GitHub API helper for deployment scripts.

Reads `GITHUB_USER` and `GITHUB_TOKEN` from the environment (set by the
CodeBuild secrets-manager block) and exposes a single `post()` for
posting JSON bodies to the earsketch-webclient repo.
"""

import base64
import json
import os
import sys
from urllib.error import HTTPError
from urllib.request import Request, urlopen

REPO_URL = "https://api.github.com/repos/earsketch/earsketch-webclient/"

_auth = base64.b64encode(
    f"{os.environ['GITHUB_USER']}:{os.environ['GITHUB_TOKEN']}".encode()
).decode()
_headers = {
    "Accept": "application/vnd.github+json",
    "Authorization": f"Basic {_auth}",
    "Content-Type": "application/json",
}


def post(endpoint, body):
    """POST a JSON body to a GitHub API endpoint and return the parsed response."""
    req = Request(
        REPO_URL + endpoint,
        data=json.dumps(body).encode(),
        headers=_headers,
        method="POST",
    )
    try:
        with urlopen(req, timeout=30) as resp:
            return json.load(resp)
    except HTTPError as e:
        message = json.load(e).get("message", str(e))
        print(f"GitHub API error: {message}")
        sys.exit(1)
