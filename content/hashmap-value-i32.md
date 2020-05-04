+++
title = "HashMap / BTreeMap に何かの回数を値として管理させるときにはオーバーフローに注意しなければならない"
date = 2020-05-04
[taxonomies]
tags = ["Rust", "競技プログラミング"]
+++

昨日の [ABC166](https://atcoder.jp/contests/abc166) の [E - This Message Will Self-Destruct in 5s](https://atcoder.jp/contests/abc166/tasks/abc166_e) にて、 `std::collections::HashMap` や `std::collections::BTreeMap` を何も考えずに使用してしまい、WAをとってしまったため自戒としてまとめておこうと思います。

<!-- more -->

# TL;DR

以下のように書くと `HashMap` の値は `i32` であると推論され、容易にオーバーフローを起こしうるので、どこかで型を明示するなりして 64bit にしたほうが良い

```rust
use std::collections::HashMap;

let mut map = HashMap::new();
*map.entry("foo").or_insert(0) += 1;
```

↓のように書くことを意識付けする

```rust
use std::collections::HashMap;

let map = HashMap::new();
*map.entry("foo").or_insert(0) += 1_u64; // i64 か u64 と明示的に指定
```

# 悲劇

[昨日の ABC166 の E 問題](https://atcoder.jp/contests/abc166/tasks/abc166_e) で、いろいろ式変形をしてみると、結局以下のような問題に帰着されることがわかります。

> \\(i + A_i = j - A_j\\) を満たすような \\(i < j\\) なる \\( i, j \\) の組み合わせの個数

これを数え上げるには連想配列などのデータ構造を用いるのが効率的で、例えば数列 \\(A\\) を後ろの方から舐めていって、連想配列には今のインデックス \\(i\\) に対して \\(i - A_i\\) の値が出現した回数を格納していきます。そして、 \\(i + A_i\\) という値がそれまでに何回出現したか？というのを足し合わせていけば答えが得られるという寸法です。Rust では `std::collections::HashMap` あるいは `std::collections::BTreeMap` を使えば良いですね。

ここまでの考察と実装は比較的スムーズにできて、サンプルも問題なく通ったので意気揚々と提出してみたら、6ケースで **WA** になりました。

結局、コンテスト中にはこの **WA** の原因がわからず、パフォーマンスも冷え込んでしまいました。辛い。

# 原因

冒頭に書いたとおり、これはオーバーフローが原因でした。コンテスト後のタイムラインで以下のツイートを見かけてハッ！！！！となりました。

<blockquote class="twitter-tweet"><p lang="ja" dir="ltr">Eはrustで let mut map = HashMap::new(); みたいに適当に型推論させてたらWAした</p>&mdash; じーた (@ziita1111) <a href="https://twitter.com/ziita1111/status/1256944172566671364?ref_src=twsrc%5Etfw">May 3, 2020</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

タイムラインをざっと眺めるだけでも、自分を含めて3人は同様の被害に遭っていたため、これは基本の整数型が 32bit であって、さらに型を推論に任せてしまいがちな Rust にはあるあるの事象なのかもしれません。

# どのようにすればコンテスト中に気づけたか

終わったことを悔やみ続けてもしょうがないので、どうすればコンテスト中に気づけたのかをまとめて今後の糧としていきたいと思います。

## 1. 問題文と制約をぐっと睨む

問題文に以下のような記述が丁寧に書かれています。

> \\(N\\) 人の参加者のうちから 2 人を選んでペアにする方法は \\(\frac{N(N−1)}{2}\\) 通りありますが、

また、制約には \\(N\\) について以下のように書かれています。

> \\(2 \leq N \leq 2 \times 10^5 \\)

この2つのことから、答えのオーダーが \\(10^{10}\\) くらいになってもおかしくないということがなんとなく示唆されているように思います。そうであれば 32bit では収まりません。

300点問題くらいまでであれば、答えが 32bit 整数型に収まらない可能性がある場合にはそのような注意書きがある場合が多い印象がありますが、500点問題ともなれば、答えのオーダーを概算して適切な型を使う能力も求められてくる、ということを痛感しました。

## 2. rust-analyzer などの type hints 表示を見てみる

VSCode で rust-analyzer を使うと、型のヒントが表示されます。これを見れば `HashMap` の値が `i32` として推論されていることがわかり、コンテスト中にこれではまずいと気づけたかもしれません。

<img src="/img/hashmap-type-hint.gif" alt="accepted-snippet" />

このように、何も指定しないと `i32` として推論されていて、どこか1箇所でも型を明示的に指定すると、それに応じて `HashMap` のほうの推論結果も変わる様子が視覚的によく分かります。

普段僕は `neovim` + `coc.nvim` という環境で開発をしているのですが、最近メソッドチェーンでの type hints 表示に対応したものの普通の変数などに関しては表示されない状態のため、VSCode いいなぁ〜と指をくわえています……

この issue によるとメソッドチェーン以外の hint 表示は今の vim/neovim だと難しい感じのようです。行の途中に virtual text を入れるのに対応してないって感じかな？

- [Question: Inlay hints · Issue #224 · fannheyward/coc-rust-analyzer](https://github.com/fannheyward/coc-rust-analyzer/issues/224)

neovim に立っているこちらの PR の状況も注視していく価値がありそうです。

- [[WIP] New decorations API (extend nvim_buf_set_extmark) by bfredl · Pull Request #11745 · neovim/neovim](https://github.com/neovim/neovim/pull/11745)

## 3. 経験を積む

結局のところ、コンテスト本番中に痛い目に遭ったり精進中にさまざまなコーナーケースを踏んだりすることが、遠回りのように見えて実は一番の近道なのかもしれないと思い始めています。

過去に [Rust の dbg! マクロはリリースビルドでも普通に動く](@/rust-dbg-in-release.md) で書いたように、`dbg!` マクロを消さずに提出して TLE となってレートを溶かしたことがあったのですが、それ以降は同じミスを犯したことはないですし、さらに [リリースビルド時には動かない自分好みのデバッグマクロを作る](@/debug-macro.md)などして、ミスが起こりにくいような仕組み作りをするきっかけにもなりました。

どんどんコンテストに出たり精進をしたりして、自分の中の「競プロトラブル経験値」を蓄積させていきながら成長できればなと思っています。

# まとめ

- 問題文と制約から答えのオーダーを見積もることを意識する
- 整数リテラルには `i64` なり `u64` なりつけておくと安心 (※ Codeforces は `usize` が 32bit なので注意)
- 特に `HashMap` や `BTreeMap` で何かの出現回数などを管理させるときに気をつける
- VSCode の rust-analyzer はすごい
- ひたすら精進してコンテストに出るのが大事！！！！！
