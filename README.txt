# Word Order Builder - Lessons Edition

## 概要
GitHub Pagesで使える、英語の語順並べ替え教材サイトです。

この版では、URLに問題データを埋め込みません。
`lessons.js` に問題データを入れ、生徒には短いURLを配布します。

例：
https://ユーザー名.github.io/リポジトリ名/?lesson=myanmar01

## ファイル構成
- index.html
- style.css
- script.js
- lessons.js
- README.txt

## Teacher Modeの開き方
サイトURLの末尾に `?teacher=1` を付けます。

例：
https://ユーザー名.github.io/リポジトリ名/?teacher=1

## 問題作成の流れ
1. Teacher Modeを開く
2. lesson IDを入力する
3. 1行につき1問で入力する
   形式：英文 || 日本語訳
4. 「lessons.jsを生成・ダウンロード」を押す
5. ダウンロードされた lessons.js をGitHub上の既存 lessons.js に上書きアップロードする
6. 表示された生徒用URLを配布する

## 入力例
I was shocked by the tragic sight. || 私はその悲惨な光景に衝撃を受けました。

## チャンク単位にする場合
英文中に `/` を入れてください。

I was shocked / by the tragic sight. || 私はその悲惨な光景に衝撃を受けました。

## 生徒用URL
https://ユーザー名.github.io/リポジトリ名/?lesson=lessonID

## 複数lessonを残したい場合
Teacher Modeの「追加用コードを表示」を使います。
表示されたコードを、既存の lessons.js の `window.LESSONS = { ... }` の中に追加してください。

## 注意
Teacher Modeで入力しただけでは、生徒用サイトには反映されません。
必ず生成した lessons.js をGitHubにアップロードしてください。
