+++
title = "coc.nvim の拡張機能である coc-pairs で改行時にカーソル位置を望む場所にもってくる方法"
date = 2019-12-31
[taxonomies]
tags = ["vim", "neovim", "coc-pairs"]
+++

カッコ補完プラグイン `coc-pairs` で、改行後のカーソル位置がクールな感じになるように設定する方法について調べました。

<!-- more -->

# TL;DR

`coc-pairs` で改行時にカーソル位置を（大半のエンジニアが）望む位置にもってくるためには、`.vimrc` 等の設定ファイルに以下の記述をした上で、

```vimscript:.vimrc
inoremap <silent><expr> <cr> pumvisible() ? coc#_select_confirm() : "\<C-g>u\<CR>\<c-r>=coc#on_enter()\<CR>"
```

Vim上で `:CocConfig` を実行して開く `coc-settings.json` に以下の設定を書けばOKです。

```json:coc-settings.json
{
  // 前略
  "coc.preferences.formatOnType": true
}
```

↓設定後↓

![Dec-31-2019 22-47-06.gif](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/151210/e08a14d8-a4a9-8ff1-f2dd-96bf5b15c429.gif)

（ `"coc.preferences.formatOnType": true` に関しては、自分の手元の環境では設定しないでも意図した挙動になりましたが、help や issue を見る限り `true` にすることが前提のような気がするので、一応書いておきました）


# `coc-pairs` のいいところ

Vimmerのみなさん、こんばんは。
LSP (Language Server Protocol) の Vim 向けクライアント実装はいくつか種類がありますが、自分は
**[neoclide/coc.nvim](https://github.com/neoclide/coc.nvim)**
を使用しています。

キャッチコピーに **Make your Vim/Neovim as smart as VSCode.** とあることからわかるように、VSCodeのような開発体験を提供してくれます。
VSCodeとVimを併用している僕のようなエンジニアにぴったりなプラグインです。

さて、この `coc.nvim` は extension という単位で様々な言語のLSPサーバーなどをインストールすることができます。
その extension の中に `coc-pairs` があり、これは `()` とか `{}` とか `[]` とかをよしなに補完してくれるというものです。
[jiangmiao/auto-pairs](https://github.com/jiangmiao/auto-pairs) のようなプラグイン、といえば分かりやすいかと思います。

`coc-pairs` は、LSP を活かした実装になっているのか、先行のプラグインよりもスマートな補完をしてくれます。

あまりいい例が思い浮かばなかったのですが、例えば以下のようなコードがあるときを考えます。

<img width="338" alt="スクリーンショット 2019-12-31 22.12.12.png" src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/151210/958dce79-c8ba-f51d-5d67-80434470b43f.png">

ここで `increment(10)` を `double` で包んで、以下のようにしたいという状況になったとします。

```rust
let a = double(increment(10));
```

やり方は人それぞれかと思いますが、自分の場合は以下のようにキーを打ちます。

1. 画像のカーソルの位置から **`double(`** と入力
2. ノーマルモードに戻る
3. **`f;`** で文末に移動
4. インサートモードに入って **`)`** を入力

ここで、カッコ補完プラグインとして `jiangmiao/auto-pairs` を使用していた場合、手順1で左カッコを入力したときに、右カッコ **`)`** が自動で入力されてしまいます。
この右カッコを削除する、という手順が余分に発生することになります。

一方、`coc-pairs` では、右カッコの補完がされません。このような感じになります。↓

![Dec-31-2019 22-24-44.gif](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/151210/1ef2eca0-bb0c-f6cc-c5f9-f48b5c0f1f1a.gif)

もちろん、補完が欲しい！と思う場面ではちゃんと補完してくれます。
賢い！👍

# `coc-pairs` の不満

しかし、 `coc-pairs` に不満が1つありました。
以下のように、`hoge` という関数を作ろうとしていて、カーソルが **`|`** の場所にあるとします。

```rust
fn hoge() {|} // <- カーソル
```

ここで改行をします。するとこうなります。

```rust
fn hoge() {
|} // <- カーソル
```

これは嬉しくないです。こうなってほしいですよね（`jiangmiao/auto-pairs` だと↓のようになってくれます）

```rust
fn hoge() {
    | // <- カーソル
}
```

# 解決方法

`coc-pairs` の README になんとなく解決方法っぽいものは書いてあったのですが、
**「`<CR>` の体験を良くするためには、 `coc#on_enter()` のヘルプ見てね」**
としか書いていなかったので、issue を確認したところ解決方法が書いてありました。

まず Vim の設定ファイルに以下の記述を追加します。

```vim
inoremap <silent><expr> <cr> pumvisible() ? coc#_select_confirm() : "\<C-g>u\<CR>\<c-r>=coc#on_enter()\<CR>"
```

これにより `<CR>` を押したときに `coc#on_enter()` が実行されるようになり、coc.nvimが「`<CR>`が押されたぞ！」と認識できるようになります。

そして、`:CocConfig` を実行すると開く `coc-settings.json` に以下を追加します。

```json:coc-settings.json
{
  // 前略
  "coc.preferences.formatOnType": true
}
```

以上で、改行されたときにいい感じの場所にカーソルをもってきてくれるようになりました。🎉
![Dec-31-2019 22-47-06.gif](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/151210/194cedd8-ba9c-57e3-b097-4ae51aa2ce39.gif)


# References

- [Insert line when <CR> is pressed · Issue #13 · neoclide/coc-pairs](https://github.com/neoclide/coc-pairs/issues/13)
- [What are the differences between this and jiangmiao/auto-pairs? · Issue #12 · neoclide/coc-pairs](https://github.com/neoclide/coc-pairs/issues/12)
- [neoclide/coc.nvim: Intellisense engine for vim8 & neovim, full language server protocol support as VSCode](https://github.com/neoclide/coc.nvim)

