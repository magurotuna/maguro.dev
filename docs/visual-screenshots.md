# PR screenshot publishing

`Visual Screenshots` captures main and PR head at their event commit SHAs: three
pages × four viewports × two revisions = 24 PNGs. The capture job has read-only
repository access and uploads a seven-day Actions artifact. Failed or incomplete
captures do not publish.

`Publish Visual Screenshots` runs separately from the default branch after a
successful capture. It creates image-only commits in the public
[`magurotuna/maguro-dev-screenshots`](https://github.com/magurotuna/maguro-dev-screenshots)
repository. No image commits are pushed to this application repository.

## One-time setup

1. Use **public** `magurotuna/maguro-dev-screenshots`, initialized with a README on
   `main`. The Git Data API requires an initialized repository. No site, build
   integration, or workflow is needed there.
2. In **maguro.dev → Settings → Environments**, create `screenshot-publishing`.
   Under **Deployment branches and tags**, choose **Selected branches and tags**
   and add a **branch** rule for `main` only. Do not add tag rules or
   `refs/pull/*/merge`. Configure this restriction **before** adding the secret.
3. Create a **fine-grained personal access token** yourself, resource owner
   `magurotuna`, repository access **Only select repositories** →
   `maguro-dev-screenshots`. Grant **Contents: Read and write**; Metadata read is
   automatic. No Actions, Workflows, administration, or app-repository write
   permission is needed. Choose an expiry and rotate the token before it expires.
4. Add that value yourself as the **environment secret** `SCREENSHOTS_TOKEN` in
   `maguro.dev`'s `screenshot-publishing` environment. Do not use a repository-wide
   secret, commit the value, or paste it into a chat/log. The app's `GITHUB_TOKEN`
   cannot be assumed to write to the separate image repository.
5. In **maguro.dev → Settings → Secrets and variables → Actions → Variables**, add
   the **repository variable** `SCREENSHOTS_REPOSITORY` with value
   `magurotuna/maguro-dev-screenshots`. Set it last, after the environment is ready.
   Without this variable the publisher skips; a missing/expired token fails
   publication without changing the prior comment.

The publisher's own `GITHUB_TOKEN` gets `actions: read`, `contents: read`, and
`pull-requests: write` to read capture metadata and write the PR comment. The
separate token is used only for image-repository API calls.

## Trust boundary and retention

- The publisher checks out only the default-branch event commit. It does not
  check out a PR, install dependencies, restore caches, or run artifact content.
  Its Python standard-library script reads the ZIP in memory without extracting
  paths to disk.
- GitHub API data determines the originating workflow/run/attempt and PR. The
  script checks the current open PR head and base, exact artifact name, run
  association, SHA256, and metadata; accepts exactly the 24 known PNG paths;
  rejects symlinks, extra files, traversal, corrupt PNG data, and oversize inputs.
  Limits are 5 MiB per PNG, 50 MiB for the ZIP and uncompressed total, and
  20 million pixels per image. Update the capture spec and publisher together
  when changing the page/viewport matrix.
- Fork PRs can upload capture artifacts, subject to normal Actions approval,
  but automatic public image publication and commenting are skipped. No
  `pull_request_target` workflow executes PR code. Same-repository PR execution
  also has no image-publishing secret.
- A newer run/attempt, changed head/base, or newer publisher comment suppresses
  stale publication. PR state is checked again before writing images and before
  commenting; per-PR publisher concurrency serializes comment updates. A PR
  update during image upload can leave retained images without a comment update.
- Each capture gets a new image-repository ref:
  `screenshots/pr-N/run-RUN_ID-ATTEMPT`. Repeating the same publication verifies
  and reuses identical images; it never force-pushes or overwrites a capture.
  Comment URLs use the **image commit SHA**, for example
  `https://raw.githubusercontent.com/magurotuna/maguro-dev-screenshots/COMMIT_SHA/main/home-desktop.png`.
- The old `visual-screenshots-comment` comments and existing application
  `screenshots/pr-*` branches are retained. The new publisher updates only its own
  `visual-screenshots-external:v1` bot comment. The former branch cleanup workflow
  is removed. Keep both repositories public and keep image refs to preserve URLs;
  published image storage grows over time and has no automatic deletion policy.

## Rollout and verification

The publisher must be reviewed and merged to `main` before GitHub can trigger its
`workflow_run` event. A draft PR can validate capture, tests, and formatting, but
cannot prove automatic inline publication. Do not grant the publishing environment
access to a feature branch to work around this. Merge/deployment remains a separate
decision.

Once the trusted publisher is on `main` and setup is complete, update/rebase an
open same-repository PR onto the new workflow and trigger a fresh capture. Older
PR workflow revisions can still run the former image-branch publisher or cleanup;
do not rerun those historical workflows. Rerunning a capture keeps its original
event revisions, so update the PR if its base has advanced.

Check both Actions runs, verify the image repository contains exactly 24 PNGs on
the new capture ref, open an image URL without authentication (HTTP 200 and PNG),
and expand the PR comment's before/after tables in GitHub. Confirm no new
`screenshots/pr-*` app branch was pushed and previous image URLs still resolve.
If publication is interrupted after uploading, rerun only the publisher to reuse
that capture. Removing the repository variable pauses future publication without
deleting images or comments.

Local validation (no credentials or network writes):

```console
python3 -m unittest discover -s scripts -p 'publish_screenshots_test.py' -v
actionlint
npm run format:check
```

GitHub references: [workflow_run permissions and default-branch requirement](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run),
[environment branch rules match the publisher's GITHUB_REF](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments#deployment-branches-and-tags),
and [fine-grained token setup](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token).
