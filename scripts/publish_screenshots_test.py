import copy
import hashlib
import io
import json
import stat
import struct
import unittest
import urllib.error
import warnings
import zipfile
import zlib
from unittest.mock import Mock, patch

import publish_screenshots as publisher

DESTINATION = "magurotuna/maguro-dev-screenshots"
HEAD = "a" * 40
BASE = "b" * 40
COMMIT = "c" * 40
CAPTURE = {
    "repository": publisher.SOURCE, "pr": 161, "head_sha": HEAD, "base_sha": BASE,
    "run_id": 123, "run_attempt": 1,
}
EVENT = {
    "repository": {"full_name": publisher.SOURCE, "default_branch": "main", "id": 42},
    "workflow_run": {"id": 123, "run_attempt": 1},
}


def png(pixels=b"\0\xff\0\0\xff"):
    def chunk(kind, content):
        return (struct.pack(">I", len(content)) + kind + content
                + struct.pack(">I", zlib.crc32(kind + content)))
    return (b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(pixels)) + chunk(b"IEND", b""))


def archive(entries=None):
    if entries is None:
        entries = {name: png() for name in publisher.FILES}
        entries["metadata.json"] = json.dumps(CAPTURE).encode()
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as target:
        for name, content in entries.items():
            target.writestr(name, content)
    return output.getvalue()


class SourceAPI:
    def __init__(self):
        self.writes = []
        self.comments = []
        self.run = {
            "id": 123, "run_attempt": 1, "workflow_id": 7, "path": publisher.WORKFLOW,
            "event": "pull_request", "status": "completed", "conclusion": "success",
            "repository": {"id": 42}, "head_repository": {"id": 42},
            "head_sha": HEAD, "head_branch": "feature", "pull_requests": [{"number": 161}],
        }
        self.pr = {
            "state": "open",
            "head": {"repo": {"id": 42}, "ref": "feature", "sha": HEAD},
            "base": {"repo": {"id": 42}, "ref": "main", "sha": BASE},
        }
        self.runs = [self.run]
        self.data = archive()
        self.artifacts = [{
            "id": 1, "name": "visual-screenshots-1", "expired": False,
            "size_in_bytes": len(self.data),
            "workflow_run": {"id": 123, "head_sha": HEAD},
            "digest": "sha256:" + hashlib.sha256(self.data).hexdigest(),
        }]

    def request(self, path, method="GET", body=None):
        if method != "GET":
            self.writes.append((path, method, body))
            if method == "POST":
                self.comments.append({
                    "id": 2, "body": body["body"],
                    "user": {"type": "Bot", "login": "github-actions[bot]"},
                })
            return {}
        if path.endswith("/actions/runs/123"):
            return self.run
        if path.endswith("/actions/workflows/visual-test.yml"):
            return {"id": 7, "path": publisher.WORKFLOW}
        if path.endswith("/pulls/161"):
            return self.pr
        raise AssertionError(path)

    def items(self, path, key=None):
        if key == "workflow_runs":
            return self.runs
        if key == "artifacts":
            return self.artifacts
        if path.endswith("/comments"):
            return self.comments
        raise AssertionError(path)

    def archive(self, artifact_id):
        assert artifact_id == 1
        return self.data


class ImagesAPI:
    def __init__(self):
        self.writes = []
        self.ref = None
        self.tree = []
        self.visibility = "public"
        self.after_write = lambda: None

    def request(self, path, method="GET", body=None):
        root = f"/repos/{DESTINATION}"
        assert path.startswith(root)
        if method == "GET":
            if path == root:
                return {"visibility": self.visibility, "archived": False}
            if path.endswith("/git/ref/heads/main"):
                return {"object": {"sha": BASE}}
            if "/git/ref/heads/screenshots/" in path:
                if self.ref is None:
                    raise publisher.APIError(404)
                return {"object": {"sha": self.ref}}
            if path.endswith(f"/git/commits/{COMMIT}"):
                return {"tree": {"sha": "d" * 40}}
            if "/git/trees/" in path:
                return {"tree": self.tree, "truncated": False}
        else:
            self.writes.append((path, method, body))
            self.after_write()
            if path.endswith("/git/blobs"):
                import base64
                return {"sha": publisher.blob_sha(base64.b64decode(body["content"]))}
            if path.endswith("/git/trees"):
                self.tree = body["tree"]
                return {"sha": "d" * 40}
            if path.endswith("/git/commits"):
                return {"sha": COMMIT}
            if path.endswith("/git/refs"):
                self.ref = body["sha"]
                return {"object": {"sha": self.ref}}
        raise AssertionError((path, method, body))


