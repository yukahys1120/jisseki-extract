# 取引先実績抽出システム

企業WebサイトのURLを入力すると、AI（Azure OpenAI GPT-4o-mini）を活用して取引先実績を自動抽出するWebアプリケーション。

## 特徴

- **AI活用で柔軟な抽出**: 様々なHTML構造に対応（テーブル、リスト、段落など）
- **Next.js 14 + TypeScript**: モダンなフルスタックフレームワーク
- **シンプルなUI**: URL入力だけで即座に結果表示
- **高精度**: GPT-4o-miniによる高品質な企業名抽出

## 対応サイト例

以下のような異なる構造のサイトに対応済み：

- テーブル形式（`<table>`タグ）
- リスト形式（`<ul>/<li>`タグ）
- 段落テキスト（`<p>`タグ）
- 見出し+テキスト形式

## クイックスタート

### 前提条件

- Node.js 18.x 以上
- npm 9.x 以上
- Azure OpenAI リソース（GPT-4o-miniデプロイ済み）

### インストール

```bash
# 依存関係をインストール
npm install

# 環境変数を設定
cp .env.example .env.local
# .env.localを編集してAzure OpenAI情報を設定

# 開発サーバーを起動
npm run dev
```

ブラウザで `http://localhost:3000` を開いてください。

## 使い方

1. URLフォームに企業サイトのURL（例: `https://example.com/company`）を入力
2. 「抽出」ボタンをクリック
3. 取引先企業リストが表形式で表示されます

## 技術スタック

- **Frontend**: Next.js 14 (App Router), TypeScript, TailwindCSS
- **Backend**: Next.js API Routes
- **AI**: Azure OpenAI (GPT-4o-mini)

## プロジェクト構造

```
jisseki-extract/
├── app/              # Next.jsアプリケーション
│   ├── page.tsx      # メインページ
│   ├── api/          # APIエンドポイント
│   └── components/   # UIコンポーネント
├── lib/              # ビジネスロジック
│   ├── scraper.ts    # HTML取得
│   └── extractor.ts  # AI抽出処理
└── types/            # TypeScript型定義
```

## 開発コマンド

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番用ビルド |
| `npm run start` | 本番サーバー起動 |
| `npm run lint` | ESLintチェック |

## ドキュメント

詳細な設計・実装情報は [CLAUDE.md](./CLAUDE.md) を参照してください。

- 要件定義
- アーキテクチャ設計
- API仕様
- 開発ルール
- トラブルシューティング

## 今後の拡張予定

- [ ] CSVエクスポート機能
- [ ] 複数URL一括処理
- [ ] 抽出履歴の保存
- [ ] JavaScript動的レンダリング対応

## ライセンス

MIT

## 作成者

Generated with Claude Code
