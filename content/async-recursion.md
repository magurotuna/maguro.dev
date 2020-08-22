+++
title = "Rust で 再帰的に呼び出される async 関数を作りたいときには async-recursion クレートが便利"
date = 2020-08-22
[taxonomies]
tags = ["Rust", "async-recursion"]
+++

Rust で async な関数を再帰的に呼び出したい……という気持ちになったことはありませんか？

そんなときに便利な [`async-recursion`](https://github.com/dcchut/async-recursion) クレートを見つけたので簡単に紹介します。

[![dcchut/async-recursion - GitHub](https://gh-card.dev/repos/dcchut/async-recursion.svg)](https://github.com/dcchut/async-recursion)

<!-- more -->

# 経緯

## ISUCON9 の移植をしようとした

先日、こんなツイートがタイムラインに流れてきました。

<blockquote class="twitter-tweet"><p lang="ja" dir="ltr">ISUCON10の参考実装について、Goから各言語への移植をお手伝いいただける方を募集いたします。お手伝いいただける場合、出題チームとして予選・本選の運営チャネルにご参加いただけます。是非ご協力ください！ <a href="https://twitter.com/hashtag/isucon?src=hash&amp;ref_src=twsrc%5Etfw">#isucon</a><a href="https://t.co/Ba6N5RKBSK">https://t.co/Ba6N5RKBSK</a></p>&mdash; ISUCON公式 (@isucon_official) <a href="https://twitter.com/isucon_official/status/1292047180312662016?ref_src=twsrc%5Etfw">August 8, 2020</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script> 

ちょうど「Rust でWebアプリを書く知見を貯めたいな〜」と考えているところだったので、すぐに応募しました。さすがに ISUCON に一度も参加したことがなく、さらに Rust で Web アプリを作った経験もほとんどなかったので、練習のために去年開催された [ISUCON9](http://isucon.net/archives/53570241.html) の予選問題の参考実装 (Go) を Rust に移植しようと思い立ち、毎日ちょこちょこと作業をしています。

[![magurotuna/isucon9-rust - GitHub](https://gh-card.dev/repos/magurotuna/isucon9-rust.svg)](https://github.com/magurotuna/isucon9-rust)

## 移植元に再帰関数があった

移植元の実装で、このようなコードがありました:

```go
func getCategoryByID(q sqlx.Queryer, categoryID int) (category Category, err error) {
	err = sqlx.Get(q, &category, "SELECT * FROM `categories` WHERE `id` = ?", categoryID)
	if category.ParentID != 0 {
		parentCategory, err := getCategoryByID(q, category.ParentID)
		if err != nil {
			return category, err
		}
		category.ParentCategoryName = parentCategory.CategoryName
	}
	return category, err
}
```

`getCategoryByID` 関数の中で `getCategoryByID` を呼んでいます。再帰です。

## Rust に素直に移植しようとしたら、コンパイルエラー

これを Rust にそのまま移植しようとすると、こんな感じの雰囲気になると思います([launchbadge/sqlx](https://github.com/launchbadge/sqlx) を使っています)。

```rust
async fn get_category_by_id(conn: &mut PoolConnection<MySql>, category_id: u32) -> Result<Category>
{
    let mut category: Category = sqlx::query_as(
        "SELECT * FROM `categories` WHERE `id` = ?",
    )
    .bind(category_id)
    .fetch_one(&mut *conn)
    .await?;
    if category.parent_id != 0 {
        match get_category_by_id(&mut *conn, category.parent_id).await {
            Err(_) => return Ok(category),
            Ok(parent) => category.parent_category_name = Some(parent.category_name),
        };
    }
    Ok(category)
}
```

(2箇所ある `&mut *conn` のところを `conn` と書くことはできません。*1)

これがコンパイルできれば何の問題もないのですが、コンパイラに怒られてしまいます。

```
error[E0733]: recursion in an `async fn` requires boxing
  --> src/handlers.rs:87:6
   |
87 | ) -> Result<Category> {
   |      ^^^^^^^^^^^^^^^^ recursive `async fn`
   |
   = note: a recursive `async fn` must be rewritten to return a boxed `dyn Future`

error: aborting due to previous error

For more information about this error, try `rustc --explain E0733`.
error: could not compile `isucon9-rust`.
```

# Rust で再帰 async 関数を実現する (自力編)

## エラーメッセージに従って直してみる

`dyn Future` にしろ！と言っているので、これに従って直してみます。
それと、元のコードだとノイズが多いので、問題の本質に集中できるよう、簡略化したコードを取り扱っていきます。

```rust
async fn recursion(some_ref: &str) -> Result<String> {
    let result = recursion(some_ref).await?;
    Ok(result.to_string())
}
```

このコードも先ほどと同様のコンパイルエラーが出ます。どう考えても無限ループに陥りますが、そこはスルーしてください。

エラーメッセージに従って、`async` を取っ払ったり、返り値を `Box<dyn Future<.>>` で包んだり、といったことをやってみると、また別のエラーが出ますが、ごちゃごちゃとやってみると、とりあえずこんな感じになります。

```rust
fn recursion(some_ref: &str) -> Pin<Box<dyn Future<Output = Result<String>>>> {
    Box::pin(async move {
        let result = recursion(some_ref).await?;
        Ok(result.to_string())
    })
}
```

この時点でなかなか禍々しい見た目をしていますが、これでもまだコンパイルは通りません。

```
error[E0621]: explicit lifetime required in the type of `some_ref`
   --> src/handlers.rs:222:5
    |
221 |   fn recursion(some_ref: &str) -> Pin<Box<dyn Future<Output = Result<String>>>> {
    |                          ---- help: add explicit lifetime `'static` to the type of `some_ref`: `&'static str`
222 | /     Box::pin(async move {
223 | |         let result = recursion(some_ref).await?;
224 | |         Ok(result.to_string())
225 | |     })
    | |______^ lifetime `'static` required
```

ライフタイムを明示しろ（そして `'static` が必須である）、と言っています。`'static` なライフタイムの参照で事足りるならこれで良いですが、元々のケースのようにDBへのコネクションを参照で持ち回っていると、`'static` なライフタイムというわけにはいきません。

## 答え合わせ

ではどうすればコンパイルが通るかというと、こうします。

```rust
fn recursion<'a, 'b>(some_ref: &'a str) -> Pin<Box<dyn Future<Output = Result<String>> + 'b + Send>>
where
    'a: 'b,
{
    Box::pin(async move {
        let result = recursion(some_ref).await?;
        Ok(result.to_string())
    })
}
```

`'a: 'b` は、`'a` が `'b` より長生きであるということです。つまり、この関数のライフタイムの要請を日本語で説明すると、「再帰中に持ち回る参照のライフタイムは、`Future` よりも長生きでなければならない」という感じになると思います。`Future` が終わるのを待っている間に `some_ref` のライフタイムが切れてしまったら良くないので、冷静に考えてみればとても自然な要請です。

（ライフタイムに関してこのエントリがわかりやすく、おすすめです: [Rustの2種類の 'static | 俺とお前とlaysakura](https://laysakura.github.io/2020/05/21/rust-static-lifetime-and-static-bounds/)）

でも、このシグネチャはとても noisy ですし、型に振り回されている感がどうしてもしてしまいます（少なくとも自分は）。ライフタイムの関係性などを理解しておいて損はないと思いますが、できればもっとスマートに書きたいなと感じます。

# Rust で再帰 async 関数を実現する (async-recursion 編)

散々引っ張ってしまいましたが、ここで [`async-recursion`](https://github.com/dcchut/async-recursion) を登場させます。

[![dcchut/async-recursion - GitHub](https://gh-card.dev/repos/dcchut/async-recursion.svg)](https://github.com/dcchut/async-recursion)

`async-recursion` を使うと、再帰 async 関数がこのように書けます。

```rust
#[async_recursion]
async fn recursion(some_ref: &str) -> Result<String> {
    let result = recursion(some_ref).await?;
    Ok(result.to_string())
}
```

`#[async_recursion]` を関数の前につけただけで、ほかは通常の `async` 関数と変わりありません。素晴らしい！

元々の目的であった、ISUCON9 の Go のコードの移植も、以下のように `#[async_recursion]` をつけるだけで問題なくコンパイルが通るようになります。

```rust
#[async_recursion]
async fn get_category_by_id(conn: &mut PoolConnection<MySql>, category_id: u32) -> Result<Category>
{
    let mut category: Category = sqlx::query_as(
        "SELECT * FROM `categories` WHERE `id` = ?",
    )
    .bind(category_id)
    .fetch_one(&mut *conn)
    .await?;
    if category.parent_id != 0 {
        match get_category_by_id(&mut *conn, category.parent_id).await {
            Err(_) => return Ok(category),
            Ok(parent) => category.parent_category_name = Some(parent.category_name),
        };
    }
    Ok(category)
}
```

ちなみに、簡略版に関してマクロの展開後の様子を見てみると、このようになりました。自力で書いたのと似たようなものになっていますね！

~~自力で書く前に展開後のものを見てカンニングしたのはここだけの秘密です。~~

```rust
fn recursion_macro<'life0, 'async_recursion>(
    some_ref: &'life0 str,
) -> core::pin::Pin<
    Box<
        dyn core::future::Future<Output = Result<String>>
            + 'async_recursion
            + ::core::marker::Send,
    >,
>
where
    'life0: 'async_recursion,
{
    Box::pin(async move {
        let result = recursion_macro(some_ref).await?;
        Ok(result.to_string())
    })
}
```

というわけで、とても便利な `async-recursion` の紹介でした。

# 注釈

- (*1) 暗黙の再借用 (reborrowing) がここでは行われないからと思いますが、なぜ行われないのかの明確な理由は探しきれませんでした。もう少し調査してみたいと思います。
  - [Reborrow について](https://cheats.rs/#language-sugar)
  - [&mut T seems to behave like a Copy type - help - The Rust Programming Language Forum](https://users.rust-lang.org/t/mut-t-seems-to-behave-like-a-copy-type/16578)
  - [Why can I use an &mut reference twice? : rust](https://www.reddit.com/r/rust/comments/46qwjv/why_can_i_use_an_mut_reference_twice/)
