+++
title = "ポケモントレーナーに捧ぐ！ポイントマックス・ポイントアップ不足を解消するためのIDくじ戦略をシミュレーションしてみた。"
date = 2019-12-15
[taxonomies]
tags = ["ポケモン", "Rust"]
+++

<img width="800" alt="トリビアの種" src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/151210/2a4d9388-5f0c-1ca6-d369-883f05650c85.png">

[Rustその3 Advent Calendar 2019 - Qiita](https://qiita.com/advent-calendar/2019/rust3) 12/15 の記事です。

<!-- more -->

# トリビアの種

げんきしとぉや❗️

ガラル地方のポケモントレーナーの皆さん、こんにちは。

ポケットモンスター ソード・シールド発売からちょうど1ヶ月が経過しました。
みなさま楽しくプレイされているでしょうか。

さて、その希少性とは裏腹、ポケモントレーナーとして大量に必要になるアイテム———————

**ポイントマックス** & **ポイントアップ**。

入手方法として最有力なのはIDくじ。

1日1回しか引けないこのくじにおいて、2等（ふしぎなアメ）よりも、
3等（ポイントマックス）、4等（ポイントアップ）を求めるトレーナーが多いことはあまりにも有名です。

このIDくじで少しでも当たりを引きやすくするため、ミラクル交換などを活用して、
さまざまなトレーナーIDのポケモンをボックスに用意するトレーナー。

筆者もご多分にもれず、孵化余りのポケモンを大量放出しながら、
世界のトレーナーとミラクル交換をしています。


ある日。ふと思いました。


**闇雲にミラクル交換してID数を増やしてるけど、増やしすぎるとマスターボールやふしぎなアメが当たりやすくなって、
目当てであるポイント系のものが当たりにくくなるのではないか？**

つまり、

**ポイント系アイテムが一番当たりやすくなる(極大値を取る)ようなユニークID数 $x$ が存在するのではないか？**

これってトリビアになりませんか？

よろしくお願いします。




# IDくじの仕様について軽く説明

ポケモンでは、ゲームを初めからスタートした際に、プレイヤーに6桁の数字からなる トレーナーID が割り当てられます。

たとえば、私のトレーナーIDは `585435` です。

`000000` から `999999` の100万通りがあるっぽいです。（多分）

私が捕まえたポケモンには、親のIDとして私のID `585435` が付与されます。

また、捕まえたポケモンを置いておくためのポケモンボックスが、今作は32ボックスあります。

1ボックスあたり30匹のポケモンを入れられるため、 \\( 30 \times 32 = 960 \\) 匹のポケモンを所持できることになります。

（手持ちポケモンは無視することにします。）

そして、1日に1回、IDくじというものをひくことができます。

当選IDとしてランダムな5桁の数字が発表され、「自分が所持しているポケモンのIDと何桁一致するか」によって、レアなアイテムをもらうことができます。

もらえるアイテムは次の表のとおりです。

|      |        条件 | 景品             |ほしい度|
| :--: | ---------- | ---------------- |----|
| 特等 |    5 桁一致 | マスターボール   |それなり|
| 1 等 | 下 4 桁一致 | ふしぎなアメ     |べつに|
| **2 等** | **下 3 桁一致** | **ポイントマックス** |**めちゃくちゃほしい**|
| **3 等** | **下 2 桁一致** | **ポイントアップ**   |**とてもほしい**|
| 4 等 | 下 1 桁一致 | モーモーミルク   |いらない|

特等のマスターボールはもちろん超一級のレアアイテムですが、たくさん必要かというとそうでもありません。

一方、ポイントマックスとポイントアップは、たくさんいります。対人戦で使うポケモンなら、すべての技のPPを上限まで増やすのが理想だからです。

もし自分が、

1. `120000`
2. `333000` 

のポケモンを持っていたとします。

今日の当選番号が `90000` だったら、1 は下4桁一致で **1等**。 2 は下3桁一致で **2等** となるのですが、
上位の景品しかもらうことができないため、このケースでは1等のふしぎなアメしかもらうことができないのです。これは困ります。

# 各等が当選する確率を、式で求める。→挫折

現在自分が所持しているポケモンのユニークID数が $x$ であるときに、1回の抽選で各等が当選する確率を式に表すことができれば、
それをグラフに描画して調査終了です。


まず特等が当たる確率を求めてみましょう。

$x$ 個のユニークIDのうち、少なくとも1つが当選番号と5桁一致することが、特等になる条件です。

「少なくとも1つが」が出てきたら余事象で考えたほうがいいと高校の時に習った気がします。
余事象は「ユニークID \\(x\\) 個のうち、当選番号と5桁一致するものが皆無である」でしょうか。
この余事象の確率は、——————————————

と思索にふけっていたのですが、筆者の数学力では確率を式に落とし込むことはできませんでした。
（特賞はともかく、それ以降で頭がこんがらがりました）
そういえば自分は数学が苦手なんでした。

しかし、高校時代の自分とは違い、今の自分はプログラミングを操り、コンピュータに計算をさせることができます。
厳密解を求めることはできなくても、だいたいの答えはわかるはず。

かがくの ちからって すげー！

# IDくじをシミュレートする

シミュレーションを行うコードを書いていきます。

言語は個人的に勉強中である `Rust` を使用しました。

勉強のために書いてみたのですが、並列計算がとてもかんたんに実現できて、いい選択だったのではないかと思います。

## シミュレーションの流れ

$x$ 個のユニークIDを所持している場合のシミュレーションをするとします。

1. `000000` から `999999` までの100万通りの ID をランダムにシャッフルして、先頭から \\( x \\) 個をとりだす。これを「自分が所持しているIDのリスト」とみなす。
2. `00000` から `99999` までの10万通りの中からランダムで1つ数を選び、これを「その日の当選番号」とみなす。
3. 当選判定をする
4. 1から3をたくさん回して、当選結果の集計をする

こんな感じで愚直にシミュレーションしていきます。
この流れに沿ってコードを紹介していきます。

## 1. 「自分が所持しているIDのリスト」を生成

まず乱数生成器を作ります。おなじみの `rand` クレートを使用します。

```toml:Cargo.toml
[dependencies]
rand = "0.7.2"
```

```rust
use rand::prelude::*;
use rand::rngs::StdRng;

type Seed = [u8; 32];

fn make_rng(seed: Option<Seed>) -> StdRng { // 初期シードを外から与えられるようにする。デバッグとかしやすくなると嬉しい
    match seed {
        Some(s) => StdRng::from_seed(s), // 初期シードが与えられていたらそれをもとにして生成
        None => StdRng::from_entropy(), // 初期シードがなかったらランダムなシードをもとに生成
    }
}
```

この `make_rng` を以下のように呼び出して乱数生成器を作り、そして100万通りのIDをシャッフルします。

```rust
let seed: [u8; 32] = [42; 32]; // 固定の初期シード
let mut rng = make_rng(Some(seed));

let mut pokemon_ids_base = (0u32..1_000_000).collect::<Vec<_>>(); // 0 ~ 999999 からなるベクタを作る
pokemon_ids_base.shuffle(rng); // 乱数を使ってシャッフル
```

## 2. 5桁の当選番号を乱数で決める

また `rand` クレートでやるだけなんですが、のちのち処理を並列化することを考え、とりあえず `thread_rng` を使います。

`thread_rng` で生成される `ThreadRng` はスレッドローカルな乱数生成器で、あとで `rayon` というクレートを使って並列化する際にもよしなに動いてくれるようです。

参考） [Rayon and random number generator · Issue #398 · rust-random/rand](https://github.com/rust-random/rand/issues/398)

`ThreadRng` の公式ドキュメント [rand::rngs::ThreadRng - Rust](https://docs.rs/rand/0.7.2/rand/rngs/struct.ThreadRng.html) に

> ThreadRng uses the same PRNG as StdRng for security and performance.

と書かれているので、上の `make_rng` で作っている `StdRng` と同じ疑似乱数生成器のようです。

ただ `StdRng` は `SeedableRng` トレイトを実装していますが、 `ThreadRng` はこのトレイトを実装していません。

なので `ThreadRng` は初期シードを与えて生成する、ってことはできないです。

5桁の当選番号の生成は以下のように行います。

```rust
let mut rng = rand::thread_rng();
let rnd_number = rng.gen_range(0, 100_000); // 0 ~ 99999 のうちどれか
```

## 3. 当選判定をする

forループで回して、当選判定の条件を素直に 特賞→1等→… と適用していきます。

上位の賞が優先されるため、特賞（5桁一致）が出た時点で特賞が確定します。

特賞以外の場合は次の ID の判定に移ります。


```rust

#[derive(Debug, Hash, PartialEq, Eq, PartialOrd, Ord)]
enum Award {
    First = 5,  // マスターボール
    Second = 4, // ふしぎなアメ
    Third = 3,  // ポイントマックス
    Fourth = 2, // ポイントアップ
    Fifth = 1,  // モーモーミルク
    Losing = 0, // はずれ
}

// ids は所持している ID のスライス。number_this_day はその日の当選番号
fn simulate_oneday(ids: &[u32], number_this_day: u32) -> Award {
    let mut award = Award::Losing; // 初期状態として「はずれ」にしておく
    let win_number = format!("{:05}", number_this_day); // 当選番号を5桁の文字列に変換
    for id in ids { // 所持している ID でループを回す
        let id = format!("{:06}", id); // ID を6桁の文字列に変換
        if id.starts_with(&win_number) || id.ends_with(&win_number) { // 特賞の判定。上5桁 or 下5桁の一致
            award = Award::First;
            break; // 特賞になったらforループを抜けていい
        } else if id.ends_with(&win_number[1..]) { // 以下、1等、2等…の判定を順に行っていく
            award = Award::Second;
        } else if id.ends_with(&win_number[2..]) && award < Award::Third {
            award = Award::Third;
        } else if id.ends_with(&win_number[3..]) && award < Award::Fourth {
            award = Award::Fourth;
        } else if id.ends_with(&win_number[4..]) && award < Award::Fifth {
            award = Award::Fifth;
        }
    }
    award
}
```

計算量的にもっと効率のいい判定方法がありそうな気がしてならない（緑コーダー並の感想）ですが、とりあえずこれでいきます。

判定ロジックに問題がないか確認するため、テストコードも書きました。

```rust
#[test]
fn test_simulate_oneday() {
    let ids = vec![0u32, 111111, 222222, 345678];
    // 5 digits match
    assert_eq!(simulate_oneday(&ids, 0), Award::First);
    assert_eq!(simulate_oneday(&ids, 11111), Award::First);
    assert_eq!(simulate_oneday(&ids, 22222), Award::First);
    assert_eq!(simulate_oneday(&ids, 34567), Award::First);
    assert_eq!(simulate_oneday(&ids, 45678), Award::First);

    // last 4 digits match
    assert_eq!(simulate_oneday(&ids, 1111), Award::Second);
    assert_eq!(simulate_oneday(&ids, 2222), Award::Second);
    assert_eq!(simulate_oneday(&ids, 91111), Award::Second);
    assert_eq!(simulate_oneday(&ids, 92222), Award::Second);
    assert_eq!(simulate_oneday(&ids, 95678), Award::Second);

    // last 3 digits match
    assert_eq!(simulate_oneday(&ids, 111), Award::Third);
    assert_eq!(simulate_oneday(&ids, 222), Award::Third);
    assert_eq!(simulate_oneday(&ids, 99111), Award::Third);
    assert_eq!(simulate_oneday(&ids, 99222), Award::Third);
    assert_eq!(simulate_oneday(&ids, 99678), Award::Third);

    // last 2 digits match
    assert_eq!(simulate_oneday(&ids, 11), Award::Fourth);
    assert_eq!(simulate_oneday(&ids, 22), Award::Fourth);
    assert_eq!(simulate_oneday(&ids, 99911), Award::Fourth);
    assert_eq!(simulate_oneday(&ids, 99922), Award::Fourth);
    assert_eq!(simulate_oneday(&ids, 99978), Award::Fourth);

    // last 1 digit matches
    assert_eq!(simulate_oneday(&ids, 1), Award::Fifth);
    assert_eq!(simulate_oneday(&ids, 2), Award::Fifth);
    assert_eq!(simulate_oneday(&ids, 99991), Award::Fifth);
    assert_eq!(simulate_oneday(&ids, 99992), Award::Fifth);
    assert_eq!(simulate_oneday(&ids, 99998), Award::Fifth);

    // no digit matches
    assert_eq!(simulate_oneday(&ids, 11119), Award::Losing);
    assert_eq!(simulate_oneday(&ids, 22229), Award::Losing);
    assert_eq!(simulate_oneday(&ids, 99999), Award::Losing);
}

```

## 4. 1から3をたくさん実行して集計！

```toml
# Cargo.toml
[dependencies]
indicatif = {version = "0.13.0", features = ["with_rayon"]}
rayon = "1.2.1"
```


```rust
use indicatif::ParallelProgressIterator;
use indicatif::ProgressBar;
use rand::prelude::*;
use rayon::prelude::*;

fn exec_simulation(
    // ユニークID数 いくつからスタートするか
    start: usize,
    // ユニークID数 いくつまでやるか
    end: usize,
    // 飛ばし飛ばしでシミュレーションする。例えば (start, end, step) = (100, 200, 30) だったら ユニークID数 100, 130, 160, 190 に対してシミュレーションをする
    step: usize,
    // シャッフル済みの 0 ~ 999999 の数字
    pokemon_ids_base: &[u32],
    // 1ユニークIDあたり、何回の試行をするか
    num_trials: usize,
) -> Vec<SimulationResult> {
    (start..=end)
        .into_par_iter() // rayon クレートで処理を並列化
        .progress_with(ProgressBar::new((end - start + 1) as u64)) // プログレスバーを表示するようにする
        .filter(|pokemon_num| (pokemon_num - start) % step == 0)
        .map_init(
            || rand::thread_rng(),
            |rng, pokemon_num| {
                let pokemon_ids = &pokemon_ids_base[..pokemon_num];
                let mut sim_result = SimulationResult::new(pokemon_num as u32);
                for _ in 0..num_trials {
                    let rnd_number: u32 = rng.gen_range(0, 100_000);
                    let result = simulate_oneday(pokemon_ids, rnd_number); // 1日分のシミュレーションを行う
                    sim_result.add_count(result); // 結果をカウント
                }
                sim_result
            },
        )
        .collect()
}
```

`rayon` クレートの `into_par_iter` を使うだけでよしなに並列処理をしてくれるようになります。簡単！！

また、 `indicatif` クレートを上のように `features = ["with_rayon"]` をつけて dependencies に書くと、
`rayon` での並列イテレーションに対してもプログレスバーを表示することができるようになります。最高です。

![Dec-14-2019 23-24-01.gif](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/151210/02c3062b-8892-bf45-c87f-c2a7ab0d89f1.gif)


結果を集計している `SimulationResult` は、ユニークID数 \\(x\\) に対して、シミュレーション結果の特賞、1等、2等……の数を記録するための構造体です。

実装に特筆すべき点はないため、コードは省略します。

# 実際にやってみた

今回作成したプログラムを以下のコマンドで走らせてみます。

ユニークID数: 1から960の間を1つずつ、それぞれのユニークIDに対して100万回のシミュレーションを行い、集計結果をCSVで出力します。

```bash
$ cargo run --release -- -s 1 -t 1000000
```

手元の MacBook Pro で6時間くらいかかりました。並列処理をしていなかったらと思うとぞっとします。

出力されたCSVをGoogleスプレッドシートで適当にグラフにしてみました。
その結果は—————————————— こちら！

<img width="853" alt="スクリーンショット 2019-12-14 23.51.03.png" src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/151210/6c76fd13-8573-2771-6f19-cd5f08606c25.png">

ポイントアップに関しては200前後で極大値があります。

ポイントマックスは 960 だとまだ増加中な感じですね。

ポイントアップ・マックスの確率を足し合わせたものだけのグラフを作ってみます。

<img width="752" alt="スクリーンショット_2019-12-15_0_07_44.png" src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/151210/640b8ae5-f389-1aba-5810-4875eb143232.png">

**ユニークIDを 450個 くらい用意しておけば、95% ほどの確率でポイント系アイテムが当たる** ようです。
（あくまでシミュレーションの結果です）

## 本当に最大化したいのは「ポイント系アイテムの期待値」

でも待ってください。

よく考えると、私たちが本当に最大化したいのは、「ポイント系アイテムの期待値」です。

つまり、 **1ポイントマックス = 3ポイントアップ** であるから、ポイント系アイテムの期待値 E が以下のように計算でき、この E を最大にするユニークID数が、知りたいものである。ということです。

$$ E = 3 \times (ポイントマックスが出る確率) + (ポイントアップが出る確率) $$

これを求めてみます。
ついでなので、ユニークIDの最大個数を960ではなく5000にしてシミュレーションを回してみました。
960 から 5000まで、 `step = 20` でシミュレーションした結果を、さきほどの 1 〜 960 の結果に結合させて、期待値 \\(E\\) をグラフにしてみました。

<img width="786" alt="スクリーンショット_2019-12-15_0_39_32.png" src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/151210/27fc791d-201b-1549-a4a6-b02443194bd6.png">

**ユニークID数 1820 個のポケモンを用意すれば、平均して1日あたり 2.16 ポイントアップを獲得できる**

ということがわかりました！……………あれ？

ゲームフリーク様、ボックスの個数を100くらいにしてください。よろしくお願いします。

# こうしてこの世界にまた一つ新たなトリビアが生まれた

![EAJM7x9UIAA8qei.jpg small.jpeg](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/151210/97d15e14-4621-5641-3808-85350b287f47.jpeg)

- ポイントアップがとても欲しい人 -> ユニークID 200個前後がおすすめ
- ポイントアップ・マックスが当たる**確率**を最大化したい人 -> ユニークID 450個くらいがおすすめ。95%くらいの確率でポイント系が当たる。
- ポイント系の**期待値**を最大化したい人 -> ボックス上限まで他人のポケモンで埋めておｋ

という結果になりました。うーん🤔

今回のソースコードはこちらのリポジトリにあります。
<a href="https://github.com/magurotuna/rust-pokemon-id-lottery"><img src="https://github-link-card.s3.ap-northeast-1.amazonaws.com/magurotuna/rust-pokemon-id-lottery.png" width="460px"></a>


# 補足 IDくじ当選条件に関して

IDくじの当選条件で、特等だけ「下n桁一致」ではなく「5桁一致」となっているのですが、これは [IDくじ - ポケモンWiki](https://wiki.xn--rckteqa2e.com/wiki/ID%E3%81%8F%E3%81%98) や [【ポケモン剣盾】IDくじの仕様と当選するコツ【ポケモンソードシールド】 | AppMedia](https://appmedia.jp/pokemon_swordshield/4116547) を参考にしました（自力で当てたことがないため…）

ただ、以下のツイートなどに見られるように、特等当選時には **「しも5ケタ すべてが おんなじロ！」** と言われるようです。

<blockquote class="twitter-tweet"><p lang="ja" dir="ltr">おはようございます、IDくじまさかの5桁一致です <a href="https://t.co/ySzzFi5ZYz">pic.twitter.com/ySzzFi5ZYz</a></p>&mdash; なないぬ (@nanainu2525) <a href="https://twitter.com/nanainu2525/status/1204547250887675904?ref_src=twsrc%5Etfw">December 10, 2019</a></blockquote>

今回作成したシミュレーションコードでは、**上** 5桁が一致する場合にも「特等」という判定をしているため、
もし正しい仕様が「**下** 5桁が一致しているときのみ、特等である」というものだった場合、間違ったシミュレーション結果になってしまっています。

どちらの仕様が正しいのか、ご存知の方いらっしゃったらコメントください。
