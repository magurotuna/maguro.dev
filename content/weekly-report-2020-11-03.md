+++
title = "Weekly Report 2020/11/01"
date = 2020-11-03
[taxonomies]
tags = ["OSS", "Weekly Report"]
+++

This is my 6th weekly report. As always, I failed to write a weekly report on Sunday.

<!-- more -->

# Weekly contributions

## [denoland/deno_lint](https://github.com/denoland/deno_lint)

- [fix control flow analysis on for statements](https://github.com/denoland/deno_lint/pull/481)
- [fix(camelcase): fix hint for object keys](https://github.com/denoland/deno_lint/pull/480)
- [fix(no-empty): fix contains_comments logic](https://github.com/denoland/deno_lint/pull/474)
- [refactor: introduce typed message & hint](https://github.com/denoland/deno_lint/pull/472)
- [refactor(no-class-assign): switch to `assert_lint_err!` macro](https://github.com/denoland/deno_lint/pull/448)
- [refactor(no-case-declarations): switch to `assert_lint_err!` macro](https://github.com/denoland/deno_lint/pull/447)
- [refactor(getter-return): switch to `assert_lint_err!` macro](https://github.com/denoland/deno_lint/pull/446)

# Diary

I started working for a new company. New colleagues are all so friendly to me and they have technically good skills. I have to catch up a new work, and hope to show my worth early.

At the new company, I'm supposed to write mainly Golang and TypeScript. In addition to those, luckily, I'm allowed to write Rust for WebAssembly (WASM) as well. We want heavy client-side jobs (such as real time image processing) that couldn't be processed on browser in a traditional way to be executed as WASM.

To tell the truth, I've never used WASM before, so this is the first time using it. I started learning it by reading [Introduction - Rust and WebAssembly](https://rustwasm.github.io/docs/book/), which I feel a really great material. I'm pretty excited to learn WASN every day. I hope I will implement something valuable in WASM!
