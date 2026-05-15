import base64
import json
import sys
from urllib.error import HTTPError
from urllib.request import Request, urlopen

if len(sys.argv) < 5:
    print("Error, no arguments given")
    print("Usage: github_create_release.py <GIT_USER> <GITHUB_TOKEN> <GIT_COMMIT_SHA> <NEW_VERSION_NUMBER>")
    exit(1)
github_user = sys.argv[1]
github_token = sys.argv[2]
git_commit_sha = sys.argv[3]
new_version_number = sys.argv[4]

url = "https://api.github.com/repos/GTCMT/earsketch-webclient/releases"

auth = base64.b64encode(f"{github_user}:{github_token}".encode()).decode()
req = Request(
    url,
    data=json.dumps({
        "target_commitish": git_commit_sha,
        "tag_name": "v" + new_version_number,
    }).encode(),
    headers={
        "Accept": "application/vnd.github.v3+json",
        "Authorization": f"Basic {auth}",
        "Content-Type": "application/json",
    },
    method="POST",
)
try:
    with urlopen(req, timeout=30) as resp:
        new_release = json.load(resp)
except HTTPError as e:
    message = json.load(e).get("message", str(e))
    print("Create Release HTTP Error Exception message: " + message)
    sys.exit()

print("New GitHub Releaes id: {}".format(new_release["id"]))
