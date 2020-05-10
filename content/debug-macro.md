+++
title = "競技プログラミングでの使い勝手を考えたオレオレデバッグマクロを作りました"
date = 2020-05-02
[taxonomies]
tags = ["Rust", "マクロ", "競技プログラミング"]
+++

[Rust の dbg! マクロはリリースビルドでも普通に動く](@/rust-dbg-in-release.md) で書いた通り、Rust の `dbg!` マクロはリリースビルドでも動き、多大なる実行時間を消費します。

その他にもいくつか気に入らない点があり、自作のマクロを作ることで解決を試みました。

<!-- more -->

# TL;DR

```rust
macro_rules! debug {
    ($($a:expr),* $(,)*) => {
        #[cfg(debug_assertions)]
        eprintln!(concat!($("| ", stringify!($a), "={:?} "),*, "|"), $(&$a),*);
    };
}
```

というマクロを作りました。

# dbg! マクロで気に入らないところ

手軽に print デバッグをするのに便利な `dbg!` マクロですが、競技プログラミング用に使うにあたっていくつか気に入らない点がありました。

## 1. (`dbg!` という名前にも関わらず) リリースビルドでも動くので、提出前にすべて削除しなければならない

[Rust の dbg! マクロはリリースビルドでも普通に動く](@/rust-dbg-in-release.md) で書いたとおりです。レーティングを溶かす原因となったので恨んでいます。

## 2. 引数の所有権を奪ってしまう

以下のようなコードを書くとコンパイルが通りません。

```rust
let mut v = vec![1, 2, 3];
dbg!(v);
v.push(4);
```

次のようなエラーが出ます。`dbg!` のところで `v` の所有権が奪われてしまっており、その後に `v` を使うことができません。

```
error[E0382]: borrow of moved value: `v`
 --> src/main.rs:4:5
  |
2 |     let mut v = vec![1,2,3];
  |         ----- move occurs because `v` has type `std::vec::Vec<i32>`, which does not implement the `Copy` trait
3 |     dbg!(v);
  |     -------- value moved here
4 |     v.push(4);
  |     ^ value borrowed here after move
```

`dbg!` は引数に取った数をそのまま返すような振る舞いをします。つまり、上のコードは下のように書けばコンパイルが通ります。

```rust
let mut v = vec![1, 2, 3];
v = dbg!(v); // ここで v を再束縛する
v.push(4);
```

`dbg!` が複数個の引数をとるときは、タプルとして返ってきます。

```rust
let a = dbg!(2_i32, "foo"); // a: (i32, &str) = (2, "foo") になる
assert_eq!(a.0, 2);
assert_eq!(a.1, "foo");
```

……というような挙動をするのですが、個人的には `dbg!` には「とりあえずデバッグしたい値を突っ込む」ということがほとんどで、「`dbg!` に何か式を渡して、その結果を変数に束縛する」ということをしたくなる場面に出会ったことがほとんどありません。

所有権を奪われないようにするために、`dbg!` に `Copy` ではない値を渡すときにはとりあえず `&` をつけておかないといけない、というような縛りが発生して、単純にめんどくさいなぁという感情が強いです。

## 3. めっちゃ改行される

for ループの中で変数を出力して、どこで変な挙動をしているのか確認したい、みたいな場面が結構あるかと思います。

例えば以下のようなコードを書いて、 `i` と `j` の様子を確認したいという状況を考えてみます。

```rust
for i in 0..3 {
    for j in 0..2 {
        dbg!(i, j);
    }
}
```

この出力結果は以下のようになります。`i` と `j` が改行されて出力されるので、見づらくないでしょうか？

```
[src/main.rs:4] i = 0
[src/main.rs:4] j = 0
[src/main.rs:4] i = 0
[src/main.rs:4] j = 1
[src/main.rs:4] i = 1
[src/main.rs:4] j = 0
[src/main.rs:4] i = 1
[src/main.rs:4] j = 1
[src/main.rs:4] i = 2
[src/main.rs:4] j = 0
[src/main.rs:4] i = 2
[src/main.rs:4] j = 1
```

僕の理想としては 1 回のループあたりの出力が 1 行で表示されると嬉しいです。

```
i = 0, j = 0
i = 0, j = 1
i = 1, j = 0
i = 1, j = 1
i = 2, j = 0
i = 2, j = 1
```

# 理想のデバッグマクロを作った

というわけで自分好みのマクロを作ってみました。

```rust
macro_rules! debug {
    ($($a:expr),* $(,)*) => {
        #[cfg(debug_assertions)]
        eprintln!(concat!($("| ", stringify!($a), "={:?} "),*, "|"), $(&$a),*);
    };
}
```

これを使って上で出した for ループ内での `i` と `j` の出力をやってみると、次のような出力が得られます。

```
| i=0 | j=0 |
| i=0 | j=1 |
| i=1 | j=0 |
| i=1 | j=1 |
| i=2 | j=0 |
| i=2 | j=1 |
```

`Vec` や `Hashmap` はこんな感じで出力されます。

```
| v=[1, 2, 3, 4] | m={"foo": 1, "bar": 2} |
```

引数で渡した値の借用を使うようにしているので、所有権が奪われることもありません。

また、 `#[cfg(debug_assertions)]` アトリビュートを付与することで、デバッグビルドのときだけ動くようにしています。`debug!` を消さずに提出しても TLE をする心配はありません。

これで競プロでのデバッグが捗るようになりました！！

# References

- [debugging - How to check release / debug builds using cfg in Rust? - Stack Overflow](https://stackoverflow.com/questions/39204908/how-to-check-release-debug-builds-using-cfg-in-rust)
