# Auto Paginator

複数ページにわたるWebページを1枚に自動で連結し、スクロールだけで閲覧可能にするChrome拡張機能です。

## 🚀 主な機能

- **自動ページ連結**: 「次へ」ボタンやページネーションを自動検出し、次ページを現在のページの末尾に非同期でロードします。
- **URL同期**: スクロール位置に合わせて、ブラウザのアドレスバーのURLを自動的に更新します（`history.replaceState`）。
- **SITEINFOマネージャー**: 自動検出が効かないサイト向けに、XPathを使用したカスタム設定（名前、URL正規表現、メインコンテンツ、次ページリンク）を追加・管理できます。
- **ドラッグ＆ドロップによる優先順位付け**: SITEINFOの設定順序を直感的に変更可能です。
- **ドメイン別ブラックリスト**: 特定のサイトで拡張機能を無効化できます。
- **インポート/エクスポート**: SITEINFOや設定をJSON形式でバックアップ・共有できます。
- **CSSクラスの継承**: 挿入されたコンテンツに元のコンテナのクラスを継承させることで、サイトのデザインを崩さずに表示します。

## 🛠 技術スタック

- **Framework**: [Vue 3](https://vuejs.org/)
- **Build Tool**: [Vite](https://vitejs.dev/) + [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **API**: [Manifest V3](https://developer.chrome.com/docs/extensions/mv3/intro/)

## 📦 インストール手順

### 開発モードでの利用
1. 本リポジトリをクローンまたはダウンロードします。
2. 依存関係をインストールします:
   ```bash
   npm install
   ```
3. 開発サーバーを起動します:
   ```bash
   npm run dev
   ```
4. Chrome ブラウザを開き、 `chrome://extensions/` にアクセスします。
5. 「デベロッパー モード」をオンにします。
6. 「パッケージ化されていない拡張機能を読み込む」をクリックし、プロジェクト内の `dist` フォルダを選択します。

### ビルド
本番用のファイルを生成するには、以下のコマンドを実行します:
```bash
npm run build
```
生成された `dist` フォルダを拡張機能として読み込んでください。

## 📖 使い方

1. 拡張機能が有効な状態で、複数ページがあるサイト（Google検索結果やニュース記事など）を開きます。
2. ページ下部までスクロールすると、自動的に次のページが読み込まれます。
3. 読み込みが正常に行われない場合は、拡張機能のポップアップから「SITEINFO」を開き、そのサイト用のXPath設定を追加してください。

## 📝 ライセンス

[MIT License](LICENSE)
