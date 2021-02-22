+++
title = "Weekly Report 2021/02/22"
date = 2021-02-22
[taxonomies]
tags = ["OSS", "Weekly Report"]
+++

This is my 22nd weekly report.

<!-- more -->

# Weekly contributions

## [denoland/deno_lint](https://github.com/denoland/deno_lint)

- [chore: add missing copyright and new CI step to check it](https://github.com/denoland/deno_lint/pull/617)
- [Upgrade swc_ecmascript to 0.23.1](https://github.com/denoland/deno_lint/pull/616)

## [denoland/deno](https://github.com/denoland/deno)

- [fix(dts): update doc of Deno.formatDiagnostics](https://github.com/denoland/deno/pull/9564)
- [fix(cli): emits error if no target files are found](https://github.com/denoland/deno/pull/9527)

## [tokio-rs/website](https://github.com/tokio-rs/website)

- [Upgrade crossbeam to 0.8.0](https://github.com/tokio-rs/website/pull/552)
- [Fix link references in "framing" chapter](https://github.com/tokio-rs/website/pull/549)


# Diary

I proposed clippy's new lint [`bool_then`](https://github.com/rust-lang/rust-clippy/issues/6760) (lint name is not yet decided though). This lint will encourage users to use [`bool::then`](https://doc.rust-lang.org/std/primitive.bool.html#method.then) that has been available since Rust 1.50.0 rather than if-else blocks.
This lint seems to be "moderately" hard to implement, so implementing it myself will teach me several techniques that those who are new to Clippy's development should be familiar with. I'm going to work on it next weekend.
