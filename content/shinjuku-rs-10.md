+++
title = "2020/06/30 に開催された Shinjuku.rs #10 に参加しました"
date = 2020-07-11
[taxonomies]
tags = ["Rust", "Shinjuku.rs", "proptest", "quickcheck"]
+++

フォルシア株式会社さんが主催の Rust の LT イベント [Shinjuku.rs #10 @オンライン](https://forcia.connpass.com/event/178415/) に参加しました。connpass 上での参加登録社は 60 名以上！Rust の勢いを感じます。

ブログ枠で参加させていただいたので、参加レポートをまとめます。

<!-- more -->

# LT1 Rust で Property-Based Testing by matsu7874 さん

Rust でインメモリデータベースを開発していらっしゃる matsu7874 さんの発表です。

スライドはこちら: [https://speakerdeck.com/matsu7874/property-based-testing-in-rust](https://speakerdeck.com/matsu7874/property-based-testing-in-rust)

## Property-Based Testing とは

プログラムのテストコードを書くとき、入力とそれに対して期待される出力の組を用意して検証することが一般的で、これは **Example-Based Testing** と呼ばれます。

このやり方は単純で強力ですが、テスト対象のインターフェースが変わったら合わせて修正をしなければならない（概して手間のかかる修正になる）、複数の値が絡まりあったテストだとテストを記述すること自体が面倒、などの問題もあります。

そこで **Property-Based Testing** の出番です。これは、プログラマが具体的なテストケースを 1 つずつ手作りするのではなく、 **「テスト対象が満たすべき性質」** というものを記述します。

例えば、`&[i32]` を反転する関数 `reverse` を作って、これのテストを書きたい、というケースを考えてみます。 `reverse` 関数が満たす性質はどのようなものか？と考えてみると、 **「2 回適用すると元の順番に戻る」** という性質があることに気づきます。この性質をコードに落とすと、以下のように表現できます。

```rust
// slice に2回 reverse 関数を適用した結果が元の slice と一致していることを表現
slice == reverse(&reverse(slice))
```

Property-Based Testing では、このように「満たすべき性質」を記述しておけば、あとはテストライブラリが自動でたくさんの入力を自動生成して、すべての入力に対して「性質」が満たされるのかどうか、ということを確認してくれる、といったアプローチになります。

プログラマは「性質」を書くだけで良いので、Example-Based Testing とは違い、テストケースを 1 つずつ、境界値などにも気を配りながら手作りして……というような作業は必要なくなります。また、上記で例として挙げた `reverse` 関数が、`&[i32]` ではなくて `&[f32]` を引数にとるように修正された、という場合を考えてみてください。Example-Based Testing であれば、以下のようにテストを書いていたと思うので、

```rust
#[test]
fn test_reverse() {
    assert_eq!(vec![3, 2, 1], reverse(&[1, 2, 3]));
    assert_eq!(vec![-3, -2, -1], reverse(&[-1, -2, -3]));
    // 以下、たくさんのテストケース
}
```

`reverse` 関数のインターフェース変更に伴って、以下のように `.0` をつける修正をしなければなりません。

```rust
#[test]
fn test_reverse() {
    assert_eq!(vec![3.0, 2.0, 1.0], reverse(&[1.0, 2.0, 3.0]));
    assert_eq!(vec![-3.0, -2.0, -1.0], reverse(&[-1.0, -2.0, -3.0]));
    // 以下、たくさんのテストケース
}
```

しかし、Property-Based Testing を採用していれば、テストの書き換えは極めて軽微なもので済みます。

matsu7874 さんの発表の中では、宅配便で送る荷物と、荷物を大きさなどで検索をするためのクエリを題材として、Property-Based Testing の実例を紹介されていました。

## Rust で Property-Based Testing をやりたいときに使えるクレート

Property-Based Testing の有用性が分かったところで、では Rust でやろうと思ったときにどのようなクレートがあるのかというと、以下の 2 つが代表的です。

[![BurntSushi/quickcheck - GitHub](https://gh-card.dev/repos/BurntSushi/quickcheck.svg)](https://github.com/BurntSushi/quickcheck)

[![AltSysrq/proptest - GitHub](https://gh-card.dev/repos/AltSysrq/proptest.svg)](https://github.com/AltSysrq/proptest)

### quickcheck

前者の `quickcheck` は、型情報から入力値を生成するという仕組みになっています。さきほどの `reverse` 関数のテストを、`quickcheck` を使ってやってみると、以下のような記述になります。 ([README](https://github.com/BurntSushi/quickcheck#the-quickcheck-attribute-requires-rust-130-or-later) より引用)

```rust
#[macro_use(quickcheck)]
extern crate quickcheck_macros;

#[quickcheck]
fn test_reverse(xs: Vec<i32>) -> bool {
    xs == reverse(&reverse(&xs))
}
```

`quickcheck` が `xs: Vec<i32>` を自動で生成して、`xs == reverse(&reverse(&xs))` という「性質」を満たすかどうかを確認してくれるという感じです。

`reverse` 関数が `&[f32]` を引数にとるように修正された場合は、`xs: Vec<f32>` というように修正するだけで OK ということになります。Property-Based Testing の強みがよく分かるかと思います。

自分で作った型について、その生成方法を `quickcheck` に教えてあげるためには、[quickcheck::Arbitrary](https://docs.rs/quickcheck/0.9.2/quickcheck/trait.Arbitrary.html) トレイトを実装すれば良いです。

### proptest

`quickcheck` よりも後発のクレートで、複雑なケースにも対応できるようになっています。`quickcheck` では型をもとに入力を自動生成してくれましたが、`proptest` では「値の範囲」を指定できるようになっていたり、入力に依存関係があるケースも定義できたりするようです。

matsu7874 さんの例を引用させていただきながらかんたんに紹介しようと思います。宅配便で送る荷物の大きさについてのバリデーションを行う `Baggage::is_valid` のテストを書こうとしたとき、`proptest` を使うと以下のように書くことができます。([こちらのスライドより引用](https://speakerdeck.com/matsu7874/property-based-testing-in-rust?slide=21))

```rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn pt_is_valid_size_each(
        height in f32::EPSILON..1.7,
        width in f32::EPSILON..1.7,
        depth in f32::EPSILON..1.7,
    ) {
        let b = Baggage {
            height: height,
            width: width,
            depth: depth,
            ..Baggage::default()
        };
        prop_assume!(height + width + depth < 2.0);
        prop_assert!(b.is_valid());
    }
}
```

マクロが使われていますが、直感的で分かりやすい書き方になっていると思います。

まず、\\(height, width, depth\\) の 3 パラメータについて、`f32::EPSILON` から \\(1.7\\) までの範囲の中の値を生成してください、と指定しています。そして `prop_assume!` マクロを使って、\\(height + width + depth\\) が \\(2.0\\) 未満である場合にのみ、荷物として有効なサイズになる、ということを宣言しています。そして最後に `prop_assert!` マクロを使って、assume の条件を突破してきたような `Baggage` は、有効な荷物である、ということをアサーションしています。

このように、`proptest` は `quickcheck` より高機能で、ドメイン固有のロジックのテストを行いたい、といったケースに適しているようです。

# LT2 Crate Trends を作ってみた by TheWorld さん

[Crate Trends](https://crate-trends.herokuapp.com/) というクレート比較するためのサイトを作ってみましたというお話でした。

crates.io 見にくくない？というところから着想を得て、開発を開始されたようです。

バックエンド は Rust で、フレームワークとしては `actix-web` を使い、フロントは Next.js で、サーバーサイドレンダリングなどもやりながらモダンな仕上がりとなっています。

crates.io のデータは、[theduke/crates_io_api](https://github.com/theduke/crates_io_api) というクレートを使って取得しているとのこと。

また、wasm に関しては最初トライしてみようと考えたものの、net2 というクレートが対応しておらず断念されたようです。

直前のトークで出てきた `quickcheck` と `proptest` を取り上げてみて、サイト上で検索してみると、以下のようにダウンロード数の推移やドキュメント、リポジトリへのリンク等が表示されます。

<img src="/img/crate-trends-demo.png" alt="crate-trends-demo" />

単一のクレートだけで検索しても見やすいですが、複数の似たようなクレートがあるときに、どっちを使おうかな？と比較検討をするときにとっても便利そうだなと感じました！！

プルリク、スポンサー、お待ちしております！とのことです。

# 感想

今回 10 回目になった Shinjuku.rs に加えて、最近新たなイベントとして 下町.rs が誕生したりと、Rust 界隈の盛り上がりに伴ってイベントもどんどん盛り上がっているという印象があります。

技術イベントもほとんどがオンライン開催になって、物理的に人が集まることで生まれる空気感の醸成が難しくなっているという面はあるものの、今回の Shinjuku.rs で LT の後にあった懇親会で、首都圏在住ではないのでオンライン開催になって参加できるようになり嬉しい、というような声が多くあったように、オンラインだからこその良さというのも確実にあるということを強く感じました。（海外からの参加者の方もいらっしゃったようです！）

Rust がもっと日本で広まるよう、こういったイベントにいろいろな形で貢献していきたいなと思いました。
