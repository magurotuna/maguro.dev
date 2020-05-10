+++
title = "競プロ用のライブラリを Rust で作ってみたシリーズ 〜 chmin! / chmax! マクロ編〜 Appendix"
date = 2020-05-10
[taxonomies]
tags = ["Rust", "マクロ", "競技プログラミング", "競プロ用のライブラリを Rust で作ってみたシリーズ"]
+++

[Qiita に投稿したこちらの記事](https://qiita.com/TODO) の Appendix として、

- なぜマクロを使うのか
- ユニットテストの実施内容

の 2 点をこちらに載せておこうと思います。Qiita の記事を先にお読みいただければと思います。

<!-- more -->

# なぜマクロを使うのか？

大きく分けて 2 つの理由があります。まず 1 つ目は、マクロにすることで可変長引数に対応できるということです。2 つ目は、マクロにすることで所有権や借用の扱いを緩和でき、冗長な記述をする必要がなくなるからです。

## 可変長引数に対応できる

Rust の関数は可変長の引数を受け取ることができません。そのため、可変長引数を受け付けたい場合にはマクロを使って実装されます。

例えば、Rust 組み込みの `vec!` マクロが分かりやすいです。 `vec!` は、以下のようにして可変長の引数を受け付けることができます。

```rust
let v1 = vec![1, 2, 3, 4];
```

または、関数呼び出しとはまったく違った形式での呼び出しもできます。

```rust
let v2 = vec![1; 4]; // vec![1, 1, 1, 1] と同じものが生成される
```

このような自由で柔軟な書き方ができるのがマクロの強力なポイントです。

今回、 `chmin!` `chmax!` マクロを作るにあたって決めた仕様で、 **可変長の引数に対応したい** というものがありました。この要件を Rust で満たすためには、マクロという選択肢を取ることになります。

## 冗長な記述が不要になる

仮に、仕様から **可変長の引数に対応したい** を取り除いてみたとしましょう。つまり、2 つの引数だけを受け付ければ良いということになります。

このような場合にはわざわざマクロを使って実装せず、関数を使うことも可能になります。

Qiita の記事で `chmin!` が有用な例として挙げたワーシャル-フロイド法の実装で使えるような `chmin` を、マクロではなく関数で作ってみることを考えてみます。

```rust
for k in 0..N {
    for i in 0..N {
        for j in 0..N {
            // ↓の行をマクロではなく関数で実現する方法を考える
            chmin!(dist[i][j], dist[i][k] + dist[k][j]);
        }
    }
}
```

第 1 引数で渡した値を変更する可能性があるので、可変参照とする必要があります。また、値を更新したのかどうかを `bool` で返すという仕様も忘れずに実装する必要があります。素直な実装は以下のようになると思います。

```rust
fn chmin(a: &mut i32, b: i32) -> bool {
    if *a > b {
        *a = b;
        true
    } else {
        false
    }
}
```

これを使って以下のようなコードを書いてみると、仕様通りの挙動となっていることが確認できます。

```rust
let mut v = vec![10, 2, 3];
let changed = chmin(&mut v[0], 8);
assert_eq!(v, vec![8, 2, 3]); // 0番目が 8 に更新されている
assert!(changed); // 更新が実行されたので true
```

一見問題なさそうに見えますが、ワーシャル-フロイド法などの動的計画法でよくある **他の添字の値を使って更新する** というケースを試してみると………

```rust
let mut v = vec![10, 2, 3];
// v[1] の値を使って v[0] を更新するかを決めたい
let changed = chmin(&mut v[0], v[1] + 6);
assert_eq!(v, vec![8, 2, 3]);
assert!(changed);
```

これはコンパイルが通りません。

```sh
let changed = chmin(&mut v[0], v[1] + 6);
              -----      -     ^ immutable borrow occurs here
              |          |
              |          mutable borrow occurs here
              mutable borrow later used by call
```

`v[1]` という不変の借用と、`&mut v[0]` という可変の借用が同時に存在してしまうという、典型的な怒られが発生してしまいました。これを回避するためには、 `v[1]` をあらかじめ別の変数に束縛させておけば大丈夫です。以下のように書けばコンパイルが通ります。

```rust
let mut v = vec![10, 2, 3];
let tmp = v[1]; // 一時変数に退避
let changed = chmin(&mut v[0], tmp + 6);
assert_eq!(v, vec![8, 2, 3]);
assert!(changed);
```

つまり、ワーシャル-フロイド法をこの **`chmin` 関数**で書くには、同様に一時変数に退避させる必要があります。

```rust
for k in 0..N {
    for i in 0..N {
        for j in 0..N {
            let tmp = dist[i][k] + dist[k][j];
            chmin(&mut dist[i][j], tmp);
        }
    }
}
```

1. 第 1 引数に `&mut` をつける必要がある
2. 第 2 引数を一時変数に退避させる必要がある

の 2 点が非常にイケてなく、手間を減らすために `chmin` を導入しようとしているにも関わらず、逆に `chmin` に振り回されてしまっているという本末転倒な状況になってしまっています。

マクロを使うことで、このような煩わしさから解放され、スッキリとした `chmin!` `chmax!` を実現できるということです。

逆に言うと、`chmin` を関数で書くことによって、**第 1 引数が変更される可能性があるのだな** ということが関数のシグネチャから一目瞭然になるというメリットがあります。競プロのような使い捨てのコードではなく、長期的に保守をしていくコードを書くときにはこういった些細な点がメンテナビリティの向上につながることが多いように思います。すべての場合においてマクロ版の実装が関数版より優れているということではなく、時と場合によって使い分けることが重要かなと思います。

# chmin! chmax! マクロのユニットテストについて

ユニットテストは最高の仕様書なので、ユニットテストの内容をかんたんに紹介していきます。

GitHub 上で見たい場合は以下のリンクからご覧ください。

- [libprocon/min_max.rs at master · magurotuna/libprocon](https://github.com/magurotuna/libprocon/blob/b13db5e779568545590476e0c83b31c92a54140c/tests/min_max.rs)

## min! と max! の基本的なテスト

補助として作った `min!` と `max!` の基本的な動作のテストです。引数 1 個のときはそのまま返すことも確認しています。

```rust
// min
assert_eq!(0, min!(0, 1, 2, 3, 4, 5, 2, 4, 5));
assert_eq!(-5, min!(0, 1, 2, 3, 4, -5, 2, 4, 5));
assert_eq!(10, min!(12542, 2142, 2256, 525, 10, 21, 11));
assert_eq!(0, min!(0));

// max
assert_eq!(5, max!(0, 1, 2, 3, 4, 5, 2, 4, 5));
assert_eq!(5, max!(0, 1, 2, 3, 4, -5, 2, 4, 5));
assert_eq!(12542, max!(12542, 2142, 2256, 525, 10, 21, 11));
assert_eq!(0, max!(0));
```

## min! と max! で末尾にカンマがついている場合のテスト

trailing comma があっても問題なく動きます。

```rust
// min
assert_eq!(0, min!(0, 1, 2, 3, 4, 5, 2, 4, 5,));
assert_eq!(0, min!(0, 1, 2, 3, 4, 5, 2, 4, 5,,));
assert_eq!(0, min!(0,,,));

// max
assert_eq!(5, max!(0, 1, 2, 3, 4, 5, 2, 4, 5,));
assert_eq!(5, max!(0, 1, 2, 3, 4, 5, 2, 4, 5,,));
assert_eq!(0, max!(0,,,));
```

## chmin! と chmax! の基本的なテスト

`chmin!` と `chmax!` について、更新がある場合とない場合で動くことを確認しています。

```rust
// min
let mut ans = 42;
let changed = chmin!(ans, 100, 0, -5, 100 * 2, 100 / 2);
assert_eq!(ans, -5);
assert!(changed);

let mut ans = -10;
let changed = chmin!(ans, 100, 0, -5, 100 * 2, 100 / 2, -10);
assert_eq!(ans, -10);
assert!(!changed);

// max
let mut ans = 42;
let changed = chmax!(ans, 100, 0, -5, 100 * 2, 100 / 2);
assert_eq!(ans, 200);
assert!(changed);

let mut ans = 201;
let changed = chmax!(ans, 100, 0, -5, 100 * 2, 100 / 2, 201);
assert_eq!(ans, 201);
assert!(!changed);
```

## chmin! と chmax! で末尾にカンマがついている場合のテスト

こちらも trailing comma に対応しているのでそのテストです。

```rust
// min
let mut ans = 42;
let changed = chmin!(ans, 100, 0, -5, 100 * 2, 100 / 2,);
assert_eq!(ans, -5);
assert!(changed);

let mut ans = 42;
let changed = chmin!(ans, 100, 0, -5, 100 * 2, 100 / 2,,);
assert_eq!(ans, -5);
assert!(changed);

let mut ans = 42;
let changed = chmin!(ans, 42, 50, 43, 100,,,,,,);
assert_eq!(ans, 42);
assert!(!changed);

// max
let mut ans = 42;
let changed = chmax!(ans, 100, 0, -5, 100 * 2, 100 / 2,);
assert_eq!(ans, 200);
assert!(changed);

let mut ans = 42;
let changed = chmax!(ans, 100, 0, -5, 100 * 2, 100 / 2,,);
assert_eq!(ans, 200);
assert!(changed);

let mut ans = 42;
let changed = chmax!(ans, 0, -2, -40, 42, 30);
assert_eq!(ans, 42);
assert!(!changed);
```

## chmin! と chmax! でベクタの値を変更する場合のテスト

DP でよく出てくるパターンのテストです。

```rust
// min
let mut v = vec![1, 2, 3];
let changed = chmin!(v[1], v[0], 0, -5, 100 * 2, 100 / 2,);
assert_eq!(v, vec![1, -5, 3]);
assert!(changed);

let mut v = vec![1, 2, 3];
let changed = chmin!(v[2], v[1] - 10, 0, -5, 100 * 2, 100 / 2,,);
assert_eq!(v, vec![1, 2, -8]);
assert!(changed);

let mut v = vec![1, 2, 3];
let changed = chmin!(v[0], 10, 200, 3000);
assert_eq!(v, vec![1, 2, 3]);
assert!(!changed);

// max
let mut v = vec![1, 2, 3];
let changed = chmax!(v[1], v[0], 0, -5, 100 * 2, 100 / 2,);
assert_eq!(v, vec![1, 200, 3]);
assert!(changed);

let mut v = vec![1, 2, 3];
let changed = chmax!(v[2], v[1] * 200, 0, -5, 100 * 2, 100 / 2,,);
assert_eq!(v, vec![1, 2, 400]);
assert!(changed);

let mut v = vec![1, 2, 3];
let changed = chmax!(v[0], -100, 0, -5,,,);
assert_eq!(v, vec![1, 2, 3]);
assert!(!changed);
```

# 最後に

いつも宣伝している気がするのですが、ユニットテストを書いた上でコードをスニペット化して素早くエディタで入力できるようにするためのツール `cargo-snippet` がオススメです！

- [Rust で競技プログラミングをするときの"スニペット管理"をまじめに考える(cargo-snippet の紹介) - Qiita](https://qiita.com/hatoo@github/items/5c6814e72ddd2ecaf48f)
- [maguro.dev - cargo-snippet に PR を出し、爆速で merge されました](@/cargo-snippet-pr.md)
