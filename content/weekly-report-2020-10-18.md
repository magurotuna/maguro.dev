+++
title = "Weekly Report 2020/10/18"
date = 2020-10-19
[taxonomies]
tags = ["OSS", "Weekly Report"]
+++

<img src="https://user-images.githubusercontent.com/23649474/96460567-4d6ac200-125e-11eb-83a2-91e9ee450a26.png" alt="nesugata-yama" />

週報4回目です。毎週日曜日に更新するつもりでしたが早速すっぽかしました(3回目)。
今週も `deno_lint` 中心で作業しました(2回目)。

<!-- more -->

# [denoland/deno_lint](https://github.com/denoland/deno_lint)

## Pull Request

- [fix(no-cond-assign): handle nested stuff](https://github.com/denoland/deno_lint/pull/389)
  - `no-cond-assign` ルールで、ネストされた `if` などを正しく処理できていなかったのを修正しました。
- [refactor: switch to `impl Into<String>` to avoid unnecessary allocation](https://github.com/denoland/deno_lint/pull/392)
  - エラーメッセージの受け渡しを `&str` でやっていて、余計なアロケーションが発生していたり、`&format!(...)` みたいな形で引数に渡さなければならず不格好だったため、`impl Into<String>` という型に変更してみました。
- [fix(no-empty): handle nested empty blocks in switch](https://github.com/denoland/deno_lint/pull/394)
  - `no-empty` ルールで、`switch` 文の判別式 (というのか分かりませんが、`swc` では `discriminant` という名前がつけられていました) で細かいケースに対応できていなかったので、修正しました。
- [fix(no-dupe-args): handle nested function's arguments and remove unnecesarry allocation](https://github.com/denoland/deno_lint/pull/390)
  - ネストしている関数について正しくハンドリングできていなかったのでその修正と、iterator をいったん `Vec` に collect してから別の関数に渡しているところがあったので、iterator のまま渡すようにすれば余計なアロケーションを省略できて良さそう、と思ってそのようにリファクタリングしました。
- [fix(no-constant-condition): handle nested stuff](https://github.com/denoland/deno_lint/pull/404)
  - ネストしているやつをうまく処理できるようにする修正です。(なんでこんなにネストしてるものの修正が多いんだ？となると思いますが、swc の visitor = ASTを走査しながら任意の処理を行ってくれるやつ の扱い方に癖があるためで、これをなんとかしようというのを repo owner の Bartek が検討しているみたいです。)
- [fix typo](https://github.com/denoland/deno_lint/pull/407)
  - 安心と信頼の fix typo です。
- [test: add `assert_lint_err` macro to assert messages and hints](https://github.com/denoland/deno_lint/pull/400)
  - これまでの `deno_lint` のテストでは、lintの実行対象となる JavaScript / TypeScript のソースコードを入力として、それが lint をパスするのか、エラーになるのか、そしてエラーになる場合はエラーが発生するコードの箇所が期待通りか、といった内容を assertion していました。この状況に対して、「エラーメッセージの内容」および「ヒントメッセージの内容」も assertion をしたほうが良さそう、と感じていたので、新たにテスト用のユーティリティを作成したのがこちらの PR です。
- [fix(no-dupe-keys): handle nested objects & getter and setter with the same name](https://github.com/denoland/deno_lint/pull/406)
  - `no-dupe-keys` について、ネストされたオブジェクトリテラルも正しく処理できるようにする修正です。あと、getter と setter が同名で存在しているときにもエラー扱いをしてしまっていたので、そこを正しく処理できるように修正しました。

# [RDambrosio016/RSLint](https://github.com/RDambrosio016/RSLint) 

## Pull Request

- [Feat: add shebang handling to lexer and parser](https://github.com/RDambrosio016/RSLint/pull/43)
  - RSLint の lexer で shebang を正しく処理できるようにする PR です。

# Diary

先週はGoToトラベルを活用して2泊3日で伊豆に行ってきました。温泉宿に引きこもって文豪さながら圧倒的な進捗を生もう！計画です。

宿探しをしたタイミングでちょうど、楽天トラベルとかヤフートラベルとかの大手サイトでGoToの還元に改悪があって、もっと早く予約しておけばよかった〜と後悔したりしてました。結局、この改悪は一時の騒ぎだったみたいですが……。

宿探しですが、以下の点を重視しながら探しました。

- 温泉が良さそう
- 食事がおいしそう
- 猛烈に魚介類を食べたいお年頃だったので、海沿い
- 東京からそこそこアクセスしやすい
- 和室
- Wi-Fi環境が整っていそう
  - 宿のWebサイトを見て、分かりやすいところにWi-Fi対応の旨が書かれているか、をチェックしてました。書かれていない、あるいは書かれていたとしてもすごくコッソリと書いてある、旅行サイトの施設設備欄に申し訳程度に書いてある、という感じだと、もし使えたとしても回線が貧弱だったりしそうだなと思い、ここは入念に確認しました

これらの条件を検討して、最終的に伊豆・下田の [ホテル伊豆急](https://www.hotel-izukyu.co.jp/) に決めました。

結果としては、とてもいい宿で、しっかり開発に集中できつつ、疲れたら温泉に入ったり、宿の目前にある白浜海岸を部屋の窓から眺めたり、海岸を散歩したり、といった感じで非常に有意義なぼっち開発合宿になりました。

<img src="https://user-images.githubusercontent.com/23649474/96460397-1dbbba00-125e-11eb-839b-38e11891abdf.png" alt="hotel-room" />

懸念していたWi-Fi環境については特に問題はなく、チェックイン直後に [fast.com](https://fast.com/) で測定したら確か 50Mbps くらい出ていました(スクショ撮り忘れた)。普通に開発する分にはまったく問題ない速度です。

1回だけ、夜に [denoland/deno](https://github.com/denoland/deno) を clone してこようとしたらすごく時間がかかってぐぬぬとなりましたが、そういうタイミングではコーヒーブレイクならぬ温泉ブレイクをすることができたのでノーストレスでした。

ド平日に行ったのでハイシーズンや休日に比べるとお客さんが少なかったというのもあるとは思いますが、とりあえず僕が行ったときの回線状況は以上のような感じでした、ということで書き留めておきます。

<img src="https://user-images.githubusercontent.com/23649474/96460461-2e6c3000-125e-11eb-8d88-f1d75853c716.png" alt="vier-from-room" />

_Work from Onsen_ にハマってしまったので、また行けるチャンスがあったら近いうちに行きたいと思います。