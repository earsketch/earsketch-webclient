import base64
import json
import sys
from urllib.request import Request, urlopen

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

environment = "review-" + pull_request_number
environment_url = "https://earsketch-test.ersktch.gatech.edu/pr-" + pull_request_number

auth = base64.b64encode(f"{github_user}:{github_token}".encode()).decode()
common_headers = {
    "Accept": "application/vnd.github.v3+json",
    "Authorization": f"Basic {auth}",
    "Content-Type": "application/json",
}


def post(endpoint, body):
    req = Request(
        url + endpoint,
        data=json.dumps(body).encode(),
        headers=common_headers,
        method="POST",
    )
    with urlopen(req, timeout=30) as resp:
        return json.load(resp)


new_deployment = post(
    "deployments",
    {
        "ref": git_commit_sha,
        "auto_merge": False,
        "required_contexts": [],
        "environment": environment,
    },
)
new_deployment_id = new_deployment["id"]

post(
    "deployments/{}/statuses".format(new_deployment_id),
    {
        "state": "success",
        "environment": environment,
        "environment_url": environment_url,
    },
)
