+++
title = "Rust の std::fs::copy の macOS と Linux での挙動の違い"
date = 2020-04-02
[taxonomies]
tags = ["Rust", "std"]
+++

Rust でファイルコピーを行う関数 [std::fs::copy](https://doc.rust-lang.org/std/fs/fn.copy.html) について、 macOS と Linux で挙動の違いがあることに気づいたため、まとめます。

<!-- more -->

# TL;DR

`std::fs::copy` は、**Linux においてはファイルの中身およびパーミッションだけコピーを行います**。メタデータ（ `Access Control List (ACL)` やファイルの変更時間など）はコピーされません。

一方、 **macOS においては、ファイルの中身に加えて、メタデータも複製されます**。

# std::fs::copy の実装を見てみる

`std::fs::copy` の内部実装は OS ごとに分かれています。

- [Linux に対する実装はこちら](https://github.com/rust-lang/rust/blob/master/src/libstd/sys/unix/fs.rs#L1135-L1212)
- [macOS に対する実装はこちら](https://github.com/rust-lang/rust/blob/master/src/libstd/sys/unix/fs.rs#L1214-L1323)

## Linux

Linux の実装を見てみると、以下のようになっています（抜粋、一部筆者のコメント付き）。

```rust
let (mut reader, reader_metadata) = open_from(from)?;
let len = reader_metadata.len();

// パーミッションをセットしてそう
let (mut writer, _) = open_to_and_set_permissions(to, reader_metadata)?;

let has_copy_file_range = HAS_COPY_FILE_RANGE.load(Ordering::Relaxed);
let mut written = 0u64;
// ここの while でファイルの中身をコピーしてそう
while written < len {
    let copy_result = if has_copy_file_range {
        let bytes_to_copy = cmp::min(len - written, usize::max_value() as u64) as usize;
        let copy_result = unsafe {
            cvt(copy_file_range(
                reader.as_raw_fd(),
                ptr::null_mut(),
                writer.as_raw_fd(),
                ptr::null_mut(),
                bytes_to_copy,
                0,
            ))
        };
        // 中略
        copy_result
    } else {
        Err(io::Error::from_raw_os_error(libc::ENOSYS))
    };
    // 中略
}
Ok(written)
```

`reader` から `writer` に `bytes_to_copy` バイトずつ書き込む、という操作を、コピーが終わるまで繰り返す。というような処理になっていそうな感じです。

`while` の前にある `open_to_and_set_permissions(to, reader_metadata)` の箇所が気になります。実装を見てみます。

```rust
fn open_to_and_set_permissions(
    to: &Path,
    reader_metadata: crate::fs::Metadata,
) -> io::Result<(crate::fs::File, crate::fs::Metadata)> {
    use crate::fs::OpenOptions;
    use crate::os::unix::fs::{OpenOptionsExt, PermissionsExt};

    let perm = reader_metadata.permissions();
    let writer = OpenOptions::new()
        .mode(perm.mode())
        .write(true)
        .create(true)
        .truncate(true)
        .open(to)?;
    let writer_metadata = writer.metadata()?;
    if writer_metadata.is_file() {
        writer.set_permissions(perm)?; // 読み取り元ファイルのパーミッションを読み取り先にセットしてる！
    }
    Ok((writer, writer_metadata))
}
```

実装は上のようになっていて、コメントにも書いた通り読み取り元のパーミッションを読み取り先にセットしていることが読み取れます。

以上のことから、Linux における `std::fs::copy` は、

- ファイルの中身
- パーミッション

の 2 つをコピーしているということが分かります。

## macOS

では macOS 向けでの実装はどうなっているでしょうか。見てみます。

```rust
const COPYFILE_ACL: u32 = 1 << 0;
const COPYFILE_STAT: u32 = 1 << 1;
const COPYFILE_XATTR: u32 = 1 << 2;
const COPYFILE_DATA: u32 = 1 << 3;

const COPYFILE_SECURITY: u32 = COPYFILE_STAT | COPYFILE_ACL;
const COPYFILE_METADATA: u32 = COPYFILE_SECURITY | COPYFILE_XATTR;
const COPYFILE_ALL: u32 = COPYFILE_METADATA | COPYFILE_DATA;

// 中略

extern "C" {
    // macOS においてファイルコピーを行うための標準 C ライブラリ関数 `fcopyfile` を呼び出すためのインタフェース
    fn fcopyfile(
        from: libc::c_int,
        to: libc::c_int,
        state: copyfile_state_t,
        flags: copyfile_flags_t,
    ) -> libc::c_int;
}

// 中略

let flags = if writer_metadata.is_file() { COPYFILE_ALL } else { COPYFILE_DATA };
// `fcopyfile` を呼び出す
cvt(unsafe { fcopyfile(reader.as_raw_fd(), writer.as_raw_fd(), state.0, flags) })?;
// 後略
```

macOS にはファイルコピーを行うために `libc` に `fcopyfile` という関数が用意されています。

[Mac OS X Manual Page For copyfile(3)](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man3/copyfile.3.html)

この関数を Rust から呼び出すことでファイルコピーが実現されているようです。
`fcopyfile` に渡すフラグは、ファイルコピーであれば `COPYFILE_ALL` となります。
上記にリンクを貼った `fcopyfile` のドキュメントを見ると、 `COPYFILE_ALL` フラグを渡すと以下のコピーを行うことが分かります。

- access control lists
- POSIX information (mode, modification time, etc.)
- extended attributes
- data

つまり、メタデータ含めて全部コピー！！って感じですね。

# まとめ

- `std::fs::copy` は、 Linux では中身とパーミッションのみをコピーする
- macOS ではメタデータも含めて全部コピーする
- Linux では [libc クレート](https://crates.io/crates/libc) 経由で直接システムコールを呼び出してコピーを行っているが、 macOS では OS の標準 C ライブラリにある `fcopyfile` 関数を呼び出すことでコピーを実現している

Rust の標準ライブラリ実装を読み解いていくのはとても楽しいし、勉強になるなと思いました 💪

今まであまり慣れ親しんでこなかった、システムコールを呼び出すほどの低レイヤー部分でもとても自然に読みすすめることができて、Rust の大きな特長の 1 つである zero-cost abstraction というか、低レイヤー部分でも適度な抽象度があって読みやすい、というような印象を持ちました。

今後も意欲的に Rust の標準ライブラリを読んでいったり、低レイヤー部分の知識を幅広く勉強していきたいなと思います。

なお、今回 `std::fs::copy` について調べたのは、このサイトの作成に使用している静的サイトジェネレータ [Zola](https://www.getzola.org/) に PR を出すための調査を行ったからでした。

[Preserve timestamps when copying files (#974) by magurotuna · Pull Request #983 · getzola/zola](https://github.com/getzola/zola/pull/983)

merge されるかな〜とそわそわしています。

# References

- [Mac OS X Manual Page For copyfile(3)](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man3/copyfile.3.html)
- [rust/fs.rs at master · rust-lang/rust](https://github.com/rust-lang/rust/blob/master/src/libstd/sys/unix/fs.rs)
