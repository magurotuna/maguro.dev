+++
title = "Rust のトレイトで、associated type (関連型) か generic type (ジェネリクス) のどちらを使うか迷ったときの指針"
date = 2020-08-26
[taxonomies]
tags = ["Rust", "trait", "associated type", "generic type"]
+++

Rust に[トレイト](https://doc.rust-lang.org/book/ch10-02-traits.html)という機能があります。
自分でトレイトを作るときに、そのトレイトに関連するジェネリックな型が欲しくなることがしばしばあります。そんなときの選択肢として

1. associated type (関連型)
2. generic type (ジェネリクス、型パラメータ)

の2つがあると思います（2番に関しては、正しい呼称かどうか自信がないです。`trait Foo<T> {}` と定義したときの `T` のことを指しています）。そして、どちらを使っても自分のやりたいことを実現できるな……と気づくことがあります。そのようなときに、どちらを使うのが良いのか分からなくなることがよくあるので、忘れないようにエントリとしてまとめておきます。

<!-- more -->

# TL;DR

associated type は **トレイトと実装対象の型 (Self) との関係が 1 : 1** になる。

generic type だと **トレイト : Self = N : 1** になる。

トレイト : Self = 1 : 1 の関係が成り立つのであれば、associated type を使うのが良い。

# `lower_bound` を `Vec<T>` に生やす、という具体例で考えてみる

2020年8月25日に [Shinjuku.rs #11](https://forcia.connpass.com/event/182303/) というイベントがオンライン開催されました。その発表の中で、「トレイトを使って、`Vec` に [`lower_bound`](http://www.cplusplus.com/reference/algorithm/lower_bound/) (C++ にある、二分探索を行っていい感じのインデックスを返してくれるメソッド) を追加する」という内容のライブコーディングがありました。

おおよそ以下のようなコードだったと思います。

```rust
trait LowerBound<T> {
    fn lower_bound(&self, x: &T) -> usize;
}

impl LowerBound<i32> for Vec<i32> {
    fn lower_bound(&self, x: &i32) -> usize {
        // 実装は省略
    }
}
```

トレイトは Rust でポリモーフィズムを実現するための中心的な機能ですが、他の場所で定義されている型（ここでは `Vec<i32>`）にメソッドを追加する、といったことも可能、というような紹介がされました。

この例を使って associated type と generic type について考えてみます。

上記では generic type が使われていて、`LowerBound<i32>` を `Vec<i32>` に対して実装する、という構図になっています。ここで、`lower_bound` は二分探索を行うので、`Vec` の要素に関して `Ord` であることが要求されていると考えられます。ちょっと修正をして以下のようにしてみます。

```rust
// T: Ord を追加
trait LowerBound<T: Ord> {
    fn lower_bound(&self, x: &T) -> usize;
}

// T: Ord を追加
impl<T: Ord> LowerBound<T> for Vec<T> {
    fn lower_bound(&self, x: &T) -> usize {
        // 実装は省略
    }
}
```

こうすることで、`T: Ord` であるような任意の型 `T` に対して、`Vec<T>` で `lower_bound` というメソッドを使うことができるようになります。いい感じです。

```rust
// Vec<i32> に対して lower_bound が使える
let v: Vec<i32> = vec![1, 2, 4, 4, 9];
assert_eq!(v.lower_bound(&4), 2);

// Vec<&str> に対しても lower_bound が使える
let v: Vec<&str> = vec!["aa", "ab", "ab", "bb"];
assert_eq!(v.lower_bound(&"ab"), 1);
```

ここで少し立ち止まって考えてみると、これは associated type でも実現可能なのでは？ということに気づきます。

```rust
trait LowerBound {
    // associated type として Item 型を定義
    type Item: Ord;
    fn lower_bound(&self, x: &Self::Item) -> usize;
}

impl<T: Ord> LowerBound for Vec<T> {
    type Item = T;
    fn lower_bound(&self, x: &Self::Item) -> usize {
        // 実装は省略
    }
}
```

このように書いた場合にも、上と同じように `T: Ord` であるような任意の型 `T` に対して、`Vec<T>` で `lower_bound` というメソッドが使えるようになります。

はて、どちらの書き方が良いのでしょうか？🤔

# generic type と associated type の違い

今回のケースでは associated type と generic type の両方でやりたいことを実現できましたが、必ずしもそうではないです。「generic type では実現できるけど、associated type では無理」というケースが存在します。

## std::convert::From トレイトから学ぶ generic type

標準ライブラリの [`std::convert::From` トレイト](https://doc.rust-lang.org/std/convert/trait.From.html) を例にあげてみます。トレイト定義は以下のようになっています。

```rust
trait From<T> {
    fn from(t: T) -> Self;
}
```

名前の通り、ある型からある型への変換を定義することができます。例えば `impl From<[u8; 4]> for IpAddr` というような実装があり、これは素直に 「要素数 4 の `u8` 配列から、`IpAddr` 型に変換することができる」 というように読めます。

`From` は generic type が使われているため、**1つの型に対して、さまざまな型からの変換を定義することができます**。例えば、Rust の `IpAddr` 型は以下のように IPv4 と IPv6 の enum として定義されているので、IPv6 も表現することができます。

```rust
enum IpAddr {
    V4(Ipv4Addr),
    V6(Ipv6Addr),
}
```

ということは、さきほど出てきた `[u8; 4]` -> `IpAddr` の変換 (IPv4 への変換) だけではなく、`[u16; 8]` -> `IpAddr` という変換 (IPv6 への変換) も定義されているのが自然です。generic type であれば、これが可能です！

```rust
// [u8; 4] から IpAddr への変換を定義することもできるし、
impl From<[u8; 4]> for IpAddr {
    // 略
}

// 同時に [u16; 8] から IpAddr への変換を定義することもできる
impl From<[u16; 8]> for IpAddr {
    // 略
}
```

もし `From` トレイトが generic type ではなく associated type を使って定義されていた場合には、このようなことはできません。

```rust
// associated type を使って From を実現しようとあがいてみる
trait MyFrom {
    type From;
    fn from(t: Self::From) -> Self;
}

// [u8; 4] -> IpAddr の変換を定義
impl MyFrom for IpAddr {
    type From = [u8; 4];
    fn from(t: Self::From) -> Self { /* 略 */ }
}

// [u16; 8] -> IpAddr の変換を定義……したいが、上と被ってしまって不可能
impl MyFrom for IpAddr {
    type From = [u16; 8];
    fn from(t: Self::From) -> Self { /* 略 */ }
}
```

`IpAddr` に対して、`From` トレイトを使って複数の型からの変換を定義することができるのは、`From` がジェネリックな形で定義されているから、ということになります。

## std::iter::Iterator トレイトから学ぶ associated type

逆に、標準ライブラリの中で associated type を使って定義されているトレイトも例として見てみます。[`std::iter::Iterator` トレイト](https://doc.rust-lang.org/std/iter/trait.Iterator.html) を取り上げます。

```rust
trait Iterator {
    type Item;
    fn next(&mut self) -> Option<Self::Item>;
    // 以下略
}
```

「もし `Iterator` トレイトが associated type ではなく generic type を使うようになっていたら？」という思考実験をしてみましょう。`MyIterator` を定義してみます。

```rust
trait MyIterator<T> {
    fn next(&mut self) -> Option<T>;
}
```

さきほども書いた通り、トレイトが型パラメータをもった形で定義されているときには、1つの型に対して複数パターンの実装ができることになります。

```rust
// IntoIter<i32> (= Vec<i32> のイテレータ) に対して、
// オレオレイテレータ MyIterator<i32> を実装
impl MyIterator<i32> for IntoIter<i32> { /* 略 */ }

// MyIterator はジェネリックなトレイトなので、
// IntoIter<i32> に対していろいろな実装ができてしまう！
impl MyIterator<i64> for IntoIter<i32> { /* 略 */ }
impl MyIterator<usize> for IntoIter<i32> { /* 略 */ }
impl MyIterator<bool> for IntoIter<i32> { /* 略 */ }
```

実際に上のような実装をすることは無いと思いますが、「やろうと思えばできてしまう」というのが重要です。イテレータの場合は、実装対象の型に対して、イテレートしていきたいアイテムの型というのは1つしかないはずです。つまり、`IntoIter<i32>` に対してはアイテムの型は `i32` だけしか考えられません。

このような場合には、 associated type を使うのが正解です。associated type を使った場合には、**1つの型に対して、そのトレイトの実装が複数存在することはない** という制限をかけることができる、ということになります。

## associated type と generic type の違いを一言で

- associated type のときには、**1つの型に対して、そのトレイトの実装は1つ**
- generic type のときには、**1つの型に対して、そのトレイトの実装を複数行うことができる** (型パラメータを変えながら)

# associated type と generic type の合わせ技パターンもある

ここまで理解できたところで、もう1つだけ、標準ライブラリからトレイトを取り上げたいと思います。[std::ops::Add](https://doc.rust-lang.org/std/ops/trait.Add.html) です。

```rust
trait Add<Rhs = Self> {
    type Output;
    fn add(self, rhs: Rhs) -> Self::Output;
}
```

なんと、associated type と generic type の合わせ技となっています。ここまでの考え方をもとにして、どうしてこのような定義になっているのかを考えてみたいと思います。

まず、generic type として `Rhs` という型パラメータがあります。`Rhs` = Right-hand side の名前から分かるとおり、これは `+` 演算子の右側のオペランドとなる値の型を示しています。ここが型パラメータになっているということは、「右側のオペランドの型はいろいろとりうるよ！🙆‍♂️」ということです。

一方、`Output` は associated type となっています。こちらは加算の結果の型ですが、これが associated type になっているということは、「`Self` と加算結果の型は1対1に対応するよ！」ということです。ある `Self` に対して `Output` が `i32` だったり `i64` だったり `usize` だったり……みたいなことには絶対なりません！ということになります。

`Rhs` を associated type として定義したり、`Output` を generic type にしたり、といった定義の仕方も可能だったはずですが、現に標準ライブラリとしてはこのようなものが提供されています。`Add` トレイトの今の定義からは、

- `+` の右オペランドに関しては柔軟にいろんな型を受け付けられるようにしよう。
- 演算結果の型は、`+` の左オペランドに対して一意に定まるようにしよう。ここを柔軟にする必要はない。

というような「意思」が垣間見える気がします（実装時の議論などを見たわけではないので、勝手な妄想です）。

# lower_bound の例に戻って、どちらが適しているのか考える

最初に戻り、「`Vec<T>` に `lower_bound` メソッドを生やす」ために作るトレイトは、associated type と generic type のどちらが適しているのか？という疑問を解決したいと思います。

`Vec<T>` について、探索をするのはベクタの要素である `T` 型に対してです。つまり、実装対象の型とトレイトが 1 : 1 に対応しています。逆に、`Vec<T>` に対して、`T` ではない別のジェネリックな型 `U` の値を使って探索したいというケースはかなり考えにくいです。

したがって、この場合には associated type を使うのがベターである、と考えられます。

```rust
trait LowerBound {
    // associated type として Item 型を定義
    type Item: Ord;
    fn lower_bound(&self, x: &Self::Item) -> usize;
}

impl<T: Ord> LowerBound for Vec<T> {
    type Item = T;
    fn lower_bound(&self, x: &Self::Item) -> usize {
        // 実装は省略
    }
}
```

# おわりに

Rust の型に関する RFC を見ていると、難しい用語や概念がたくさん出てきてあまり理解することができないのが歯がゆいです。型理論にも興味があるので折を見て勉強していきたいなと思います。


# 参考

- [On Generics and Associated Types | Whisper of the Heartman](https://blog.thomasheartman.com/posts/on-generics-and-associated-types)
- [Associated Types in Rust. Associated Types in Rust are similar to… | by Park Juhyung | CodeChain | Medium](https://medium.com/codechain/rust-associated-type-b0193c22eacd)
- [rust - When is it appropriate to use an associated type versus a generic type? - Stack Overflow](https://stackoverflow.com/questions/32059370/when-is-it-appropriate-to-use-an-associated-type-versus-a-generic-type)
