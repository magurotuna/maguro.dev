+++
title = "Rust の dbg! マクロはリリースビルドでも普通に動く"
date = 2020-03-08
[taxonomies]
tags = ["Rust", "AtCoder", "競技プログラミング"]
+++

[AtCoder Beginner Contest 158](https://atcoder.jp/contests/abc158) に参加したところ、思わぬところでハマってしまいレートを溶かしてしまったので、反省のためにまとめておきます。

`dbg!` マクロの挙動についてです。

<!-- more -->

# 対象の問題

> ## D - String Formation
>
> ### 概要
>
> 英小文字からなる文字列 \\(S\\) がある。
> \\(S\\) に対して、与えられた \\(Q\\) 回の操作を順番に施す。操作は以下の 3 種類のうちいずれかである。
>
> #### ＜操作＞
>
> 1. 文字列 \\(S\\) の前後を反転する
> 2. 文字列 \\(S\\) の先頭に文字 \\(C_i\\) を追加する
> 3. 文字列 \\(S\\) の末尾に文字 \\(C_i\\) を追加する
>
> \\(Q\\) 回の操作の後、最終的にできる文字列を求めなさい。
>
> ### 制約
>
> - 文字列 \\(S\\) の長さは \\(10^5\\) 以下
> - \\(S\\) は英小文字からなる
> - \\(1 \leq Q \leq 2 \times 10^5\\)
> - \\(C_i\\) は英小文字

# コンテスト中の思考

順番に操作を処理していくけど、文字列の反転操作は愚直に毎回実行するとコストが大きそう。
「反転フラグ」みたいなものを用意しておいて、「今、文字列は反転状態なのか？そうでないのか？」を仮想的に扱えるようにすればよさそう。
例えば、「反転フラグ」が `true` の状態で `先頭 に x を追加する` という操作を行うのと、「反転フラグ」が `false` の状態で `末尾に x を追加する」という操作を行うのは、等価とみなせる！

これをコードに落とし込めば、計算量的には \\(O(Q)\\) でいけるはず。
先頭に追加したり末尾に追加したりするから、 `Vec` じゃなくて `VecDeque` を使うことにだけ注意しよう。

# 実装

コンテスト中の自分は上のような思考を辿り、以下のように実装をしました。

```rust
fn main() {
    let S: String = read();
    let S: Vec<char> = S.chars().collect();
    let Q: usize = read();
    let query = read_vec2(Q as u32);
    use std::collections::VecDeque;
    let mut S: VecDeque<_> = S.into();
    let mut reverse = false; // 反転フラグ

    for i in 0..Q {
        let q = &query[i];
        dbg!(&query[i], &q);
        if q[0] == '1' {
            reverse = !reverse;
        } else {
            let f = q[1];
            let c = q[2];
            if (!reverse && f == '1') || (reverse && f == '2') {
                // 反転フラグが立っていない状態で先頭に追加するのと、反転フラグが立っている状態で末尾に追加することが等価
                S.push_front(c);
            } else if (!reverse && f == '2') || (reverse && f == '1') {
                // ↑の反対、末尾に追加するパターン
                S.push_back(c);
            }
        }
    }
    let ans: String = if reverse {
        // Q 回の操作を終えたあと、反転フラグが立っているならば、実際の反転処理を行う
        S.into_iter().rev().collect()
    } else {
        S.into_iter().collect()
    };
    println!("{}", ans);
}

```

テストケースも無事にパスし、ノリノリで提出をしました。
（なお、[tanakh/cargo-atcoder](https://github.com/tanakh/cargo-atcoder) を使用して、ローカルでビルドしたものを提出しています。）

# 提出結果

<img width="1106" alt="スクリーンショット 2020-03-07 23.42.41.png" src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/151210/37f2216f-95a5-301a-e61d-0abe6294378d.png">

.......なんで ❗️❓❗️❓❗️❓❗️❓

# コンテスト終了後

Rust の文字列操作は実はめちゃくちゃ重たいのか…？ `VecDeque` は重いのか？？ `.rev()` が重いとか？？
など、あらゆる可能性を考え、疑心暗鬼に陥っていました。

Rust の標準ライブラリのドキュメントをチェックしていき、[std::dbg - Rust](https://doc.rust-lang.org/std/macro.dbg.html) にたどり着いた自分の前に、この文章が現れました。

> The dbg! macro works exactly the same in release builds. This is useful when debugging issues that nly occur in release builds or when debugging in release mode is significantly faster.

———— **dbg! マクロってリリースビルドでも動くのか！！！！！！！！！！！！**

# 再提出

デバッグ用に

```rust
dbg!(&query[i], &q);
```

を書いていたのですが、これはリリースビルドでは無効化されるものだと勝手に思い込んでいました。
`dbg!` を消して提出したところ、50ms で AC しました。
（ `dbg!` 高々 20 万回実行するだけでめちゃくちゃ時間かかるんですね……）

コンテスト中の最初の提出で通っていればギリギリ水色パフォが出ていたものの、この `dbg!` による TLE のせいで茶色パフォになってしまいました。

`dbg!` はリリースビルドでも動く、って常識なんでしょうか？
僕と同じ被害に遭う方を少しでも減らせれば幸いです。

# 2020/05/10 追記

同じ悲劇を二度と起こさないため、リリースビルドでは無効化されるオレオレデバッグマクロを自作しました。
下のエントリで紹介しているので、ぜひご覧ください。

- [競技プログラミングでの使い勝手を考えたオレオレデバッグマクロを作りました](@/debug-macro.md)
