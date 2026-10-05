"""Publish a validated screenshot artifact without checking out or executing PR code."""

import base64
import hashlib
import io
import json
import os
import re
import stat
import struct
import sys
import urllib.error
import urllib.parse
import urllib.request
import zipfile
import zlib
from pathlib import Path

SOURCE = "magurotuna/maguro.dev"
WORKFLOW = ".github/workflows/visual-test.yml"
PAGES = ("home", "about", "blog-post")
VIEWPORTS = ("desktop", "tablet", "mobile", "mobile-small")
FILES = {
    f"{side}/{page}-{viewport}.png"
    for side in ("main", "pr")
    for page in PAGES
    for viewport in VIEWPORTS
}
MAX_IMAGE = 5 * 1024 * 1024
MAX_ARCHIVE = 50 * 1024 * 1024
MARKER = "<!-- visual-screenshots-external:v1 -->"
RUN_MARKER = re.compile(r"<!-- capture-run:(\d+):(\d+) -->")


class Skip(Exception):
    """An obsolete or ineligible run, not a publishing failure."""


class ValidationError(ValueError):
    """A static, safe-to-log explanation of a rejected input."""


class APIError(Exception):
    def __init__(self, status):
        self.status = status
        # Never include response bodies, signed download URLs, or tokens in logs.
        super().__init__(f"GitHub API returned HTTP {status}")


def require(condition, message):
    if not condition:
        raise ValidationError(message)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def bounded_read(response, limit):
    data = response.read(limit + 1)
    require(len(data) <= limit, "Response exceeds the size limit")
    return data


class GitHub:
    def __init__(self, token):
        require(bool(token), "Missing publishing configuration; see docs/visual-screenshots.md")
        self.token = token
        self.opener = urllib.request.build_opener(NoRedirect())

    def open_api(self, path, method="GET", body=None):
        require(path.startswith("/repos/"), "Unexpected API path")
        request = urllib.request.Request(
            "https://api.github.com" + path,
            data=None if body is None else json.dumps(body).encode(),
            method=method,
            headers={
                "Authorization": f"Bearer {self.token}",
                "Accept": "application/vnd.github+json",
                "Content-Type": "application/json",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "maguro-dev-screenshot-publisher",
            },
        )
        return self.opener.open(request, timeout=60)

    def request(self, path, method="GET", body=None):
        try:
            with self.open_api(path, method, body) as response:
                return json.loads(bounded_read(response, 8 * 1024 * 1024))
        except urllib.error.HTTPError as error:
            raise APIError(error.code) from None

    def items(self, path, key=None):
        separator = "&" if "?" in path else "?"
        result = []
        for page in range(1, 21):
            response = self.request(f"{path}{separator}per_page=100&page={page}")
            batch = response[key] if key else response
            result.extend(batch)
            if len(batch) < 100:
                return result
        raise ValidationError("Too many API results; refusing an incomplete provenance check")

    def archive(self, artifact_id):
        # GitHub redirects to signed artifact storage. Do not forward Authorization.
        try:
            with self.open_api(f"/repos/{SOURCE}/actions/artifacts/{artifact_id}/zip") as response:
                return bounded_read(response, MAX_ARCHIVE)
        except urllib.error.HTTPError as error:
            if error.code != 302:
                raise APIError(error.code) from None
            location = error.headers["Location"]
        url = urllib.parse.urlsplit(location)
        require(url.scheme == "https" and bool(url.hostname) and not url.username,
                "Invalid artifact download redirect")
        with self.opener.open(location, timeout=60) as response:
            return bounded_read(response, MAX_ARCHIVE)


