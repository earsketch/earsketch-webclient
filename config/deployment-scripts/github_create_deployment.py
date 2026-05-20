"""Create a GitHub Deployment + DeploymentStatus for a PR review app."""

import sys

from github_helpers import post

if len(sys.argv) < 3:
    print("Error, not enough arguments given")
    print("Usage: github_create_deployment.py <GIT_COMMIT_SHA> <PULL_REQUEST_NUMBER>")
    sys.exit(1)
git_commit_sha = sys.argv[1]
pull_request_number = sys.argv[2].replace("pr-", "")

environment = "review-" + pull_request_number
environment_url = "https://earsketch-test.ersktch.gatech.edu/pr-" + pull_request_number

new_deployment = post(
    "deployments",
    {
        "ref": git_commit_sha,
        "auto_merge": False,
        "required_contexts": [],
        "environment": environment,
    },
)

post(
    f"deployments/{new_deployment['id']}/statuses",
    {
        "state": "success",
        "environment": environment,
        "environment_url": environment_url,
    },
)
