import sys
import json
import requests
from requests.auth import HTTPBasicAuth

if len(sys.argv) < 5:
    print("Error, no arguments given")
    print("Usage: github_create_release.py <GIT_USER> <GITHUB_TOKEN> <GIT_COMMIT_SHA> <NEW_VERSION_NUMBER>")
    exit(1)
github_user = sys.argv[1]
github_token = sys.argv[2]
git_commit_sha = sys.argv[3]
new_version_number = sys.argv[4]

url = "https://api.github.com/repos/GTCMT/earsketch-webclient/"
headers = {'Accept': 'application/vnd.github.v3+json'}
auth = HTTPBasicAuth(github_user,github_token)

createReleaseParams = {"target_commitish":git_commit_sha,
                          "tag_name": "v"+new_version_number
                          }
r = requests.post(url + "releases", headers=headers, auth=auth, json=createReleaseParams)
newRelease = r.json()
try:
    r.raise_for_status()
except requests.exceptions.HTTPError:
    print("Create Release HTTP Error Exception message: " + newRelease["message"])
    sys.exit()

print('New GitHub Releaes id: {}'.format(newRelease["id"]))

