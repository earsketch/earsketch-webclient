"""Post a Playwright failure-report comment on a pull request."""
import sys

import requests
from requests.auth import HTTPBasicAuth

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
)
headers = {"Accept": "application/vnd.github+json"}
auth = HTTPBasicAuth(github_user, github_token)

report_url = (
    "https://earsketch-cicd.s3.us-east-1.amazonaws.com/playwright-reports/"
    f"playwright-report-build-{build_number}/index.html"
)
body = f"### Playwright failure report for commit <sub>{commit_sha[:7]}</sub>\r\n{report_url}"

createCommentParams = {
    "body": body,
}
r = requests.post(
    url + "/comments", headers=headers, auth=auth, json=createCommentParams
)
new_comment = r.json()
try:
    r.raise_for_status()
except requests.exceptions.HTTPError:
    print("Create Release HTTP Error Exception message: " + new_comment["message"])
    sys.exit()