class ScreenshotTests(unittest.TestCase):
    def setUp(self):
        self.source = SourceAPI()
        self.images = ImagesAPI()

    def publish(self):
        with patch("builtins.print"):
            publisher.publish(self.source, self.images, EVENT, DESTINATION)

    def assert_no_publication(self, exception):
        with self.assertRaises(exception):
            self.publish()
        self.assertEqual(self.source.writes, [])
        self.assertEqual(self.images.writes, [])

    def test_valid_capture_publishes_only_images_and_commit_pinned_inline_comment(self):
        self.source.comments = [{
            "id": 1, "body": "<!-- visual-screenshots-comment -->\nLegacy URL",
            "user": {"login": "github-actions[bot]", "type": "Bot"},
        }]
        self.publish()
        self.assertEqual(len(self.images.tree), 24)
        self.assertEqual({entry["path"] for entry in self.images.tree}, publisher.FILES)
        self.assertEqual(len(self.images.writes), 27)
        self.assertTrue(all(method == "POST" for _, method, _ in self.images.writes))
        self.assertEqual(self.source.comments[0]["body"], "<!-- visual-screenshots-comment -->\nLegacy URL")
        self.assertEqual(len(self.source.writes), 1)
        body = self.source.writes[0][2]["body"]
        self.assertEqual(body.count(f"https://raw.githubusercontent.com/{DESTINATION}/{COMMIT}/"), 24)
        self.assertEqual(body.count("| ![main]"), 12)
        self.assertIn(chr(96) + "aaaaaaa" + chr(96), body)
        self.assertIn("/attempts/1", body)
        self.assertEqual(self.images.writes[-1][2]["ref"], "refs/heads/screenshots/pr-161/run-123-1")
        self.assertEqual(self.images.writes[-2][2]["parents"], [])

    def test_publisher_retry_reuses_immutable_images_and_comment(self):
        self.publish()
        self.images.writes.clear()
        self.source.writes.clear()
        self.publish()
        self.assertEqual(self.images.writes, [])
        self.assertEqual(self.source.writes, [])

    def test_existing_capture_cannot_be_overwritten(self):
        self.publish()
        self.images.tree[0]["sha"] = "e" * 40
        self.images.writes.clear()
        self.source.writes.clear()
        self.assert_no_publication(publisher.ValidationError)

    def test_fork_capture_and_fork_pr_are_skipped(self):
        self.source.run["head_repository"]["id"] = 99
        self.assert_no_publication(publisher.Skip)
        self.source.run["head_repository"]["id"] = 42
        self.source.pr["head"]["repo"]["id"] = 99
        self.assert_no_publication(publisher.Skip)

    def test_wrong_workflow_is_rejected(self):
        for key, value in (("path", ".github/workflows/evil.yml"), ("workflow_id", 99)):
            with self.subTest(key=key):
                original = self.source.run[key]
                self.source.run[key] = value
                self.assert_no_publication(publisher.ValidationError)
                self.source.run[key] = original

    def test_unassociated_closed_retargeted_and_stale_prs_are_skipped(self):
        for change in (
            lambda: self.source.run.update(pull_requests=[]),
            lambda: self.source.pr.update(state="closed"),
            lambda: self.source.pr["base"].update(ref="other"),
            lambda: self.source.pr["head"].update(sha="f" * 40),
            lambda: self.source.run.update(run_attempt=2),
            lambda: self.source.run.update(conclusion="failure"),
        ):
            with self.subTest(change=change):
                self.source = SourceAPI()
                change()
                self.assert_no_publication(publisher.Skip)

    def test_newer_pending_run_suppresses_older_success(self):
        newer = copy.deepcopy(self.source.run)
        newer.update(id=124, status="in_progress", conclusion=None)
        self.source.runs.append(newer)
        self.assert_no_publication(publisher.Skip)

    def test_newer_comment_cannot_be_replaced(self):
        self.source.comments = [{
            "id": 2, "user": {"type": "Bot", "login": "github-actions[bot]"},
            "body": publisher.MARKER + "\n<!-- capture-run:124:1 -->",
        }]
        self.assert_no_publication(publisher.Skip)

    def test_user_marker_comment_is_ignored(self):
        self.source.comments = [{
            "id": 1, "user": {"type": "User", "login": "someone"},
            "body": publisher.MARKER + "\n<!-- capture-run:999:1 -->",
        }]
        self.publish()
        self.assertEqual(self.source.writes[0][1], "POST")

    def test_head_change_during_publication_prevents_comment(self):
        self.images.after_write = lambda: self.source.pr["head"].update(sha="f" * 40)
        with self.assertRaises(publisher.Skip):
            self.publish()
        self.assertTrue(self.images.writes)
        self.assertEqual(self.source.writes, [])

    def test_base_change_rejects_stale_artifact(self):
        self.source.pr["base"]["sha"] = "f" * 40
        self.assert_no_publication(publisher.ValidationError)

    def test_wrong_attempt_expired_oversize_or_wrong_run_artifacts_rejected(self):
        mutations = [
            {"name": "visual-screenshots-2"}, {"expired": True},
            {"size_in_bytes": publisher.MAX_ARCHIVE + 1},
            {"workflow_run": {"id": 124, "head_sha": HEAD}},
            {"digest": "sha256:" + "0" * 64},
        ]
        for mutation in mutations:
            with self.subTest(mutation=mutation):
                self.source = SourceAPI()
                self.source.artifacts[0].update(mutation)
                self.assert_no_publication(publisher.ValidationError)

    def test_duplicate_matching_artifacts_rejected(self):
        self.source.artifacts.append(self.source.artifacts[0])
        self.assert_no_publication(publisher.ValidationError)

    def test_app_repository_and_private_destination_rejected(self):
        with self.assertRaises(publisher.ValidationError):
            publisher.publish_images(self.images, publisher.SOURCE, CAPTURE, {})
        self.images.visibility = "private"
        self.assert_no_publication(publisher.ValidationError)


