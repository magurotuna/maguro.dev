+++
title = "Weekly Report 2021/04/19"
date = 2021-04-20
[taxonomies]
tags = ["OSS", "Weekly Report"]
+++

This is my 30th weekly report.

<!-- more -->

# Weekly contributions

## [denoland/deno_lint](https://github.com/denoland/deno_lint)

- [fix(prefer-const): handle switch statements properly](https://github.com/denoland/deno_lint/pull/668)
- [fix(no-unused-vars): properly mark JSX element names as used](https://github.com/denoland/deno_lint/pull/664)

Deno v1.9.0 came out with the lint rule `no-unused-vars` enabled by default. This rule has so complex implementation, resulting in a lot of false positives.

A couple of issues have been opened by users. These feedback are really appreciated!

- [`no-unused-vars` in constructor in declared classes · Issue #670 · denoland/deno_lint](https://github.com/denoland/deno_lint/issues/670)
- [1.9.0 - `no-unused-vars` diagnosis is wrong in cases where the value is accessible via a closure · Issue #667 · denoland/deno_lint](https://github.com/denoland/deno_lint/issues/667)

It looks quite hard to fix them but I think I can manage it in a week or so.
