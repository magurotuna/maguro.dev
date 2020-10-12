+++
title = "Weekly Report 2020/10/11"
date = 2020-10-12
[taxonomies]
tags = ["OSS", "Weekly Report"]
+++

週報3回目です。毎週日曜日に更新するつもりでしたが早速すっぽかしました(2回目)。
今週は `deno_lint` 中心で作業しました。

<!-- more -->

# [denoland/deno_lint](https://github.com/denoland/deno_lint)

## Pull Request

- [fix(prefer-const): refactor & handle hoisting](https://github.com/denoland/deno_lint/pull/362)
  - 以前自分が実装した `prefer-const` ルールにおいて、変数の巻き上げに対応できていなかったのを修正したPRです。たかが変数の巻き上げに対応するだけなのですが、実装をほぼまるっと変える必要があって、かなり大変でした。テストも含めてですが、差分が +1,381 −418 なので僕が今まで OSS に出した PR の中では最大かもしれないです。
- [chore: enable prefer-const again](https://github.com/denoland/deno_lint/pull/369)
  - `prefer-const` が今度こそ完成したのですが、recommended rules (Deno 本体から使われるルールセット) に入れ直すのを忘れていました。入れるだけのPRです。
- [refactor: remove Arc/Rc](https://github.com/denoland/deno_lint/pull/383)
  - コードを眺めていて「この `Rc` / `Arc` いらなそうだなぁ」と思ったところがあったので、これらを使わないように書き換えてみました。`Rc` / `Arc` は不要になったものの、代わりに `Vec` のアロケーションが発生したりして、効率向上につながったかは謎ですが、approve されたので良しとします(それでいいのか)
- [refactor: use matches!](https://github.com/denoland/deno_lint/pull/384)
  - おそらく Rust 1.47 から、`matches!` マクロを使えるところで使っていないと clippy が文句を言ってくるようになりました。その対応と、ついでに GitHub Actions 上で動く Rust のバージョンアップおよび README の修正を行いました。
- [fix(getter-return): use ControlFlow to check if getters return something](https://github.com/denoland/deno_lint/pull/382)
  - [こちらの issue](https://github.com/denoland/deno_lint/issues/348) で報告されている false positive を修正すべく、`Control Flow` と呼ばれている制御構造の解析器をいじったPRです。最初 `Control Flow` の解析がどのように動いているのかまったく分からず、いろいろテストを追加しながらやってたらまた大きめの PR になってしまいました。レビュー待ちです。

# 雑記

[`RSLint`](https://github.com/RDambrosio016/RSLint) が爆速でスターを伸ばしていて、あっという間に [`deno_lint`](https://github.com/denoland/deno_lint) のスター数を追い抜きました。どこかでバズったりしてるのかな？ Reddit でかなり upvote を集めているのはみかけました。

`RSLint` のロードマップなどちらっとチェックしていますが、すごく計画性があるというか、プロジェクトとして大成させるための長期的な見通しが明確に見えているのだなというのが伝わってきてすごいです。あと内部実装も行き当たりばったりというわけではなく、すべてを理解しながら書かれているとってもきれいで整理されたコードという印象を抱きました。

今後もしっかりウォッチしていって、コントリビュートもしていければと思います。