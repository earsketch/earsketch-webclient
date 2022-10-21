import sys

import requests
from requests.auth import HTTPBasicAuth

if len(sys.argv) < 6:
    print("Error, not enough arguments given")
    print(
        "Usage: github_create_release.py <GIT_USER> <GITHUB_TOKEN> <BUILD_NUMBER> <PULL_REQUEST_NUMBER> "
        "<GIT_COMMIT_SHA> "
    )
    exit(1)
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

body = (
    "### Cypress failure report for commit "
    + "<sub>{}</sub>\r\n".format(commit_sha[:7])
    + "https://earsketch-cicd.s3.us-east-1.amazonaws.com/cypress-reports/cypress-report-build-"
    + build_number
    + "/index.html"
)

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