def current_capture(api, event):
    """Use GitHub metadata, never an artifact, to choose the PR and run."""
    require(event["repository"]["full_name"] == SOURCE, "Wrong source repository")
    require(event["repository"]["default_branch"] == "main", "Expected main as default branch")
    source_id = event["repository"]["id"]
    trigger = event["workflow_run"]
    require(type(trigger["id"]) is int and trigger["id"] > 0, "Invalid run ID")
    run = api.request(f"/repos/{SOURCE}/actions/runs/{trigger['id']}")
    workflow = api.request(f"/repos/{SOURCE}/actions/workflows/visual-test.yml")
    require(run["id"] == trigger["id"] and run["workflow_id"] == workflow["id"]
            and run["path"] == WORKFLOW and workflow["path"] == WORKFLOW,
            "Unexpected capture workflow")
    require(run["repository"]["id"] == source_id, "Unexpected run repository")
    if (run["event"] != "pull_request" or run["status"] != "completed"
            or run["conclusion"] != "success" or run["run_attempt"] != trigger["run_attempt"]
            or run["head_repository"]["id"] != source_id):
        raise Skip("Capture is incomplete, superseded, or from a fork")
    if len(run["pull_requests"]) != 1:
        raise Skip("Capture must have exactly one GitHub-associated PR")
    number = run["pull_requests"][0]["number"]
    require(type(number) is int and number > 0, "Invalid associated PR")
    pr = api.request(f"/repos/{SOURCE}/pulls/{number}")
    if (pr["state"] != "open" or pr["base"]["ref"] != "main"
            or pr["base"]["repo"]["id"] != source_id
            or pr["head"]["repo"] is None or pr["head"]["repo"]["id"] != source_id
            or pr["head"]["sha"] != run["head_sha"]
            or pr["head"]["ref"] != run["head_branch"]):
        raise Skip("PR is closed, from a fork, retargeted, or has a newer head")
    for sha in (run["head_sha"], pr["base"]["sha"]):
        require(re.fullmatch(r"[0-9a-f]{40}", sha), "Invalid revision")
    query = urllib.parse.urlencode({"event": "pull_request", "head_sha": run["head_sha"]})
    runs = api.items(
        f"/repos/{SOURCE}/actions/workflows/{workflow['id']}/runs?{query}", "workflow_runs"
    )
    if any(
        candidate["head_branch"] == run["head_branch"]
        and candidate["head_repository"]["id"] == source_id
        and (candidate["id"], candidate["run_attempt"]) > (run["id"], run["run_attempt"])
        for candidate in runs
    ):
        # Even a newer pending/failed capture makes this run obsolete.
        raise Skip("A newer screenshot run or attempt exists")
    return {
        "repository": SOURCE,
        "pr": number,
        "head_sha": run["head_sha"],
        "base_sha": pr["base"]["sha"],
        "run_id": run["id"],
        "run_attempt": run["run_attempt"],
    }


def validate_png(data):
    require(data.startswith(b"\x89PNG\r\n\x1a\n"), "Not a PNG")
    position, chunks, compressed = 8, [], bytearray()
    width = height = color = None
    while position < len(data):
        require(position + 12 <= len(data), "Truncated PNG chunk")
        size, kind = struct.unpack(">I4s", data[position:position + 8])
        end = position + 12 + size
        require(end <= len(data), "Invalid PNG chunk length")
        payload = data[position + 8:end - 4]
        checksum = struct.unpack(">I", data[end - 4:end])[0]
        require(zlib.crc32(kind + payload) == checksum, "PNG checksum mismatch")
        if not chunks:
            require(kind == b"IHDR" and size == 13, "Missing PNG header")
            width, height, depth, color, compression, filtering, interlace = struct.unpack(
                ">IIBBBBB", payload
            )
            require(0 < width <= 4096 and 0 < height <= 32768 and width * height <= 20_000_000,
                    "PNG dimensions exceed screenshot limits")
            require(depth == 8 and color in (2, 6) and (compression, filtering, interlace) == (0, 0, 0),
                    "Expected a noninterlaced RGB/RGBA browser screenshot")
        elif kind == b"IHDR":
            raise ValidationError("Duplicate PNG header")
        elif kind == b"IDAT":
            compressed.extend(payload)
        elif kind == b"IEND":
            require(size == 0 and end == len(data), "Trailing data after PNG")
        else:
            require(kind == b"PLTE" or kind[0] & 32, "Unknown critical PNG chunk")
        chunks.append(kind)
        position = end
    require(chunks[-1:] == [b"IEND"] and bool(compressed), "Incomplete PNG")
    row_size = width * (3 if color == 2 else 4) + 1
    expected = row_size * height
    inflater = zlib.decompressobj()
    pixels = inflater.decompress(compressed, expected + 1)
    require(len(pixels) == expected and inflater.eof and not inflater.unused_data,
            "Invalid or oversized PNG pixel data")
    require(all(pixels[offset] <= 4 for offset in range(0, expected, row_size)),
            "Invalid PNG row filter")


