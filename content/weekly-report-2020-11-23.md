+++
title = "Weekly Report 2020/11/22"
date = 2020-11-23
[taxonomies]
tags = ["OSS", "Weekly Report"]
+++

This is my 9th weekly report.

In Japan, it is a national holiday today - Labor Thanksgiving day!

<!-- more -->

# Weekly contributions

## [denoland/deno](https://github.com/denoland/deno)

- [feat(unstable): Support --watch flag for bundle and fmt subcommands](https://github.com/denoland/deno/pull/8276)
  - After long review, it's been finally landed! And released as part of v1.5.4! See [v1.5.4 release note](https://github.com/denoland/deno/releases/tag/v1.5.4)

## [denoland/deno_lint](https://github.com/denoland/deno_lint)

- [feat: dlint plugin POC](https://github.com/denoland/deno_lint/pull/415)
  - As a handover, I started to work on the deno_lint's plugin feature. The progress is so fine that we can write plugin rules in JavaScript and enable them on runtime.
- [fix(no-ex-assign): handle nested assignments correctly](https://github.com/denoland/deno_lint/pull/545)
- [refactor(no-inner-declarations): switch to `asset_lint_err!` macro](https://github.com/denoland/deno_lint/pull/544)
- [fix(no-inferrable-types): handle nested things properly](https://github.com/denoland/deno_lint/pull/543)
- [refactor(no-global-assign): switch to `asset_lint_err!` macro](https://github.com/denoland/deno_lint/pull/542)
- [fix(no-dupe-keys): deal with BigInt keys](https://github.com/denoland/deno_lint/pull/541)
- [fix(no-func-assign): handle FnExpr and nested assignments](https://github.com/denoland/deno_lint/pull/540)
- [refactor(no-fallthrough): switch to `asset_lint_err!` macro](https://github.com/denoland/deno_lint/pull/539)

# Diary

![Hacktoberfest T-shirt](https://user-images.githubusercontent.com/23649474/99983761-9c70bd80-2def-11eb-9cd9-a27e9e00b7c7.jpg)

I received Hacktoberfest 2020's T-shirt, and... a lot of stickers lol

The T-shirt feels pretty thin but I will cherish it!
