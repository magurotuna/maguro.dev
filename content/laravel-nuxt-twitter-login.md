+++
title = "Laravel + Nuxt.js + Firebase でいい感じにTwitterによるソーシャルログインを実現する"
date = 2019-05-09
[taxonomies]
tags = ["PHP", "Laravel", "Firebase", "Nuxt.js", "Twitter"]
+++

社会人になって１ヶ月が経過しました。
GWが長すぎて五月病になりそうで怖いですので、ダラダラしすぎないように個人開発をして過ごすことにしました。

作ろうとしているWebアプリにTwitterによるソーシャルログイン機能を追加したいと思い、先人の知恵をフル活用しながらスマートな構成を考え、実装してみました。

<!-- more -->

# 狙い

**フロントエンドに`Nuxt.js`、バックエンドのAPIサーバーとして`Laravel`を使っていて、Twitterによるソーシャルログインを実現したい。
かつ、面倒な部分は`Firebase`に任せちゃう。**

という目標でやっていきます。

なお、`Laravel Socialite`は使わない方針でいきます。
Twitterの場合、[Laravel Socialite 5.8](https://readouble.com/laravel/5.8/ja/socialite.html) にある

```php
<?php
Socialite::driver('google')->stateless()->user();
```

にあるような `stateless()` が動かないためです（sessionを使わなければならない模様）。今回`Laravel`にはAPIサーバーとして動いてもらうので、ステートレスに越したことはありません。
なお、この記事ではソーシャルログインのプロバイダとして Twitter を採用していますが、 Firebase Authentication が対応しているプロバイダなら同じような形で作れると思います。

# 環境

- PHP 7.2
- Laravel 5.8
- Nuxt.js 2.5

この記事では詳細な設定方法は書きませんが、 Laravel で CORS の設定をする必要があります。
便利なパッケージがありますので、これを利用するのがオススメです。

[barryvdh/laravel-cors](https://github.com/barryvdh/laravel-cors)

# 実装

今回作るソーシャルログインシステムの処理の流れは以下のようになります。

1. ユーザーがページの **Twitterでログイン** ボタンをクリックすると、`Firebase Authentication`によってTwitterのリダイレクト処理等が行われて、ユーザーのトークンが返ってくる（詳しくは後述しますが、ここで必要となるトークンはTwitterのアクセストークンではありません）
2. 返ってきたトークンを、フロントからAPIサーバーに投げる
3. `Laravel`の中で`Firebase SDK`を使い、フロントから渡されてきたトークンを検証し、ユーザーごとの固有ID`uid`を取得
4. ３で取得した`uid`をもとに自前のDBでユーザー情報を管理する。ユーザー情報を管理するテーブルを`users`とすると、`users`に`uid`のレコードが存在しているか確認し、存在していなかったら新規に作成する。
5. `users`テーブルの`uid`のレコードをもとに、（APIサーバー用の）アクセストークンを作成し、フロント側に返す。このアクセストークンをフロント側で cookie とか Localstorage とかに保存して、APIリクエストの際にヘッダにつけるようにする

以下、具体的に実装していきます。

## 1. `Firebase Authentication` による処理

特別なことはしません。Firebase に身を委ねていきます。
Firebaseのプロジェクト作成や、TwitterのAPIキー取得等の手順は割愛します。

まずFirebase SDK をインストールします。ここではyarnを使っていますがもちろんnpmでもOKです。

```bash
$ yarn add firebase
```

続いて初期化用のコード`firebase.js`を `plugins` ディレクトリ内に置いておきます。
実際に使う際はこのpluginをインポートして使うようにします。

```js
import firebase from 'firebase'

if (!firebase.apps.length) {
  firebase.initializeApp({
    apiKey: YOUR_API_KEY,
    authDomain: YOUR_AUTH_DOMAIN,
    databaseURL: YOUR_DATABASE_URL,
    projectId: YOUR_PROJECT_ID,
    storageBucket: YOUR_STORAGE_BUCKET,
    messagingSenderId: YOUR_MESSAGING_SENDER_ID,
  })
}

export default firebase
```

そして、Firebaseの本領発揮、めちゃくちゃ簡単なTwitterログイン処理です。
この短いコードでTwitterのOAuth認証が完了し、アクセストークンやTwitterのアカウント情報等の取得ができます。このコードの中だと `result.credential`の中にアクセストークンとかが、`result.user`の中にアカウント情報とかが入っています。

```vue
<template>
  <button @click="handleLogin">
    Twitterでログイン
  <button>
</template>

<script>
import firebase from '~/plugins/firebase'

export default {
  async mounted() {
    try {
      const result = await firebase.auth().getRedirectResult()
      if (result.credential) {
        console.log(result.credential)
      }
    } catch (e) {
      console.log(e)
    }
  },
  methods: {
    handleLogin() {
      const provider = new firebase.auth.TwitterAuthProvider()
      firebase.auth().signInWithRedirect(provider)
    },
  },
}
</script>
```

## 2. トークンをAPIサーバーに投げる

アクセストークンを受け取るAPIエンドポイントを`/api/auth`とします。
`pages/login/index.vue` 内の `mounted()`で、このエンドポイントにトークンをPOSTするように書き換えます。

ここで１点注意がありまして、Laravelサーバーで必要なトークンはTwitterアクセストークンなどではなく、Firebaseが発行した`IDトークン`と呼ばれるものです。
`IDトークン`をAPIサーバー上で使うことで、サーバーサイドでもFirebase経由でTwitterアカウント情報などが取得できます。従って、ここでは`IDトークン`をPOSTしていきます。

```js
// 前略
export default {
  async mounted() {
    try {
      const { user } = await firebase.auth().getRedirectResult()
      if (user) {
        const idToken = await user.getIdToken(true)
        await this.$axios.post('/api/auth', { idToken })
      }
    } catch (e) {
      console.log(e)
    }
  },
// 以下略
```

`/api/auth` でPOSTリクエストを受けるようにLaravelにルーティングを記述しておきます。
処理内容については次の節で書きます。

```php
<?php
// 適当な行に追加する
Route::post('/auth', 'LoginAction');
```

## 3. `IDトークン`をもとにユーザー固有ID`uid`を取得

上の`LoginAction`の処理内容を書いていきます。
まず`LoginAction.php`を artisan で作成します。

```bash
$ php artisan make:controller LoginAction --invokable
```

生成された`app/Http/Controllers/LoginAction.php`に処理を書いていきますが、その前に[Firebase Admin SDK for PHP](https://firebase-php.readthedocs.io/en/latest/index.html) を導入しておきましょう。

```bash
$ composer require kreait/firebase-php
```

下準備が終わりました。`LoginAction`を埋めていきます。
簡単のためコントローラに処理を全部書き、また、バリデーションや細かいエラー処理等は雑に行っていきます。必要に応じて修正してください。

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Firebase\Auth\Token\Exception\InvalidToken;
use Illuminate\Http\JsonResponse;
use Kreait\Firebase;

class LoginAction extends Controller
{
    /**
     * @var Firebase
     */
    private $firebase;

    /**
     * コンストラクタインジェクションで $firebase を用意します
     * @param Firebase $firebase
     */
    public function __construct(Firebase $firebase)
    {
        $this->firebase = $firebase;
    }

    /**
     * シングルアクションコントローラです。 /api/auth に POST されると、これが実行されます
     * @param  Request  $request
     * @return JsonResponse
     */
    public function __invoke(Request $request): JsonResponse
    {
        $id_token = $request->input('idToken');

        try {
            $verifiedIdToken = $this->firebase->getAuth()
                                ->verifyIdToken($id_token);
        } catch (InvalidToken $e) {
            return response()->json([
                'error' => 'error!!',
            ]);
        }

        $uid = $verifiedIdToken->getClaim('sub');
        $firebase_user = $this->firebase->getAuth()->getUser($uid);
        return response()->json([
            'uid' => $uid,
            'name' => $firebase_user->displayName,
        ]);
    }
}
```

`__invoke()` 内でメインの処理をおこなっていますが、[Authentication — Firebase Admin SDK for PHP Documentation](https://firebase-php.readthedocs.io/en/latest/authentication.html)に書かれている処理をほぼ丸コピペしたものです。あまり深いことは考えずに、こうすれば`uid`が取れるんだ、くらいの感覚で良いと思います。

コンストラクタインジェクションで `\Kreait\Firebase` のインスタンスを注入しているので、サービスプロバイダでバインドする必要があります。

```bash
$ php artisan make:provider FirebaseServiceProvider
```

でサービスプロバイダを作成して、作成された`app/Providers/FirebaseServiceProvider.php`を次のように編集しましょう。

```php
<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Kreait\Firebase\Factory;
use Kreait\Firebase\ServiceAccount;

class FirebaseServiceProvider extends ServiceProvider
{
    /**
     * @var bool
     */
    protected $defer = true;

    /**
     * @return void
     */
    public function register(): void
    {
        $this->app->singleton(\Kreait\Firebase::class, function () {
            // 'path/to/firebase-private-key' の部分は書き換えてください
            $serviceAccount = ServiceAccount::fromJsonFile('path/to/firebase-private-key');
            return (new Factory())
                ->withServiceAccount($serviceAccount)
                ->create();
        });
    }

    /**
     * @return array
     */
    public function provides(): array
    {
        return [\Kreait\Firebase::class];
    }
}
```

`path/to/firebase-private-key` の部分はご自身の秘密鍵JSONファイルがある場所を指定するよう書き換えてください。Laravel のヘルパ関数、`base_path()`などを使うとスマートかと思います。
なお、秘密鍵は Firebase コンソールから取得できます。（画像参照）

<img width="1425" alt="スクリーンショット_2019-05-03_1_39_28.png" src="https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/151210/8db8540d-071b-982c-39bc-e9d3d6f1da8f.png">

作成したサービスプロバイダを忘れずに `config/app.php` に追加します。

```php
<?php
// 前略
'providers' => [
    Illuminate\Auth\AuthServiceProvider::class,
    // 中略
    App\Providers\FirebaseServiceProvider::class, // ←追加
],
// 後略
```

これで、`IDトークン` を `/api/auth` に POST すると、`uid` & ついでにユーザーのアカウント情報（Twitterの名前 = display name やアイコン画像のURLなど） が返ってくるというところまで実装ができました。

## 4. `uid` をもとにユーザーを新規作成 or 取得

`LoginAction.php` 内の `__invoke` メソッドの中で以下のように`uid`が取得できました。（再掲）

```php
<?php
$uid = $verifiedIdToken->getClaim('sub');
```

この`uid`は、ユーザーを一意に求められるよう Firebase Authentication で割り振られたものです。
`uid`をもとにして自前のDBにもユーザー情報を格納していきたいと思います。

まず `users`テーブルを create するマイグレーションを作成します。なお、 Laravel インストールして最初から存在している2つのマイグレーションは削除して1から作っていきます。

```bash
$ php artisan make:migration create_users_table --create=users
```

作成された `database/migrations/YYYY_mm_dd_HHMMSS_create_users_table.php` に以下の内容を記述します。
`firebase_uid` というフィールドを用意し、ここに`uid`を格納するようにしてみます。

```php
<?php
// 前略
public function up()
{
    Schema::create('users', function (Blueprint $table) {
        $table->bigIncrements('id');
        $table->string('firebase_uid', 255)->unique();
        $table->string('name', 255);
        $table->timestamps();
    });
}
// 後略
```

マイグレーションします。

```bash
$ php artisan migrate
```

`firebase_uid` を `uid` で検索して、

- 存在している（=すでにアカウント作成済みのユーザー）である場合
  - そのユーザーのインスタンスを取得
- 存在していない場合（新規ユーザー）である場合
  - `users`テーブルにレコードを作成して、そのユーザーのインスタンスを取得

というような処理を`LoginAction.php`内に記述します。

```php
<?php
// 前略
$uid = $verifiedIdToken->getClaim('sub');
$firebase_user = $this->firebase->getAuth()->getUser($uid);

// ここから追加
$user = \App\User::firstOrCreate(
    ['firebase_uid' => $uid],
    ['name' => $firebase_user->displayName] // Twitterの名前をnameフィールドに登録
);
// ここまで追加

return response()->json([
    'uid' => $uid,
    'user' => $firebase_user->displayName,
]);
```

## 5. Laravel Passport でアクセストークンを作成する

いよいよ最後です。 Laravel Passport を導入して、ユーザーごとのアクセストークンを生成します。
まずサクッと Laravel Passport の導入、初期設定をやっていきます。
ほぼ [Laravel Passport 公式ドキュメント](https://readouble.com/laravel/5.8/ja/passport.html)の内容そのままなので、詳細はこちらをご確認ください。

```bash
$ composer require laravel/passport
$ php artisan migrate
$ php artisan passport:install
```

以上3つのコマンドを実行し終わったら、続いて以下の2つのファイルを編集します。

```php
<?php

namespace App;

use Laravel\Passport\HasApiTokens; // 追加
use Illuminate\Notifications\Notifiable;
use Illuminate\Foundation\Auth\User as Authenticatable;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable; // HasApiTokens を追加
    // 以下略
}
```

```php
<?php
// 前略
    'guards' => [
        'web' => [
            'driver' => 'session',
            'provider' => 'users',
        ],

        'api' => [
            'driver' => 'passport', // 'token' から 'passport' に変更
            'provider' => 'users',
            'hash' => false,
        ],
    ],
// 後略
```

以上で Passport の準備は完了です。
`LoginAction`でアクセストークンを生成し、レスポンスするJSONに加えます。

```php
<?php
// 前略
$user = \App\User::firstOrCreate(
    ['firebase_uid' => $uid],
    ['name' => $firebase_user->displayName] // Twitterの名前をnameフィールドに登録
);

$token = $user->createToken('example_token')->accessToken; // この行追加

return response()->json([
    'uid' => $uid,
    'user' => $firebase_user->displayName,
    'token' => $token, // この行追加
]);

```

あとは Nuxt.js 側で、このトークンを次回以降のリクエストの際にヘッダに付与するようにします。

```js
// 前略
export default {
  async mounted() {
    try {
      const { user } = await firebase.auth().getRedirectResult()
      if (user) {
        const idToken = await user.getIdToken(true)
        const { data } = await this.$axios.post('/api/auth', { idToken }) // 修正
        this.$axios.setToken(data.token, 'Bearer') // 追加
      }
    } catch (e) {
      console.log(e)
    }
  },
// 以下略
```

`this.$axios.setToken` することで、次回以降 `axios `を用いてHTTPリクエストをする際、自動的にヘッダにトークンが付与されるようになります。
そして、 Laravel 側では、

1. ルーティングでミドルウェアに `auth:api` を指定すると、有効なアクセストークンが付与されていないリクエストは `401 Unauthorized` が返るようになる
2. コントローラで `$request->user()` とすると認証済みユーザーのインスタンスが得られる

のようにして認証を扱うことができます。コードで書くと以下のような感じです。

```php
<?php
// このように auth:api をミドルウェアでつけると、認証必須のルーティングが作れます
Route::middleware('auth:api')->get('/hoge', 'HogeController@example');
```

```php
<?php
class HogeController extends Controller
{
    public function example(Request $request)
    {
        $user = $request->user(); // これで認証済みユーザーが取得できます
        // 以下いろいろな処理
    }
}
```

他にもいろいろな書き方が Laravel には用意されているので、詳しくは
[認証 5.8 Laravel](https://readouble.com/laravel/5.8/ja/authentication.html)
をご覧ください。


リロードするとログイン状態が切れてしまうので、トークンを cookie や localStorage に保存して永続化したい場合も多いかと思いますが、 `vuex-persistedstate` というライブラリを使うと Vuex をスマートに永続化できるのでオススメです。

[robinvdvleuten/vuex-persistedstate](https://github.com/robinvdvleuten/vuex-persistedstate)

（localStorage に保存すると Nuxt.js の SSR と相性が悪いです。 cookie だと問題ない……と思うのですが、未調査です。もし分かったら追記します。）

# おわり

- **Nuxt.js でフロントエンドを作るのが快適すぎて、バックエンドはステートレスなAPIサーバーとして動かしたい**

- **面倒な部分は Firebase でラクしたい**

という2つの要件を満たすべくいろいろ考えた末、このような実装にたどり着いたので、紹介させていただきました。

いつも個人開発しようとするとき、認証機能はさっさと作ってしまってサービスのコアとなる部分の開発に時間を使いたいと思いつつも、毎回地味に認証機能の実装に時間をとられたりしていたのですが、ようやく自分の中でのベタープラクティス（ベストとは言い切れません😵）が固まった気がしています。

「ここはこうしたほうがいいんじゃない？」などありましたらコメントいただけると嬉しいです！

# 参考文献

- [Firebase Auth のユーザ認証機能を自前のデータベースと連携する - Qiita](https://qiita.com/geerpm/items/165c31302edce1e52146)
- [【v2対応】Nuxt.jsとFirebaseを組み合わせて爆速でWebアプリケーションを構築する - Qiita](https://qiita.com/potato4d/items/cfddeb8732fec63cb29c)
- [Firebase Authentication の idToken をサーバーの認証に使い自サービスのUserと紐づけた話（iOS編） - machio Development Diary](https://blog.machio.me/entry/2017/12/17/131825)