def validate_archive(data, capture):
    require(len(data) <= MAX_ARCHIVE, "Artifact is too large")
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        entries = archive.infolist()
        require(len(entries) <= len(FILES) + 3, "Too many archive entries")
        seen, images, total = set(), {}, 0
        for entry in entries:
            name = entry.filename
            require(entry.orig_filename == name and name not in seen, "Ambiguous archive path")
            seen.add(name)
            mode = stat.S_IFMT(entry.external_attr >> 16)
            if entry.is_dir():
                require(name in ("main/", "pr/") and mode in (0, stat.S_IFDIR),
                        "Unexpected archive directory")
                continue
            require(name in FILES | {"metadata.json"} and mode in (0, stat.S_IFREG),
                    "Unexpected path or nonregular archive entry")
            require(not entry.flag_bits & 1 and entry.compress_type in
                    (zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED), "Unsupported archive encoding")
            limit = 4096 if name == "metadata.json" else MAX_IMAGE
            require(0 < entry.file_size <= limit, "Archive entry exceeds size limit")
            total += entry.file_size
            require(total <= MAX_ARCHIVE, "Uncompressed artifact is too large")
            content = archive.read(entry)
            if name == "metadata.json":
                require(json.loads(content) == capture, "Artifact revisions/provenance do not match")
            else:
                validate_png(content)
                images[name] = content
        require(set(images) == FILES and "metadata.json" in seen, "Expected all 24 screenshots and metadata")
        return images


def download_images(api, capture):
    artifacts = api.items(f"/repos/{SOURCE}/actions/runs/{capture['run_id']}/artifacts", "artifacts")
    matching = [a for a in artifacts if a["name"] == f"visual-screenshots-{capture['run_attempt']}"]
    require(len(matching) == 1, "Expected exactly one artifact for this capture attempt")
    artifact = matching[0]
    require(not artifact["expired"] and 0 < artifact["size_in_bytes"] <= MAX_ARCHIVE,
            "Artifact expired or exceeds size limit")
    require(artifact["workflow_run"]["id"] == capture["run_id"]
            and artifact["workflow_run"]["head_sha"] == capture["head_sha"],
            "Artifact belongs to another run or revision")
    data = api.archive(artifact["id"])
    require(artifact.get("digest") == "sha256:" + hashlib.sha256(data).hexdigest(),
            "Artifact SHA256 does not match GitHub metadata")
    return validate_archive(data, capture)


def blob_sha(content):
    return hashlib.sha1(f"blob {len(content)}\0".encode() + content).hexdigest()


def publish_images(api, destination, capture, images):
    require(re.fullmatch(r"[A-Za-z0-9-]+/[A-Za-z0-9_.-]+", destination)
            and destination.lower() != SOURCE.lower(), "Invalid external image repository")
    root = f"/repos/{destination}"
    repository = api.request(root)
    require(repository["visibility"] == "public" and not repository["archived"],
            "Image repository must be public and writable")
    # GitHub's Git Data API needs an initialized repository, even for orphan commits.
    api.request(f"{root}/git/ref/heads/main")
    branch = f"screenshots/pr-{capture['pr']}/run-{capture['run_id']}-{capture['run_attempt']}"
    expected = {name: blob_sha(content) for name, content in images.items()}

    def existing_commit():
        try:
            ref = api.request(f"{root}/git/ref/heads/{branch}")
        except APIError as error:
            if error.status == 404:
                return None
            raise
        sha = ref["object"]["sha"]
        commit = api.request(f"{root}/git/commits/{sha}")
        tree = api.request(f"{root}/git/trees/{commit['tree']['sha']}?recursive=1")
        require(not tree.get("truncated"), "Cannot verify existing image tree")
        files = {}
        for item in tree["tree"]:
            if item["type"] == "tree":
                require(item["path"] in ("main", "pr"), "Unexpected existing image directory")
            else:
                require(item["type"] == "blob" and item["mode"] == "100644",
                        "Unexpected existing image entry")
                files[item["path"]] = item["sha"]
        require(files == expected, "Existing immutable capture has different images")
        return sha

    sha = existing_commit()
    if sha:
        return sha
    tree = []
    for name, content in sorted(images.items()):
        blob = api.request(f"{root}/git/blobs", "POST", {
            "encoding": "base64", "content": base64.b64encode(content).decode()
        })
        require(blob["sha"] == expected[name], "Uploaded image blob hash mismatch")
        tree.append({"path": name, "mode": "100644", "type": "blob", "sha": blob["sha"]})
    created_tree = api.request(f"{root}/git/trees", "POST", {"tree": tree})
    commit = api.request(f"{root}/git/commits", "POST", {
        "message": f"PR #{capture['pr']} screenshots (run {capture['run_id']}, attempt {capture['run_attempt']})",
        "tree": created_tree["sha"],
        "parents": [],
    })
    try:
        api.request(f"{root}/git/refs", "POST", {
            "ref": f"refs/heads/{branch}", "sha": commit["sha"]
        })
        return commit["sha"]
    except APIError as error:
        if error.status != 422:
            raise
        # Retry after an ambiguous prior result without overwriting any ref.
        sha = existing_commit()
        require(sha is not None, "Failed to create image ref")
        return sha


