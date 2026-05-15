"""Post a Playwright failure-report comment on a pull request."""

import sys

from github_helpers import post

if len(sys.argv) < 4:
    print("Error, not enough arguments given")
    print(
        "Usage: github_add_pr_comment.py <BUILD_NUMBER> "
        "<PULL_REQUEST_NUMBER> <GIT_COMMIT_SHA>"
    )
    sys.exit(1)
build_number = sys.argv[1]
pull_request_number = sys.argv[2].replace("pr-", "")
commit_sha = sys.argv[3]

report_url = (
    "https://earsketch-cicd.s3.us-east-1.amazonaws.com/playwright-reports/"
    f"playwright-report-build-{build_number}/index.html"
)
body = f"### Playwright failure report for commit <sub>{commit_sha[:7]}</sub>\r\n{report_url}"

post(f"issues/{pull_request_number}/comments", {"body": body})
