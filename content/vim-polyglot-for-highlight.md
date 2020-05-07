+++
title = "Vim / Neovim でシンタックスハイライトがおかしいな？と思ったら vim-polyglot を入れてみる"
date = 2020-05-07
[taxonomies]
tags = ["Vim", "Neovim"]
+++

仕事で TypeScript を書いています。メインとして使っている Neovim で少し込み入った構造の ts ファイルを開くと、シンタックスハイライトがうまく効かないことがしばしばありました。[`vim-polyglot`](https://github.com/sheerun/vim-polyglot) をインストールすることで解決できたので、簡単にまとめておきます。

<!-- more -->

# 起きていた問題

ある日、仕事でいつもどおり TypeScript ファイルを開くと、以下のような色付けになっていました。

（実際に仕事で使っているファイルは載せられないので、サンプルとして用意したものです）

<img src="/img/ugly-syntax-highlight.png" alt="ugly-syntax-highlight">

`const arr1` のあたりが無機質な感じになっていますし、`for (let i = 0; i < arr1.length; i++)` に関してはほとんどがピンクになっていて個人的には見るに堪えない配色です。

行数の少ない、シンプルなファイルであればこのような状況は体感的には発生していなかったのですが、数千行のファイルになるとこのようにシンタックスハイライトがおかしくなる状況が頻発していました。

そもそも数千行のファイルは分割しろというのはそれはそうなのですが、そこはいったん目をつぶるとして、我慢さえすればコーディングをする上で支障があるわけではなかったので、とりあえず数週間そのまま仕事をしていました。

# カラースキームの旅に出る

さて、私は飽き性かつエディタの見た目にこだわりたい人間のため、2週間に1回くらいのペースでカラースキームを変更しています。

基本的には、以下の3つの配色をローテーションしている感じです。

1. [monokai](http://vimcolors.com/64/monokai/dark)
2. [one-dark](https://github.com/joshdick/onedark.vim)
3. [oceanic-next](https://github.com/mhartington/oceanic-next)

ちなみにこのブログで使っているコードスニペットの配色は `one-dark` です（2020/05/07 時点）。といってもこれも気まぐれで変えるかもしれません。

```js
const arr = ['1', '2', '3'];

for (let i = 0; i < arr.length; i++) {
  console.log(`hello ${i} ${arr[i]}`);
}
```

この3つのローテーションにも飽きたときや暇なときには新たなカラースキーム探しの旅に出ることがよくあります。つい先日、GW で時間に余裕があったのでカラースキーム探しに出かけました。[~/.vim/colors というサイト](https://vimcolors.com/) が見やすくて好きです。

そこで `gruvbox-material` というカラースキームと出会いました。↓

<img src="/img/gruvbox-material-example.png" alt="gruvbox-material-example">

とっても自分好みの配色で、しかも [GitHub のリポジトリ](https://github.com/sainnhe/gruvbox-material) を見ると、`Lightline` や `Airline` 用のテーマも用意してあったり、イタリックに対応していたりと細部まで配慮が行き届いた素晴らしいカラースキームでした。

よし次のカラースキームはこれにしよう、と思っていると、README に以下の一文があるのを見つけました。

> For better syntax highlighting support, please install [sheerun/vim-polyglot](https://github.com/sheerun/vim-polyglot).

# vim-polyglot を入れると幸せになれる

`vim-polyglot` というプラグインの存在をこのとき初めて知りました。

- [vim-polyglot の README](https://github.com/sheerun/vim-polyglot) 
- [海外の記事 (Polyglot Programming in Vim (or How to Get A Great Developer Experience for Any Language in Vim))](https://www.barbarianmeetscoding.com/blog/2019/12/28/polyglot-programming-in-vim)

を読むと、「さまざまな言語に対して Vim にシンタックスハイライトやインデントなどの機能を拡充することのできる言語パック」といった感じのようです。

これを入れれば数週間悩みのタネだった TypeScript のシンタックスハイライトおかしい問題が解決するのでは！？ と思い、インストールしてみました。

結果は以下の通りです。

<img src="/img/beautiful-syntax-highlight.png" alt="beautiful-syntax-highlight">

無機質だった `const arr1` が息を吹き返し、さらに for の中の `let i = 0; i < arr1.length; i++` に関しては雲泥の差です。 `gruvbox-material` の目に優しくも華やかな配色を存分に活かした、美しい彩りです。

BEFORE / AFTER の形で並べて載せてみます。AFTER の美しさが際立ちますね！！！


**〜 BEFORE 〜**

<img src="/img/before-syntax-highlight.png" alt="before-syntax-highlight">

**〜 AFTER 〜**

<img src="/img/after-syntax-highlight.png" alt="after-syntax-highlight">

これで仕事の効率とモチベーションが跳ね上がりました。

# まとめ

- Vim / Neovim でシンタックスハイライトがおかしいな？と思ったら `vim-polyglot` をインストールするのをおすすめします
  - [sheerun/vim-polyglot: A solid language pack for Vim.](https://github.com/sheerun/vim-polyglot)
- `gruvbox-material` もついでにおすすめです。同じ作者の他のカラースキームもとっても良くてクオリティの高いものが多いので、ぜひ見てみてください。
  - [sainnhe/gruvbox-material: Gruvbox with Material Palette](https://github.com/sainnhe/gruvbox-material)
  - [sainnhe/sonokai: High Contrast & Vivid Color Scheme based on Monokai Pro](https://github.com/sainnhe/sonokai)
  - [sainnhe/forest-night: 🌲 Comfortable & Pleasant Color Scheme for Vim, Zsh and Terminal Emulators](https://github.com/sainnhe/forest-night)
- 私の dotfiles は [こちらのリポジトリ](https://github.com/magurotuna/dotfiles) にあります。 Neovim の設定は「あまり詰め込みすぎず、しかし手に馴染むものを」というコンセプトでやっているので、よかったらご覧ください。