def find_comment(api, capture):
    comments = api.items(f"/repos/{SOURCE}/issues/{capture['pr']}/comments")
    matches = [c for c in comments if c["user"]["login"] == "github-actions[bot]"
               and c["user"]["type"] == "Bot" and c["body"].startswith(MARKER + "\n")]
    for comment in matches:
        match = RUN_MARKER.search(comment["body"])
        require(match is not None, "Existing publisher comment lacks run metadata")
        if tuple(map(int, match.groups())) > (capture["run_id"], capture["run_attempt"]):
            raise Skip("A newer capture is already in the PR comment")
    return max(matches, key=lambda comment: comment["id"], default=None)


def comment_body(destination, sha, capture):
    require(re.fullmatch(r"[0-9a-f]{40}", sha), "Invalid image commit SHA")
    base = f"https://raw.githubusercontent.com/{destination}/{sha}"
    lines = [
        MARKER, f"<!-- capture-run:{capture['run_id']}:{capture['run_attempt']} -->",
        "## Visual Screenshots", "",
        f"Comparing **main** (`{capture['base_sha'][:7]}`, left) vs **PR head** "
        f"(`{capture['head_sha'][:7]}`, right).", "",
        f"[Capture run](https://github.com/{SOURCE}/actions/runs/{capture['run_id']}/attempts/{capture['run_attempt']})"
        f" · [Immutable images](https://github.com/{destination}/tree/{sha})", "",
    ]
    for page in PAGES:
        lines.extend(["<details>", f"<summary><strong>{page}</strong></summary>", ""])
        for viewport in VIEWPORTS:
            filename = f"{page}-{viewport}.png"
            lines.extend([
                f"#### {viewport}", "", "| main | PR |", "|:----:|:--:|",
                f"| ![main]({base}/main/{filename}) | ![PR]({base}/pr/{filename}) |", "",
            ])
        lines.extend(["</details>", ""])
    return "\n".join(lines)


def publish(api, images_api, event, destination):
    capture = current_capture(api, event)
    find_comment(api, capture)
    images = download_images(api, capture)
    if current_capture(api, event) != capture:
        raise Skip("PR revisions changed while downloading")
    sha = publish_images(images_api, destination, capture, images)
    if current_capture(api, event) != capture:
        raise Skip("PR revisions changed while publishing; images retained without a comment update")
    comment = find_comment(api, capture)
    body = comment_body(destination, sha, capture)
    if comment is None:
        api.request(f"/repos/{SOURCE}/issues/{capture['pr']}/comments", "POST", {"body": body})
    elif comment["body"] != body:
        api.request(f"/repos/{SOURCE}/issues/comments/{comment['id']}", "PATCH", {"body": body})
    print(f"Published 24 images: https://github.com/{destination}/tree/{sha}")


if __name__ == "__main__":
    try:
        require(os.environ.get("GITHUB_EVENT_NAME") == "workflow_run"
                and os.environ.get("GITHUB_REF") == "refs/heads/main",
                "Publisher must run on the trusted main workflow_run ref")
        event = json.loads(Path(os.environ["GITHUB_EVENT_PATH"]).read_text())
        publish(GitHub(os.environ.get("GITHUB_TOKEN")),
                GitHub(os.environ.get("SCREENSHOTS_TOKEN")), event,
                os.environ.get("SCREENSHOTS_REPOSITORY", ""))
    except Skip as error:
        print(f"Skipped: {error}")
    except (ValidationError, APIError) as error:
        print(f"Screenshot publication failed: {error}", file=sys.stderr)
        sys.exit(1)
    except (ValueError, APIError, KeyError, zipfile.BadZipFile, zlib.error,
            urllib.error.URLError, OSError) as error:
        # Keep transport errors/signed URLs and all credentials out of Actions logs.
        print(f"Screenshot publication failed ({type(error).__name__}); check setup and artifact validation.",
              file=sys.stderr)
        sys.exit(1)
