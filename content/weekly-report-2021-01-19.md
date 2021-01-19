+++
title = "Weekly Report 2021/01/18"
date = 2021-01-19
[taxonomies]
tags = ["OSS", "Weekly Report", "Tokio"]
+++

This is my 17th weekly report.

<!-- more -->

# Weekly contributions

## [denoland/deno_lint](https://github.com/denoland/deno_lint)

- [feat: add lint_with_ast API](https://github.com/denoland/deno_lint/pull/593)
- [fix(dlint): make order of diagnostics output deterministic](https://github.com/denoland/deno_lint/pull/592)
- [fix(camelcase): don't check ambient declarations + handle TypeScript things](https://github.com/denoland/deno_lint/pull/589)

## [denoland/deno](https://github.com/denoland/deno)

- [chore: update copyright to 2021](https://github.com/denoland/deno/pull/9092)
- [fix(watcher): keep working even when imported files has invalid syntax](https://github.com/denoland/deno/pull/9091)


## [cafecoder-dev/cafecoder-rs](https://github.com/cafecoder-dev/cafecoder-rs)

- [エラー型に anyhow クレートを利用 + 非同期実行の構造を大幅に整理](https://github.com/cafecoder-dev/cafecoder-rs/pull/11)

# Diary

I began to translate [Tokio tutorial](https://tokio.rs/tokio/tutorial) to Japanese. This tutorial gave me a tremendous amount of knowledge of asynchronous programming, not only in Rust, but also in all programming languages. That's why I would like to share such a good tutorial with Japanese programmers.

By the way, [my pull request about introducing `Deno.resolveDns` API to Deno](https://github.com/denoland/deno/pull/8790) is finally almost ready to land. It's been kind of tough work because of my insufficiency of DNS knowledge and the difficulty of deciding what interface this API should look like.

And yesterday, I ran into a very strange error when writing an integration test - [this snippet](https://gist.github.com/magurotuna/913500414948c40669332f23a5a2875a) _does_ works (note that it's in the main function), but on the other hand, if I put the same stuff into a test annotated with `#[tokio::test]`, the test _does NOT_ work.

Do you know why? It took me about 3 hours to figure out. It's because `#[tokio::main]` and `#[tokio::test]` will be expanded differently - that's a tiny difference, but in my code it's big enough to prevent the test from working. I had thought it was really annoying, but once the reason came to light, it was very simple. The answer is:

When expanding `#[tokio::main]`, we get:

```rust
tokio::runtime::Builder::new_multi_thread()
    .enable_all()
    .build()
    .unwrap()
    .block_on(async { /* snip */ });
```


On the other hand, for `#[tokio::test]`, we get:

```rust
tokio::runtime::Builder::new_current_thread()
    .enable_all()
    .build()
    .unwrap()
    .block_on(async { /* snip */ });
```

That's it.
