import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const version = "0.15.1";
// Official release asset digests, verified against the GitHub release API:
// https://api.github.com/repos/typst/typst/releases/tags/v0.15.1
const releases = {
  "darwin-arm64": [
    "aarch64-apple-darwin",
    "48f62ed034aa3a7978309579ac6ca00045e2ef0da73114e8af27cfd8e74dc05a",
  ],
  "darwin-x64": [
    "x86_64-apple-darwin",
    "7f9fdd9584866245de9a79e0add8f9236fae6f40a8a45e2c4771ccc14db4e0fa",
  ],
  "linux-arm64": [
    "aarch64-unknown-linux-musl",
    "5aa8d74a3d906e60ea12a66ac2f37f8eef1b14cbad7182a745e393a10c23dcee",
  ],
  "linux-x64": [
    "x86_64-unknown-linux-musl",
    "a6d077d0a95eed5a2eba715b2dae06be954f624ccbf85758a03f389ded33118c",
  ],
};

export function typstRelease(platform = process.platform, arch = process.arch) {
  const release = releases[`${platform}-${arch}`];
  if (!release) {
    throw new Error(
      `Unsupported Typst build platform: ${platform}-${arch}. Use macOS or Linux (arm64/x64).`,
    );
  }
  const [target, sha256] = release;
  const directory = `typst-${target}`;
  const archive = `${directory}.tar.xz`;
  return {
    directory,
    archive,
    sha256,
    url: `https://github.com/typst/typst/releases/download/v${version}/${archive}`,
  };
}

async function typstArchive(release, cacheDirectory) {
  const cached = join(cacheDirectory, release.archive);
  let bytes;
  if (existsSync(cached)) {
    bytes = readFileSync(cached);
  } else {
    console.log(`Downloading official Typst ${version} (${release.archive})`);
    const response = await fetch(release.url, {
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) {
      throw new Error(`Typst download failed: HTTP ${response.status}`);
    }
    bytes = Buffer.from(await response.arrayBuffer());
  }
  // Recheck cached archives too; never execute an unverified cached binary.
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== release.sha256) {
    rmSync(cached, { force: true });
    throw new Error(
      `Typst SHA256 mismatch: expected ${release.sha256}, got ${actual}`,
    );
  }
  mkdirSync(cacheDirectory, { recursive: true });
  writeFileSync(cached, bytes);
  return bytes;
}

export async function buildResume(
  outputDirectory,
  {
    source = join(root, "resume/resume.typ"),
    cacheDirectory = join(root, "node_modules/.cache/typst", version),
  } = {},
) {
  const output = join(outputDirectory, "resume.pdf");
  // A failed download or compile must not leave an old PDF ready to deploy.
  rmSync(output, { force: true });
  const temporary = mkdtempSync(join(tmpdir(), "maguro-resume-"));
  try {
    const release = typstRelease();
    const archive = join(temporary, release.archive);
    writeFileSync(archive, await typstArchive(release, cacheDirectory));
    execFileSync("tar", ["-xJf", archive, "-C", temporary]);

    // Use only the CLI's embedded fonts, including Libertinus Serif. A fixed
    // default timestamp is reproducible even in shallow clones and source archives.
    const env = { ...process.env };
    delete env.TYPST_FONT_PATHS;
    delete env.TYPST_IGNORE_EMBEDDED_FONTS;
    const timestamp = env.SOURCE_DATE_EPOCH ?? "0";
    const pdf = join(temporary, "resume.pdf");
    execFileSync(
      join(temporary, release.directory, "typst"),
      [
        "compile",
        "--ignore-system-fonts",
        "--creation-timestamp",
        timestamp,
        source,
        pdf,
      ],
      { env, stdio: "inherit" },
    );
    mkdirSync(outputDirectory, { recursive: true });
    copyFileSync(pdf, output);
    console.log(`Generated ${output} with Typst ${version}`);
  } catch (cause) {
    rmSync(output, { force: true });
    throw new Error(
      `Failed to generate /resume.pdf from ${source}: ${cause.message}`,
      { cause },
    );
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

export default function resumePdf() {
  return {
    name: "resume-pdf",
    hooks: {
      // Astro cleans the output before building. Add the PDF only after that,
      // using the actual output directory for both Netlify and Cloudflare.
      "astro:build:done": async ({ dir }) => {
        await buildResume(fileURLToPath(dir));
      },
    },
  };
}
