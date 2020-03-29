+++
title = "rustup を非対話的環境でインストールする方法"
date = 2019-12-31
[taxonomies]
tags = ["Rust", "rustup"]
+++

CI 環境など、非対話環境で `rustup` をインストールしたい場合のやり方について調べました。

<!-- more -->

# TL;DR

rustupのインストールを非対話環境でインストールするには、以下のコマンドを実行する

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
```

# 動機および調査ログ

Rust をインストールするにあたって、[rustup.rs - The Rust toolchain installer](https://rustup.rs/)にあるコマンドをコピペして実行することが定石だと思います。

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

これを実行すると、以下のような表示が出て、ユーザーの入力待ち状態となります。

```
info: downloading installer

Welcome to Rust!

----中略----

Current installation options:


   default host triple: x86_64-unknown-linux-gnu
     default toolchain: stable
               profile: default
  modify PATH variable: yes

1) Proceed with installation (default)
2) Customize installation
3) Cancel installation
>

```

通常の環境であればここで1などを入力すれば良いのですが、そういうわけにはいかない環境ではどのようにすればいいのか。
[curl でダウンロードした対話式シェルスクリプトが bash にパイプ渡しできない - Qiita](https://qiita.com/KEINOS/items/98164eb05290da7b9d35)
を参考にして

```bash
yes | sh <(curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs)
```

でいけないかと試してみましたが、ダメでした。

解決策はこちらにありました。
[Non-interactive install · Issue #83 · rust-lang-deprecated/rustup.sh](https://github.com/rust-lang-deprecated/rustup.sh/issues/83)

`-s` と `--` については [Man page of BASH](https://linuxjm.osdn.jp/html/GNU_bash/man1/bash.1.html) を確認すると以下のように書いてあります。

> -s オプションが指定された場合と、 オプションを全て処理した後に引き数が残っていなかった場合には、 コマンドは標準入力から読み込まれます。 このオプションを使うと、 対話的シェルを起動するときに 位置パラメータを設定できます。

> -- はオプションの終わりを示し、それ以降のオプション処理を行いません。 -- 以降の引き数は全て、ファイル名や引き数として扱われます。 引き数 - は -- と同じです。

そんなわけで、結果的に冒頭に書いたコマンド（以下再掲）を実行すればOKです。

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
```
