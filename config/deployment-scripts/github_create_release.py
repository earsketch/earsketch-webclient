"""Create a GitHub Release tagged with the new version number."""

import sys

from github_helpers import post

if len(sys.argv) < 3:
    print("Error, not enough arguments given")
    print("Usage: github_create_release.py <GIT_COMMIT_SHA> <NEW_VERSION_NUMBER>")
    sys.exit(1)
git_commit_sha = sys.argv[1]
new_version_number = sys.argv[2]

new_release = post(
    "releases",
    {
        "target_commitish": git_commit_sha,
        "tag_name": "v" + new_version_number,
    },
)

print(f"New GitHub Release id: {new_release['id']}")
