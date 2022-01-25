import sys

import requests
from requests.auth import HTTPBasicAuth

if len(sys.argv) < 5:
    print("Error, no arguments given")
    print(
        "Usage: github_create_release.py <GIT_USER> <GITHUB_TOKEN> <GIT_COMMIT_SHA> <PULL_REQUEST_NUMBER>"
    )
    exit(1)
github_user = sys.argv[1]
github_token = sys.argv[2]
git_commit_sha = sys.argv[3]
pull_request_number = sys.argv[4].replace("pr-", "")

url = "https://api.github.com/repos/GTCMT/earsketch-webclient/"
headers = {"Accept": "application/vnd.github.v3+json"}
auth = HTTPBasicAuth(github_user, github_token)

environment = "review-" + pull_request_number
environment_url = "https://earsketch-test.ersktch.gatech.edu/pr-" + pull_request_number

createDeploymentParams = {
    "ref": git_commit_sha,
    "auto_merge": False,
    "required_contexts": [],
    "environment": environment,
}
r = requests.post(
    url + "deployments", headers=headers, auth=auth, json=createDeploymentParams
)
new_deployment = r.json()
new_deployment_id = new_deployment["id"]

createDeploymentStatusParams = {
    "state": "success",
    "environment": environment,
    "environment_url": environment_url,
}

r = requests.post(
    "{}deployments/{}/statuses".format(url, new_deployment_id),
    headers=headers,
    auth=auth,
    json=createDeploymentStatusParams,
)
new_deployment_status = r.json()
