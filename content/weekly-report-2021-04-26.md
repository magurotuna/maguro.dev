+++
title = "Weekly Report 2021/04/26"
date = 2021-04-26
[taxonomies]
tags = ["OSS", "Weekly Report"]
+++

This is my 31st weekly report.

<!-- more -->

# Weekly contributions

## [denoland/deno_lint](https://github.com/denoland/deno_lint)

- [fix(control-flow): handle `break` statements in loops properly](https://github.com/denoland/deno_lint/pull/675)
- [fix(no-unused-vars): don't trigger errors for `export declare`](https://github.com/denoland/deno_lint/pull/673)

I started to create a new control flow graph analyzer from scratch. The current one of deno_lint has a lot of ad-hoc, stateful, less-maintainable logics. Hopefully new one will address such issues. It's not only quite challenging but also enjoyable to implement it. The repository is currently private. I'll make it public when it's ready.
