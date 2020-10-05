+++
title = "Weekly Report 2020/10/04"
date = 2020-10-05
[taxonomies]
tags = ["OSS", "Weekly Report"]
+++

週報2回目です。毎週日曜日に更新するつもりでしたが早速すっぽかしました。

今週は [Hacktoberfest](https://hacktoberfest.digitalocean.com/) が始まっていろんな意味でOSS界隈が盛り上がりました。僕もTシャツ狙って軽めのタスクを一気にやったのですが、あとから Hacktoberfest の対象になるためには opt-in する必要があるということになって、少し悲しい……

<!-- more -->

# [denoland/deno_lint](https://github.com/denoland/deno_lint)

## Issue

- [False positives in "prefer-const"](https://github.com/denoland/deno_lint/issues/358)
  - `prefer-const` ルールを実装したんですが、Deno の `std` に対して適用してみるといくつか false positive が見つかりました。それを直す作業をやることになりました。
- [getter-return and infinite loops](https://github.com/denoland/deno_lint/issues/348)
  - `getter-return` というルールで、`while` の中から `return` で抜けるようなコードを書くと false positive が発生するよという issue です。ESLint の実装と deno_lint の実装を見比べてみると、deno_lint は `if` と `switch` だけを個別処理しているのに対して、ESLint では `CodePath` というものの解析結果を使っているようでした。おそらく issue で報告されている問題を解決するためには ESLint のアプローチを拝借させていただくのが良いだろう、というところまで当たりはついているので、時間に余裕ができたら着手しようかと思っています。
- [bug: unconditional return in constructor produces unreachable code after class](https://github.com/denoland/deno_lint/issues/353)
  - `no-unreachable` についてのバグ報告。[fix(control_flow): handle class constructors](https://github.com/denoland/deno_lint/pull/355) にて修正

## Pull Request

- [add Camelcase rule](https://github.com/denoland/deno_lint/pull/302)
  - `camelcase` ルールを追加するPRです。立てたのは9月上旬ですが、これを導入すると Deno の `std` への影響が大きく、しばらく保留となっていました。 `std` の修正が進められる中で、「このルール、変数の宣言だけじゃなくて参照に対してもチェックをかけている (`obj.foo_bar = 1;` って書くと `foo_bar` に対して怒る、みたいな) けど、それってイケてなくね？」（意訳）という意見が出て、なるほど確かに……となっているのが現状です。ESLintのオリジナルの実装に従うのであれば参照もエラー対象なのですが、そこを改変するか否か、議論中です。といっても議論は全然進んでいなくて、そもそもこのルールに対してみんなの関心が多少薄そう……という印象
- [add prefer-const rule](https://github.com/denoland/deno_lint/pull/342)
  - `prefer-const` を実装しました。結構な大作 (当社比) ですが、のちほどいくつかの実装漏れが見つかり、大幅な手直しをすることになりました。
- [fix(prefer-const): handle `+=` and `-=` correctly](https://github.com/denoland/deno_lint/pull/345)
  - `prefer-const` について、実装漏れを修正
- [fix(prefer-const): treat param of catch clause like thet of function](https://github.com/denoland/deno_lint/pull/347)
  - `prefer-const` について、実装漏れを修正
- [fix(no-class-assign): increase tests and fix to pass them](https://github.com/denoland/deno_lint/pull/352)
  - 軽微な修正
- [fix(no-compare-neg-zero): handle nested stuff](https://github.com/denoland/deno_lint/pull/354)
  - 軽微な修正
- [fix(control_flow): handle class constructors](https://github.com/denoland/deno_lint/pull/355)
  - `no-unreachable` のバグを修正
- [fix(no-case-declarations): handle nested switch statements](https://github.com/denoland/deno_lint/pull/356)
  - 軽微な修正
- [fix(prefer-const): handle nested assignments correctly by magurotuna · Pull Request #361 · denoland/deno_lint](https://github.com/denoland/deno_lint/pull/361)
  - `prefer-const` について、ネストされた代入文に対応できるようにする修正

# [typescript-eslint/typescript-eslint](https://github.com/typescript-eslint/typescript-eslint)

## Pull Request

- [docs(eslint-plugin): add info about `allowDirectConstAssertionInArrowFunctions` option](https://github.com/typescript-eslint/typescript-eslint/pull/2586)
  - 先週「まだmergeされていません」となっていたPRです。無事にmergeされました。