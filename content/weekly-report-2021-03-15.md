+++
title = "Weekly Report 2021/03/15"
date = 2021-03-15
[taxonomies]
tags = ["OSS", "Weekly Report"]
+++

This is my 25th weekly report.

<!-- more -->

# Weekly contributions

## [denoland/deno_lint](https://github.com/denoland/deno_lint)

- [refactor(no-this-before-super): rewrite with ast-view and assert macro](https://github.com/denoland/deno_lint/pull/634)
- [refactor(no-setter-return): refine with ast-view and add sufficient tests](https://github.com/denoland/deno_lint/pull/632)

## [denoland/deno](https://github.com/denoland/deno)

- [chore: upgrade to tokio 1.3.0](https://github.com/denoland/deno/pull/9778)

## [dprint/dprint-swc-ecma-ast-view](https://github.com/dprint/dprint-swc-ecma-ast-view)

- [feat: Implement `Serialize` trait for each `Node`](https://github.com/dprint/dprint-swc-ecma-ast-view/pull/13)

# Diary

In rust-clippy, the new lint I proposed and implemented finally got merged into master. Here is the PR:

[https://github.com/rust-lang/rust-clippy/pull/6859](https://github.com/rust-lang/rust-clippy/pull/6859)

This lint seemed relatively easy to implement, but actually it was moderately challenging, which allowed me to learn a lot about how to implement a basic lint in clippy. Specifically, we should use `snippet_with_macro_callsite` when we want to retrieve the original code snippet that could be a macro from Rust's intermediate representation - otherwise, we would end up getting a snippet with the macro expanded, which would not be suitable for the usage of showing a diagnostic message to users.

Overall, developing clippy's new rule has been a fantastic experience to me. I hope I'll contribute to it more and more.