class ArchiveTests(unittest.TestCase):
    def entries(self):
        return {**{name: png() for name in publisher.FILES},
                "metadata.json": json.dumps(CAPTURE).encode()}

    def test_complete_archive(self):
        self.assertEqual(set(publisher.validate_archive(archive(), CAPTURE)), publisher.FILES)

    def test_missing_extra_traversal_executable_and_backslash_paths_rejected(self):
        for name in ("../scripts/publish_screenshots.py", "/tmp/image.png",
                     "main/../../x.png", "main\\home-desktop.png",
                     ".github/workflows/injected.yml", "main/x.svg", "run.sh"):
            with self.subTest(name=name):
                entries = self.entries()
                entries.pop("main/home-desktop.png")
                entries[name] = b"untrusted"
                with self.assertRaises(publisher.ValidationError):
                    publisher.validate_archive(archive(entries), CAPTURE)
        entries = self.entries()
        entries.pop("main/home-desktop.png")
        with self.assertRaises(publisher.ValidationError):
            publisher.validate_archive(archive(entries), CAPTURE)

    def test_symlink_duplicate_and_null_paths_rejected(self):
        for case in ("symlink", "duplicate", "null"):
            with self.subTest(case=case):
                entries = self.entries()
                if case == "symlink":
                    entries.pop("main/home-desktop.png")
                output = io.BytesIO(archive(entries))
                with warnings.catch_warnings(), zipfile.ZipFile(output, "a") as target:
                    warnings.simplefilter("ignore", UserWarning)
                    entry = zipfile.ZipInfo("main/home-desktop.png")
                    entry.create_system = 3
                    if case == "symlink":
                        entry.external_attr = (stat.S_IFLNK | 0o777) << 16
                    target.writestr(entry, b"target")
                data = output.getvalue()
                if case == "null":
                    data = data.replace(b"main/home-desktop.png", b"main/home-desktop\x00png")
                with self.assertRaises(publisher.ValidationError):
                    publisher.validate_archive(data, CAPTURE)

    def test_forged_artifact_pr_or_revision_cannot_choose_comment_target(self):
        for key, value in (("pr", 162), ("run_id", 124), ("head_sha", "0" * 40)):
            with self.subTest(key=key):
                entries = self.entries()
                entries["metadata.json"] = json.dumps({**CAPTURE, key: value}).encode()
                with self.assertRaises(publisher.ValidationError):
                    publisher.validate_archive(archive(entries), CAPTURE)

    def test_image_and_archive_limits(self):
        for constant, limit in (("MAX_IMAGE", 10), ("MAX_ARCHIVE", 10)):
            with patch.object(publisher, constant, limit), self.assertRaises(publisher.ValidationError):
                publisher.validate_archive(archive(), CAPTURE)

    def test_uncompressed_total_limit(self):
        payload = b"a" * 10_000
        chunk = (struct.pack(">I", len(payload)) + b"tEXt" + payload
                 + struct.pack(">I", zlib.crc32(b"tEXt" + payload)))
        # Valid compressible ancillary data makes the expanded ZIP larger.
        image = png()[:-12] + chunk + png()[-12:]
        entries = {name: image for name in publisher.FILES}
        entries["metadata.json"] = json.dumps(CAPTURE).encode()
        data = archive(entries)
        self.assertLess(len(data), 10_000)
        with patch.object(publisher, "MAX_ARCHIVE", 10_000):
            with self.assertRaisesRegex(publisher.ValidationError, "Uncompressed"):
                publisher.validate_archive(data, CAPTURE)

    def test_png_corruption_and_decompression_bomb_rejected(self):
        bad_checksum = bytearray(png())
        bad_checksum[-5] ^= 1
        for image in (b"not png", png() + b"<script>", bytes(bad_checksum),
                      png(b"\0" * 100_000), png(b"\5\0\0\0\0")):
            with self.subTest(size=len(image)), self.assertRaises(publisher.ValidationError):
                publisher.validate_png(image)


