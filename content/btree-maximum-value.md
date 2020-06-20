+++
title = "Rust の BTreeSet / BTreeMap で最大値を素早く取得する方法"
date = 2020-06-20
[taxonomies]
tags = ["Rust", "BTreeMap", "BTreeSet"]
+++

Rust で map を使いたいとき、選択肢として

- [std::collections::BTreeMap](https://doc.rust-lang.org/std/collections/struct.BTreeMap.html)
- [std::collections::HashMap](https://doc.rust-lang.org/beta/std/collections/struct.HashMap.html)

のいずれかがあります。このうち前者の `BTreeMap` は、キーによってソートされた状態で値が格納されるので、いろいろ操作したあとに最小値がほしいとか、ある区間の中にある値たちがほしい、みたいな場面で役立ちます。

「最大値がほしい」という場合にも当然役立つのですが、どのように最大値を取得するのが効率が良いか、考えたことはあるでしょうか。調べてみたので、まとめておこうと思います。

<!-- more -->

# はじめに

結論に達するまでかなり回り道をしているので、結論だけ知りたい方は [結論](@/btree-maximum-value.md#conclusion) に飛んでください。

# BTreeMap / BTreeSet で最大値を取る方法

`BTreeMap` / `BTreeSet` は、キーについて昇順でデータが格納されます。つまり、以下のようなコードを書いたら「一番小さい値」が得られます。

```rust
use std::collections::BTreeSet;

let mut set = BTreeSet::new();
set.insert(42);
set.insert(1);
set.insert(3);
let first = set.iter().next(); // 最初の要素を取得

assert_eq!(first, Some(&1)); // 最初の要素は 1
```

これの類推で「一番大きい値」が得られるような気がしますよね？イテレータの最後の要素は `last` で取ることがでるので、以下のようなコードでうまく動きそうな予感がします。

```rust
use std::collections::BTreeSet;

let mut set = BTreeSet::new();
set.insert(42);
set.insert(1);
set.insert(3);
let last = set.iter().last(); // 「最後」の要素を取得

assert_eq!(last, Some(&42)); // 「最後」の要素は 42
```

このコードは期待通りに動き、最大値である `42` を取得することができます。

めでたし、めでたし…………………

# last を使って最大値を取得するのはイケてない？

ちょっと落ち着いて考えてみると、上のように `Iterator::last` を使用して `BTreeMap` / `BTreeSet` の最大値を取得するのは、効率が悪いような気がします。なぜなら、`Iterator::last` は **そのイテレータを最初から最後までなめる** ことによって、イテレータの最後の値を取得するからです。

実際、[std::iter::Iterator::last のドキュメント](https://doc.rust-lang.org/std/iter/trait.Iterator.html#method.last) をチェックしてみても、

> Consumes the iterator, returning the last element.

とあり、`last` を実行することでイテレータがなめつくされるということが読み取れます。つまり、最大値がほしいだけなのに、「最小値から順番に 1 つずつ値を見ていったときの、最後の値」という極めて回りくどいやり方をしているのではないか、と考えることができます。これでは、 `BTreeMap` / `BTreeSet` に入っている要素数 \\(N\\) に応じて時間がかかるようになってしまって、普通に `Vec` を線形時間で探索するのと変わらない、それどころかむしろ悪い性能になってしまいます。

ここで朗報です。 `BTreeMap` / `BTreeSet` は、通常のイテレータの他に、[DoubleEndedIterator](https://doc.rust-lang.org/std/iter/trait.DoubleEndedIterator.html) というトレイトを実装しています。

このトレイトを実装している場合は、前からだけではなく後ろ側からイテレータを走査することができることになります。後ろ側から見ていくためのメソッド `next_back` が用意されています。これを使うことで、上で `last` を使って書いていたコードは、以下のように書き直すことができます。

```rust
use std::collections::BTreeSet;

let mut set = BTreeSet::new();
set.insert(42);
set.insert(1);
set.insert(3);
let last = set.iter().next_back(); // next_back を使う

assert_eq!(last, Some(&42));
```

この書き方であれば、さきほどの `last` で懸念していた「イテレータを最初から最後までなめることによる無駄」を省くことができ、\\(O(\log N)\\) で最大値を取得することができます。

今度こそ、めでたし、めでたし…………………

# ベンチマークをとってみると、衝撃の事実が発覚

`next_back` を使おうねということでこの話は終わろうかと思ったのですが、念の為ベンチマークをとって確認しようと思います。

ベンチマークに使ったコードは以下のような感じで、1 から 1000 万 までの数字を入れた `BTreeSet` / `HashSet` を用意した上で、

**最後の要素を `last` や `next_back` によって取得するのにかかる時間**

を測定しています。

```rust
#![feature(test)]

extern crate test;

use std::collections::{BTreeSet, HashSet};
use test::Bencher;

fn get_maximum_by_last(set: &BTreeSet<i32>) -> i32 {
    *set.iter().last().unwrap_or(&0)
}

fn get_maximum_of_hashset_by_last(set: &HashSet<i32>) -> i32 {
    *set.iter().last().unwrap_or(&0)
}

fn get_maximum_by_next_back(set: &BTreeSet<i32>) -> i32 {
    *set.iter().next_back().unwrap_or(&0)
}

#[bench]
fn last(b: &mut Bencher) {
    let set = {
        let mut s = BTreeSet::new();
        for i in 1..10_000_000 {
            s.insert(i);
        }
        s
    };

    b.iter(|| get_maximum_by_last(&set));
}

#[bench]
fn next_back(b: &mut Bencher) {
    let set = {
        let mut s = BTreeSet::new();
        for i in 1..10_000_000 {
            s.insert(i);
        }
        s
    };

    b.iter(|| get_maximum_by_next_back(&set));
}

#[bench]
fn last_hash(b: &mut Bencher) {
    let set = {
        let mut s = HashSet::new();
        for i in 1..10_000_000 {
            s.insert(i);
        }
        s
    };

    b.iter(|| get_maximum_of_hashset_by_last(&set));
}
```

このベンチマークを `cargo bench` で実行すると以下のような結果となりました。

```
blog-test is 📦 v0.1.0 via 🦀 v1.45.0-nightly took 1m57s ❯ cargo bench
   Compiling blog-test v0.1.0 (/private/tmp/blog-test)
    Finished bench [optimized] target(s) in 0.68s
     Running target/release/deps/blog_test-0aef6b7d2f434fa2

running 3 tests
test last      ... bench:          10 ns/iter (+/- 2)
test last_hash ... bench:  25,960,936 ns/iter (+/- 1,593,353)
test next_back ... bench:          10 ns/iter (+/- 2)

test result: ok. 0 passed; 0 failed; 0 ignored; 3 measured; 0 filtered out
```

えー…………… `HashSet` が遅いのは良いとして、**`BTreeSet`の`last`と`next_back`は、どちらも同じ早さで処理が終わっていることが読み取れます。**

衝撃の事実発覚です。`last` は前から順番になめていくから遅い、という考えは間違っていたのでしょうか。

# BTreeMap / BTreeSet に実装されている Iterator の真実

このエントリを書こうと思っていろいろ調べてみるまでは自分も

「`BTreeMap` / `BTreeSet` の最大値を取りたければ `next_back` を使え。 `last` は罠。」

と思い込んでいたので、このベンチマーク結果にはとても驚きました。ベンチマークの書き方や実行方法が間違っているのではないかと疑ってみたりもしました。

`BTreeMap` の `Iterator` 実装を見に行くと、そこに答えがありました。（[https://doc.rust-lang.org/src/alloc/collections/btree/map.rs.html#1656-1658](https://doc.rust-lang.org/src/alloc/collections/btree/map.rs.html#1656-1658) より引用）

```rust
impl<'a, K, V> Iterator for Keys<'a, K, V> {
    type Item = &'a K;

    fn next(&mut self) -> Option<&'a K> {
        self.inner.next().map(|(k, _)| k)
    }

    fn size_hint(&self) -> (usize, Option<usize>) {
        self.inner.size_hint()
    }

    fn last(mut self) -> Option<&'a K> {
        self.next_back() // <- 衝撃の事実！！！！！！！！
    }
}
```

`last` は内部で `next_back` を呼び出しているのです！！！！！

この修正が入ったのがいつなのか？が気になったので調べてみたところ、[When possible without changing semantics, implement Iterator::last in… · rust-lang/rust@db16e17](https://github.com/rust-lang/rust/commit/db16e1721264dc06ac926a642deb4c7633a4b54d) を見つけました。これが master にマージされたのが 2019 年 7 月 4 日とのことなので、バージョンでいうと v1.37.0 とか辺りに入った感じでしょうか？

思い込みは怖いものです。「推測するな、計測せよ」とよく言われますが、実際に計測してみなければこのエントリも「`last`は遅いから、`next_back` を使おうね！！」で終わってしまうところでした。

# 結論 {#conclusion}

`BTreeMap` / `BTreeSet` で最大値を取りたいときには、イテレータに対して `last` か `next_back` を呼び出せば OK。どっちでも効率は変わらない！！ただし Rust のバージョンが古い場合には `next_back` を使っておいたほうが良さそう