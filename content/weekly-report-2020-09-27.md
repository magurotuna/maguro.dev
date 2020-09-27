+++
title = "Weekly Report 2020/09/27"
date = 2020-09-27
[taxonomies]
tags = ["OSS", "Weekly Report"]
+++

突然ですが1週間の活動を週報という形でまとめておこうと思い立ちました。基本的に三日坊主のため継続できるか怪しいですが、とりあえずやってみます。

<!-- more -->

# [denoland/deno](https://github.com/denoland/deno)

## Issue

- [`setTimeout` still consumes time even if it's followed by `clearTimeout`](https://github.com/denoland/deno/issues/7599)
  - `setTimeout` した直後に `clearTimeout` しても、時間消費自体はキャンセルされずに行われてしまう、という問題を見つけました。自力で直そうとしたのですが Rust と JavaScript の相互作用をするレイヤーをいじる必要があり、うまい方針が思いつかなかったため issue として起票しました。

## Pull Request

- [fix(fmt,lint): do not print number of checked files when quiet option is enabled](https://github.com/denoland/deno/pull/7579)
  - `deno fmt` や `deno lint` で、検査対象となったファイルの数を出力する機能があるのですが、`--quiet` フラグをつけたときにもこの出力が出てしまうというバグがありました。その修正です。
- [fix(logger): change log level to which prefix is added](https://github.com/denoland/deno/pull/7582)
  - 上記の修正をしている間に発見したのですが、JavaScriptレイヤーのデバッグログは `DEBUG JS - foobar` のように出力されるのに、Rustのデバッグログは `foobar` とだけ出ていました。一方、Rustはエラーレベルのログに対して `ERROR RS - foobar` というようにprefixがつくようになっていました。JSとRustで統一されていないのはおかしいだろうということで、修正してPRを立てました。

# [denoland/deno_lint](https://github.com/denoland/deno_lint)

## Issue

- [Rules that should be refined further](https://github.com/denoland/deno_lint/issues/330)
  - `deno_lint` は ESLint と typescript-eslint の recommended ルールを一通り移植することが完了しており、次のフェーズに進もうとしている段階です。そんな中で、ルールの実装を一通り見直してみると、コーナーケースに対応できていなさそうに見えるものがいくつかありました。それらをチェックリストで管理しながら修正していこう、という目的で立てた issue です。
- [Add prefer-const rule](https://github.com/denoland/deno_lint/pull/337)
  - `prefer-const` ルールを追加しようという issue です。このルールは ESLint の中でも特に有用なルールだと個人的には思っていますが、まだ `deno_lint` には実装されていなかったようです（逆に驚き）。[オリジナルの実装を見てみる](https://github.com/eslint/eslint/blob/v7.10.0/lib/rules/prefer-const.js)と、かなり大変そうということが分かりますが、良い機会なので挑戦してみることにしました。来週はこちらの実装をメインで頑張っていきます。

## Pull Request

上で挙げた、実装を少し手直しする必要があるものについてのPRです。

- [fix(no-unsafe-finally): catch violations in nested finally blocks](https://github.com/denoland/deno_lint/pull/328)
- [fix(defualt-param-last): handle nested violations](https://github.com/denoland/deno_lint/pull/329)
- [test: print source code when assertion fails](https://github.com/denoland/deno_lint/pull/331)
  - ルールを実装・修正しているとき、テストファーストで開発することが多いのですが、既存のテストユーティリティだと「どのテストが失敗したのか？」が分かりにくい形になっていました。失敗した際の出力に、対象のソースコードを追加するPRです。
- [fix(for-direction): handle nested for loops](https://github.com/denoland/deno_lint/pull/333)
- [fix(getter-return): handle nested stuff](https://github.com/denoland/deno_lint/pull/334)
- [fix(no-array-constructor): handle nested stuff](https://github.com/denoland/deno_lint/pull/335)
- [fix(no-async-promise-executor): handle nested or parenthesized stuff](https://github.com/denoland/deno_lint/pull/338)

# [RDambrosio016/RSLint](https://github.com/RDambrosio016/RSLint)

[`deno_lint` のとある issue](https://github.com/denoland/deno_lint/issues/327) の中に[ひっそりと貼られていたリンク](https://rdambrosio016.github.io/rust/2020/09/18/pure-ast-based-linting-sucks.html)で、`RSLint` という新進気鋭のRust製 JavaScript Linter があることを知りました。

作者のブログを読むと、かの rust-analyer が採用しているデータ構造を使い、柔軟な lint rule 実装が可能になるとのこと。実際、`deno_lint` でいくつかルールを実装した僕としても、ASTだけに頼った lint rule 記述はかなり窮屈で、ESLint のオリジナルの挙動を完全に模倣できているか不安な部分も結構あったりしている、という実感がありました。

そういうわけで RSLint のアーキテクチャにとても興味をもち、リポジトリを watch し始めてみたら、ちょうどいいタイミングで good first issue が作られました。これをきっかけに今週1週間でいくつかPRを送ることができたので、それをまとめます。

## Pull Request

- [Docs: Add `no-await-in-loop` doc](https://github.com/RDambrosio016/RSLint/pull/3)
  - good first issue だったものです。`no-await-in-loop` にドキュメントを追加するというもの。まだ若いプロジェクトなのに、ドキュメント生成の仕組みなどもとてもしっかり整備されていて、良い開発者体験を得ました。あと、`deno_lint` で `no-await-in-loop` を実装したのは僕で、実装のときはAST-basedなやり方の縛りをモロに受ける形となってかなり苦労したのですが、`RSLint` での実装を見てみるととってもシンプルで、素直に書かれていました。`RSLint` のアーキテクチャが優れていることをさらに実感しました。
- [Chore: allow macros to deal with trailing commas](https://github.com/RDambrosio016/RSLint/pull/5)
  - ルール実装やテストケースの作成などで使われているマクロが、trailing commaを受け付けないようになっていました。僕は trailing comma を付けたい派です。マクロが trailing comma を受け付けられるように修正しました。
- [Fix: allow `cons` method to work if there is no `else` block](https://github.com/RDambrosio016/RSLint/pull/6)
  - `if` statement について、 `else` ブロックが存在しない場合に `if (foo) { /* ここ */ }` の「ここ」部分のブロックを正しく取得できなかったので、修正しました。`=` を追加するだけという、人生で最も小さいPRです。
- [Feat: add no-setter-return](https://github.com/RDambrosio016/RSLint/pull/9)
  - `no-setter-return` ルールを実装するPRです。すでに存在していた `gette-return` ルールを参考にしつつではありますが、新規のルールを作成するという経験をすることができました。ルール自体が複雑なため `RSLint` のアーキテクチャをもってしても多少込み入った実装にはなりましたが、とはいえとても苦しい、ということはなかったです。
- [Refactor: make getter-return be consistent with others](https://github.com/RDambrosio016/RSLint/pull/11)
  - `getter-return` ルールのリファクタリングです。

# [eslint/eslint](https://github.com/eslint/eslint)

## Pull Request

- [Chore: Move comment to make tests more organized](https://github.com/eslint/eslint/pull/13707)
  - `getter-return` ルールのテストで、意地悪な位置にあるコメントがあったので、良さそうな位置に動かしました。

# [typescript-eslint/typescript-eslint](https://github.com/typescript-eslint/typescript-eslint)

## Pull Request

- [docs(eslint-plugin): add info about `allowDirectConstAssertionInArrowFunctions` option](https://github.com/typescript-eslint/typescript-eslint/pull/2586)
  - `explicit-function-return-type` というルールに `allowDirectConstAssertionInArrowFunctions` （長い…）といいうオプションがあるのですが、このオプションに関してドキュメントに一切記載がなかったので、追加するPRです。まだmergeされていません。