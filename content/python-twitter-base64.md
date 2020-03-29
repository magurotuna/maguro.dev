+++
title = "python-twitter で BASE64 形式の画像をツイートする"
date = 2019-03-27
[taxonomies]
tags = ["python", "twitter"]
+++

1. クライアントサイドで [Canvas API - Web API | MDN](https://developer.mozilla.org/ja/docs/Web/API/Canvas_API) 等を使って画像を処理する
2. `canvas.toDataURL()`で BASE64 形式の画像データを取得
3. このデータをサーバー側にPOSTして、サーバーで Twitter API を叩いて画像を添付したツイートをする

というようなシステムを作ろうとして、3の画像添付ツイートを行う部分で少し詰まったので、解決方法をまとめておきます。
なお、 Twitter の API key などを取得する部分は割愛させていただきます。

<!-- more -->

## 環境

- Python 3.7
- python-twitter 3.5

昔は`tweepy`をよく使っていたんですが、今回使おうとしたらドキュメントが古くて実態に即していない気がしたので、今回は`python-twitter`を使ってみました。

[bear/python-twitter: A Python wrapper around the Twitter API.](https://github.com/bear/python-twitter)

## ドキュメントを確認してみる

`python-twitter`のドキュメントは[こちら](https://python-twitter.readthedocs.io/en/latest/)にあります。

```python
import twitter
api = twitter.Api(consumer_key=[consumer key],
                  consumer_secret=[consumer secret],
                  access_token_key=[access token],
                  access_token_secret=[access token secret])
```

というようにしてインスタンスを取得してから、[PostUpdate](https://python-twitter.readthedocs.io/en/latest/twitter.html#twitter.api.Api.PostUpdate)を参考にして

```python
api.PostUpdate(status=[ツイート文面], media=[添付したい画像])
```

とすれば、画像を添付したツイートができそうな気がします。

ドキュメントによれば、`PostUpdate`のパラメータ`media`は

>media (int, str, fp, optional)
A URL, a local file, or a file-like object (something with a read() method), or a list of any combination of the above.

とあります。
通常の用途であれば画像ファイルへのパスを指定することが多いと思いますが、今回はクライアント側から BASE64 形式の画像データが送られてきた、というケースなので、画像ファイルパスを指定する方法ではダメです。
そこで、 **file-like object (something with a read() method)** に着目してみます。

## file-like object って何？

Python の公式ドキュメントをあたってみます。

[io --- ストリームを扱うコアツール — Python 3.7.3 ドキュメント](https://docs.python.org/ja/3/library/io.html)

によれば、

>I/O には主に3つの種類があります; テキスト I/O, バイナリ I/O, raw I/O です。（中略）これらのいずれかのカテゴリに属する具象オブジェクトは全て file object と呼ばれます。他によく使われる用語として ストリーム と file-like オブジェクト があります。

ということなので、この3つが **file-like object** と呼ばれているもののようです。
身近な例でいうと

```python
f = open('hoge.txt', 'r')
```

としたときの `f` が **file-like object** ということですね。

## どうすれば BASE64 データから file-like object を作れるの？

結論から説明すると

1. BASE64 文字列をバイナリに変換する
2. BASE64 バイナリをデコードする
3. io.BytesIO() する

というような手順を踏みます。

### 1. BASE64 文字列をバイナリに変換する

クライアント側からは `canvas.toDataURL()` で出力された

```
data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBD（以下略)
```

という文字列が渡されていて、変数`image`に入っているとします。
先頭についている `data:image/jpeg;base64,`は識別子のようなものでデータの内容には関係しないので、ここを取り除いた文字列をバイナリに変換します。

```python
b64_encoded_binary = image.split(',')[1].encode()
```

### 2. BASE64 バイナリをデコードする

```python
import base64
decoded_binary = base64.b64decode(b64_encoded_binary)
```

### 3. io.BytesIO() する

```python
import io
f = io.BytesIO(decoded_binary)
```

これで `f` が画像データの **file-like object** となります。

### まとめると

```python
import base64
import io

b64_encoded_binary = image.split(',')[1].encode()
decoded_binary = base64.b64decode(b64_encoded_binary)
f = io.BytesIO(decoded_binary)
```

この `f` を `api.PostUpdate` に渡せばOK!!!!
…………ではありません。もう一山ありました。

## `PostUpdate` の `media` パラメータに渡される file-like object は `open()` で開かれたものを前提としているっぽい

ここまでで作成した `f` を使って

```python
api.PostUpdate(status=[ツイート文面], media=f)
```
として試してみると、エラーが出ると思います。ファイルモード（バイナリモード？テキストモード？）が無いよ〜とかのエラーです。

[PostUpdate source](https://python-twitter.readthedocs.io/en/latest/_modules/twitter/api.html#Api.PostUpdate) で`PostUpdate`のソースを確認したところ、どうやら`PostUpdate`の`media`パラメータに渡される **file-like object** には

- f.mode
- f.name

の2つの属性がなければならないようです。
しかし、`io.BytesIO()`で作成したものにはこれらの属性がない、ということでエラーになっているらしい。

ないなら無理矢理つけちゃおうということで、

```python
f.mode = 'rb'  # 読み込み専用のバイナリモードであるというように擬態する
f.name = 'hoge.jpg'  # 拡張子さえ合っていれば問題ないと思います
```

としてみました。これで画像添付ツイートができるようになりました！

## 結論

こう書けば動きます。

```python
import twitter
import base64
import io

# image が BASE64 形式の画像データ
b64_encoded_binary = image.split(',')[1].encode()
decoded_binary = base64.b64decode(b64_encoded_binary)
f = io.BytesIO(decoded_binary)
f.mode = 'rb'  # 読み込み専用のバイナリモードであるというように擬態する
f.name = 'hoge.jpg'  # 拡張子さえ合っていれば問題ないと思います

api = twitter.Api(consumer_key=[consumer key],
                  consumer_secret=[consumer secret],
                  access_token_key=[access token],
                  access_token_secret=[access token secret])

api.PostUpdate(status=[ツイート文面], media=f)
```

## 軽く宣伝

このエントリで書いた内容は、一人開発RTAで僕が作った

[出演者ヅラ - あなたも某サマーライブ2019の出演者として発表されてみませんか？](https://karisama.maguro.dev/)

に使われています。クライアント側で Canvas を使用してフレームの画像を合成し、それを AWS Lambda に送ってツイートするという感じになっています。

もしよろしければ使って遊んでみてください。

#### 元ネタ

<blockquote class="twitter-tweet" data-lang="ja"><p lang="ja" dir="ltr">【アニサマ2019出演アーティスト】<br>9/1(日)出演　：　内田真礼<a href="https://twitter.com/hashtag/anisama?src=hash&amp;ref_src=twsrc%5Etfw">#anisama</a> <a href="https://t.co/mPRbXNiSH6">pic.twitter.com/mPRbXNiSH6</a></p>&mdash; AnimeloSummerLive (@anisama) <a href="https://twitter.com/anisama/status/1109315235704233984?ref_src=twsrc%5Etfw">2019年3月23日</a></blockquote>

#### 「出演者ヅラ」を使ってみるとこうなります

<blockquote class="twitter-tweet" data-lang="ja"><p lang="ja" dir="ltr">【仮サマ2019出演アーティスト】<br>8/30(金)　：　婚活元年<a href="https://twitter.com/hashtag/karisama?src=hash&amp;ref_src=twsrc%5Etfw">#karisama</a><a href="https://t.co/0e3tBMtWsX">https://t.co/0e3tBMtWsX</a> <a href="https://t.co/eZxNSiiiwB">pic.twitter.com/eZxNSiiiwB</a></p>&mdash; 婚活元年 (@maguro_lovelive) <a href="https://twitter.com/maguro_lovelive/status/1110352433320869889?ref_src=twsrc%5Etfw">2019年3月26日</a></blockquote>
