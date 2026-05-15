"""Post a Playwright failure-report comment on a pull request."""

import base64
import json
import sys
from urllib.error import HTTPError
from urllib.request import Request, urlopen

if len(sys.argv) < 6:
    print("Error, not enough arguments given")
    print(
        "Usage: github_add_pr_comment.py <GIT_USER> <GITHUB_TOKEN> "
        "<BUILD_NUMBER> <PULL_REQUEST_NUMBER> <GIT_COMMIT_SHA>"
    )
    sys.exit(1)
github_user = sys.argv[1]
github_token = sys.argv[2]
build_number = sys.argv[3]
pull_request_number = sys.argv[4].replace("pr-", "")
commit_sha = sys.argv[5]

url = (
    "https://api.github.com/repos/GTCMT/earsketch-webclient/issues/"
    + pull_request_number
    + "/comments"
)
report_url = (
    "https://earsketch-cicd.s3.us-east-1.amazonaws.com/playwright-reports/"
    f"playwright-report-build-{build_number}/index.html"
)
body = f"### Playwright failure report for commit <sub>{commit_sha[:7]}</sub>\r\n{report_url}"

auth = base64.b64encode(f"{github_user}:{github_token}".encode()).decode()
req = Request(
    url,
    data=json.dumps({"body": body}).encode(),
    headers={
        "Accept": "application/vnd.github+json",
        "Authorization": f"Basic {auth}",
        "Content-Type": "application/json",
    },
    method="POST",
)
try:
    with urlopen(req, timeout=30) as resp:
        json.load(resp)
except HTTPError as e:
    message = json.load(e).get("message", str(e))
    print("Create Release HTTP Error Exception message: " + message)
    sys.exit()