class TransportTests(unittest.TestCase):
    def test_signed_download_never_receives_api_authorization(self):
        api = publisher.GitHub("test-placeholder")
        api.open_api = Mock(side_effect=urllib.error.HTTPError(
            "https://api.github.com/artifact", 302, "redirect",
            {"Location": "https://artifacts.example.invalid/signed"}, None,
        ))
        api.opener.open = Mock(return_value=io.BytesIO(b"zip"))
        self.assertEqual(api.archive(1), b"zip")
        api.opener.open.assert_called_once_with("https://artifacts.example.invalid/signed", timeout=60)

    def test_unsafe_download_redirect_rejected(self):
        api = publisher.GitHub("test-placeholder")
        api.open_api = Mock(side_effect=urllib.error.HTTPError(
            "https://api.github.com/artifact", 302, "redirect",
            {"Location": "http://example.invalid/signed"}, None,
        ))
        with self.assertRaises(publisher.ValidationError):
            api.archive(1)

    def test_api_listing_is_paginated(self):
        api = publisher.GitHub("test-placeholder")
        api.request = Mock(side_effect=[{"items": [1] * 100}, {"items": [2]}])
        self.assertEqual(len(api.items("/repos/test/repo/items", "items")), 101)
        self.assertTrue(api.request.call_args_list[1].args[0].endswith("page=2"))


if __name__ == "__main__":
    unittest.main()
