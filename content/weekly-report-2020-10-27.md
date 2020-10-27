+++
title = "Weekly Report 2020/10/25"
date = 2020-10-27
[taxonomies]
tags = ["OSS", "Weekly Report"]
+++

週報5回目です。毎週日曜日に更新するつもりでしたがすっぽかしました(4回目)。

*For non-Japanese readers: you can find English version of this post below the Japanese.*

<!-- more -->

# [denoland/deno_lint](https://github.com/denoland/deno_lint)

- [feat(example): add all-rules subcommand](https://github.com/denoland/deno_lint/pull/444)
  - `--all` というフラグを `deno_lint` に追加しました。これで、`deno_lint` に実装されているすべてのルールを標準出力にいい感じに出力できるようになって、個人的に助かります。
- [refactor(for-direction): switch to `assert_lint_err!` macro](https://github.com/denoland/deno_lint/pull/437)
  - `assert_lint_err` という、テスト内で使われている**関数**を、`assert_lint_err!` という**マクロ**に切り替えるリファクタの一部です。
- [refactor(ban-untagged-ignore): switch to `assert_lint_err!` macro](https://github.com/denoland/deno_lint/pull/436)
  - 同上
- [refactor(ban-types): switch to `assert_lint_err!` macro](https://github.com/denoland/deno_lint/pull/435)
  - 同上
- [refactor(constructor-super): switch to `assert_lint_err!` macro](https://github.com/denoland/deno_lint/pull/434)
  - 同上
- [refactor: use `once_cell` instead of `lazy_static`](https://github.com/denoland/deno_lint/pull/433)
  - `lazy_static` を `once_cell` に置き換えるリファクタです。
- [test(no-constant-condition): add tests to make sure else-if is handled](https://github.com/denoland/deno_lint/pull/418)
  - `no-constant-condition` ルールで、else-if ブロックが正しく処理されているかを確認するためのテストを追加しました
- [refactor(tests): use macro to have messages & hints be asserted](https://github.com/denoland/deno_lint/pull/410)
  - `assert_lint_ok!` と `assert_lint_err!` マクロに切り替える PR です。(err に関しては一部のルールのみ)
- [fix typo](https://github.com/denoland/deno_lint/pull/407)
  - タイトルの通りです。
- [fix(no-dupe-keys): handle nested objects & getter and setter with the same name](https://github.com/denoland/deno_lint/pull/406)
  - `no-dupe-keys` ルールで、ネストされたオブジェクトが正しく処理できていなかったバグと、ゲッターとセッターが同名のときにエラー扱いしてしまっていたというバグを修正しました。


# [denoland/deno](https://github.com/denoland/deno)

- [refactor(watch): create single watcher for whole process](https://github.com/denoland/deno/pull/8083)
  - watcher のリファクタです。Rust の非同期プログラミングについていろいろ学べて楽しい。

# Diary

これまで、週報を書くときはGitHub上でどのような活動をしたのかを1週間分手作業で収集してまとめていたのですが、地味にめんどくさかったのでスクリプトを組みました。

[![magurotuna/my-weekly-contributions - GitHub](https://gh-card.dev/repos/magurotuna/my-weekly-contributions.svg)](https://github.com/magurotuna/my-weekly-contributions)

これで週報を書くのがはかどるようになってハッピーです。まあ、日曜日はこのスクリプトを作ったら満足してしまって、結局週報を書かずに終わったので、本人のやる気が一番大事というのがよくわかりました。来週分は絶対日曜日に書くぞ！

# English part

This is my 5th weekly report. As always, I forgot to write a weekly report on Sunday. ¯\\\_(ツ)\_/¯

## [denoland/deno_lint](https://github.com/denoland/deno_lint)

- [feat(example): add all-rules subcommand](https://github.com/denoland/deno_lint/pull/444)
  - Added `--all` feature to the dlint example. This allows us to get all the rules implemented in `deno_lint` to be printed to stdout.
- [refactor(for-direction): switch to `assert_lint_err!` macro](https://github.com/denoland/deno_lint/pull/437)
  - just a part of refactoring in which we switch the `assert_lint_err` function to the `assert_lint_err!` macro
- [refactor(ban-untagged-ignore): switch to `assert_lint_err!` macro](https://github.com/denoland/deno_lint/pull/436)
  - ditto
- [refactor(ban-types): switch to `assert_lint_err!` macro](https://github.com/denoland/deno_lint/pull/435)
  - ditto
- [refactor(constructor-super): switch to `assert_lint_err!` macro](https://github.com/denoland/deno_lint/pull/434)
  - ditto
- [refactor: use `once_cell` instead of `lazy_static`](https://github.com/denoland/deno_lint/pull/433)
  - Replaced `lazy_static` with `once_cell`. Actually I love `lazy_static`, but `once_cell` looks much nicer.
- [test(no-constant-condition): add tests to make sure else-if is handled](https://github.com/denoland/deno_lint/pull/418)
  - Added a test to ensure else-if block is correctly handled
- [refactor(tests): use macro to have messages & hints be asserted](https://github.com/denoland/deno_lint/pull/410)
  - Swtiched to `assert_lint_ok!` and `assert_lint_err!` macros
- [fix typo](https://github.com/denoland/deno_lint/pull/407)
  - no words needed to explain it
- [fix(no-dupe-keys): handle nested objects & getter and setter with the same name](https://github.com/denoland/deno_lint/pull/406)
  - Fixed `no-dupe-keys` bugs, one of which is that the rule didn't handle nested stuff properly, and the other is it reported an error mistakenly if an object had both getter and setter with the same name.


## [denoland/deno](https://github.com/denoland/deno)

- [refactor(watch): create single watcher for whole process](https://github.com/denoland/deno/pull/8083)
  - Rewrite deno's watcher implementation, still work in progress. It requires me to understand asynchrounous programming in Rust deeply. Really tough work, but I'm getting more and more insight as well as Deno's internal. 

## Diary

So far, to write weekly reports, I collected my contributions on GitHub myself, which I thought was a very boring task. So I wrote a script to do it in Deno! 🦕

[![magurotuna/my-weekly-contributions - GitHub](https://gh-card.dev/repos/magurotuna/my-weekly-contributions.svg)](https://github.com/magurotuna/my-weekly-contributions)

I'm so happy with it since it saves a lot of time. To be honest, I was satisfied with completing this script last Sunday, ended up not writing a weekly report. The most important thing is probably my motivation. I'll definitely do it next Sunday!
