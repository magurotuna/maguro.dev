+++
title = "Rustで文字列イテレータを連結するときに便利な itertools::join は結構遅い"
date = 2020-01-06
[taxonomies]
tags = ["Rust", "itertools"]
+++

Rust の便利クレート [`itertools`](https://crates.io/crates/itertools) の文字列連結メソッド `join` が遅いという噂を聞いたので、かんたんに検証をしてみました。

<!-- more -->

# TL;DR

Rustで、

**「文字列（`String` or `&str`）のベクタなどに対して、何らかの処理を施した上で、スペース区切りで連結したい」**

というような状況は時たま出てくるかと思います。

これを実現する方法は何通りも考えることができ、そしておそらく最もシンプルかつ可読性が高い方法は [itertools - crates.io](https://crates.io/crates/itertools) の `itertools::join` メソッドを使うことだと思います。

が、 **`itertools::join` は他の方法に比べてパフォーマンスが結構悪いです。**

パフォーマンスを求める場合は、以下のようにいったん `collect` でベクタにしてから `join` するのが良さそうです。

```rust
YOUR_ITERATOR.collect::<Vec<_>>().join(" ") // ベクタにしてから join する
```

# ベンチマークをとる

ベンチマークをとって調べてみましょう。[bencher](https://docs.rs/bencher/0.1.5/bencher/) を利用します。

シチュエーションとしては、「`\tRust\t`が1万個含まれるベクタを用意して、それぞれの先頭と末尾のタブ文字を消去した上で、`", "`区切りで連結した String を作る」というような感じにします。

（わざわざtrim処理を入れなくても測定はできると思いますが、今回はtrim処理を入れたため、このあと出てくる処理速度の数値などは絶対的なものではなく、相対的な評価・比較をするためのものだと解釈いただければと思います。）

## 手法一覧

以下の手法説明中では、「`\tRust\t`が1万個含まれるベクタ」として、以下のように作った静的変数を使用します。（ベクタではなく配列ですが……）

```rust
static STRS: [&'static str; 10_000] = ["\tRust\t"; 10_000];
```

### エントリーナンバーA: `collect` してから `join`

```rust
fn a(bench: &mut Bencher) {
    bench.iter(|| -> String { STRS.iter().map(|s| s.trim()).collect::<Vec<_>>().join(", ") })
}
```

`itertools` を使わない場合はこの方法がオーソドックスかな？と思います。ベクタを経由する必要があるのがちょっとエレガントさに欠ける印象。

### エントリーナンバーB: `itertools::Itertools::intersperse` を使う

```rust
fn b(bench: &mut Bencher) {
    use itertools::Itertools;
    bench.iter(|| -> String { STRS.iter().map(|s| s.trim()).intersperse(", ").collect() })
}
```

[itertools::Itertools::intersperse](https://docs.rs/itertools/0.8.2/itertools/trait.Itertools.html#method.intersperse) を使います。要素と要素の間に別の要素を入れてくれるメソッドです。そのあとイテレータを直接Stringにcollectします。

### エントリーナンバーC: `fold` （Stringのキャパシティを指定しない）

```rust
fn c(bench: &mut Bencher) {
    bench.iter(|| -> String {
        STRS.iter()
            .map(|s| s.trim())
            .fold(String::new(), |mut acc, cur| {
                acc.push_str(cur);
                acc.push_str(", ");
                acc
            })
    })
}
```

`fold` を使ってイテレータの要素を1つずつpushしていきます。めっちゃ手続き的ですね。

なお、エントリーナンバーC, D, Eは、連結後の文字列の末尾に余計な `", "` がついてしまいます。
（ `"Rust, Rust, Rust, Rust, "`みたいに）

とりあえずパフォーマンスだけ測りたいので、この差異は無視することにします。

### エントリーナンバーD: `fold` （Stringのキャパシティを指定する） 

```rust
fn d(bench: &mut Bencher) {
    bench.iter(|| -> String {
        STRS.iter().map(|s| s.trim()).fold(
            String::with_capacity(STRS.get(0).unwrap().len() * STRS.len()),
            |mut acc, cur| {
                acc.push_str(cur);
                acc.push_str(", ");
                acc
            },
        )
    })
}
```
エントリーナンバーCでは `fold` の初期値で `String::new()` としましたが、これだと確保したキャパシティを超えるたびにメモリの再アロケーションが発生し、効率が悪そうな気がしたため、あらかじめ必要な領域を確保しておくと効率がいいんじゃないかと思ってやってみました。

### エントリーナンバーE: `fold` と `+` 演算子 （Stringのキャパシティを指定し、文字列連結を `+` で行う）

```rust
fn e(bench: &mut Bencher) {
    bench.iter(|| -> String {
        STRS.iter().map(|s| s.trim()).fold(
            String::with_capacity(STRS.get(0).unwrap().len() * STRS.len()),
            |acc, cur| acc + cur + ", ",
        )
    })
}
```

エントリーナンバーC, Dで `push_str` しているところを `+` にしたら変わるのかなと思ってやってみました。

※ これはベンチマークをとったあとに調べていて発見したのですが、
https://doc.rust-lang.org/src/alloc/string.rs.html#1970-1978
を読むと `push_str` と `+` は等価っぽいです。

### エントリーナンバーF: `itertools::join` を使う

```rust
fn f(bench: &mut Bencher) {
    use itertools::Itertools;
    bench.iter(|| -> String { STRS.iter().map(|s| s.trim()).join(", ") })
}
```

圧倒的美しさですね。Aで気になっていた「ベクタを経由するのが無駄っぽい」というマイナスポイントが解消されています。素晴らしいです。

## ベンチマーク結果

```
$ cargo bench
------中略------
test a ... bench:     106,045 ns/iter (+/- 16,800)
test b ... bench:     162,460 ns/iter (+/- 23,986)
test c ... bench:     174,002 ns/iter (+/- 22,692)
test d ... bench:     167,454 ns/iter (+/- 15,830)
test e ... bench:     171,400 ns/iter (+/- 25,176)
test f ... bench:     327,217 ns/iter (+/- 36,332)

test result: ok. 0 passed; 0 failed; 0 ignored; 6 measured

```

表・グラフにすると以下のようになります。

| テスト番号 | 処理内容                                               | Performance (ns)  | 測定誤差     |
| ---- | --------------------------------------------------- | -------------------------------- | ---------- |
| A    | `collect` してから `join`                           | 106,045                          | +/- 16,800 |
| B    | `itertools::Itertools::intersperse` を使う                | 162,460                          | +/- 23,986 |
| C    | `fold` （Stringのサイズを指定しない）            | 174,002                          | +/- 22,692 |
| D    | `fold` （Stringのサイズを指定する）                | 167,454                          | +/- 15,830 |
| E    | `fold` と `+` 演算子 （Stringのサイズを指定し、文字列連結を `+` で行う） | 171,400                          | +/- 25,176 |
| F    | `itertools::join` を使う                                   | 327,217                          | +/- 36,332 |

<img width="829" alt="benchmark" src="https://user-images.githubusercontent.com/23649474/71777106-edf93980-2fde-11ea-909f-8fbc5ab3c25b.png">


`itertools::join` は明らかに遅いですね。あんなに美しいのに……

# 結論

- `itertools::join` はシンプルで可読性が高いが、パフォーマンスが悪い
- パフォーマンスを求める場合は `collect` してから `join` する
- `fold` や `itertools::Itertools::intersperse` はわざわざ使う必要はないと思う

今回使用したコードはこちらのリポジトリにあります。
<a href="https://github.com/magurotuna/rust-join-iterator-str-bench"><img src="https://github-link-card.s3.ap-northeast-1.amazonaws.com/magurotuna/rust-join-iterator-str-bench.png" width="460px"></a>

# おまけ: なぜ `itertools::join` は遅いのか

[こちらのStack Overflow](https://stackoverflow.com/questions/56033289/join-iterator-of-str) のSebastian Redl氏が以下のように回答しています。

> SliceConcatExt::join can calculate the needed size for the full string ahead of time and thus definitely doesn't need to reallocate during accumulation; whereas the other methods may have to reallocate the string.

`itertools::join` が遅い、というよりは、`collect` してから `join` する方法だと最初に結合後の文字列を置くのに必要なメモリサイズを計算して確保するため、再アロケーションが必要ないから速い。ということのようです。

（ということだったら `String::with_capacity()` と `fold` を使う方法でも同じくらいの速度が出そうな気がしますが、そう単純な話でもないんでしょうか。Rust、難しい……）

#### ※ 2020/1/6 追記 ※

[@ubnt_intrepid さんからコメント](https://qiita.com/maguro_tuna/items/003a19f782884a694f8f#comments)をいただき、 `itertools::join` は[ソースコード](https://docs.rs/itertools/0.8.2/src/itertools/lib.rs.html#1585-1602)を確認すると、**文字列の連結に `write!` マクロを使用していて、これがオーバーヘッドになっているために遅くなってしまっている**、ということでした。

`write!` マクロの内部処理等に関しては以下のエントリが大変参考になります。

[Rust の文字列フォーマット回り（改訂版） | ubnt-intrepid's blog](https://ubnt-intrepid.github.io/blog/2017/10/11/rust-format-args/)

`itertools::join` の内部では `size_hint()` を使用してあらかじめ連結後の文字列を置くのに必要なメモリを確保しているため、上で引用した「`itertools::join` は再アロケートが発生するから遅い」というのは事実ではなさそうでした。


# References

[rust - Join iterator of &str - Stack Overflow](https://stackoverflow.com/questions/56033289/join-iterator-of-str)
