import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { buildResume, typstRelease } from "./build-resume.mjs";

test("rebuilds from source, is reproducible, and removes stale PDFs on compile failure", async () => {
  const directory = mkdtempSync(join(tmpdir(), "maguro-resume-test-"));
  try {
    const source = join(directory, "resume.typ");
    const output = join(directory, "resume.pdf");
    writeFileSync(source, "First résumé");
    await buildResume(directory, { source });
    const first = readFileSync(output);
    assert.equal(first.subarray(0, 5).toString(), "%PDF-");
    await buildResume(directory, { source });
    assert.deepEqual(readFileSync(output), first);

    writeFileSync(source, "Updated résumé from a source-only change");
    await buildResume(directory, { source });
    assert.notDeepEqual(readFileSync(output), first);

    writeFileSync(source, '#panic("Intentional compilation failure")');
    await assert.rejects(
      buildResume(directory, { source }),
      /Failed to generate \/resume.pdf/,
    );
    assert.equal(existsSync(output), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("rejects a corrupt cached CLI archive and removes stale output", async () => {
  const directory = mkdtempSync(join(tmpdir(), "maguro-resume-checksum-"));
  try {
    const cacheDirectory = join(directory, "cache");
    mkdirSync(cacheDirectory);
    const cached = join(cacheDirectory, typstRelease().archive);
    writeFileSync(cached, "not the official release");
    const output = join(directory, "resume.pdf");
    writeFileSync(output, "stale PDF");
    await assert.rejects(
      buildResume(directory, { cacheDirectory }),
      /SHA256 mismatch/,
    );
    assert.equal(existsSync(output), false);
    assert.equal(existsSync(cached), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("selects pinned macOS/Linux assets and rejects unsupported platforms", () => {
  for (const platform of ["darwin", "linux"]) {
    for (const arch of ["arm64", "x64"]) {
      const release = typstRelease(platform, arch);
      assert.match(
        release.url,
        /^https:\/\/github.com\/typst\/typst\/releases\/download\/v0\.15\.1\//,
      );
      assert.match(release.sha256, /^[a-f0-9]{64}$/);
    }
  }
  assert.throws(
    () => typstRelease("win32", "x64"),
    /Unsupported Typst build platform/,
  );
});
