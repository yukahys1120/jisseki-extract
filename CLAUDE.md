# CLAUDE.md - 取引先実績抽出システム

## 1. 要件定義

### 1.1 プロジェクト概要

**プロジェクト名:** 取引先実績抽出システム (jisseki-extract)

**目的:**
企業Webサイトに記載されている「取引先実績」「主要取引先」などの情報を自動抽出し、一覧化するWebアプリケーション。

**MVP（Minimum Viable Product）スコープ:**
- ユーザーが企業WebサイトのURLを入力
- システムがHTMLを取得し、AI（Azure OpenAI GPT-4o-mini）で取引先企業名を抽出
- 結果を表形式で表示

---

### 1.2 機能要件

| ID | 機能 | 優先度 | 説明 |
|----|------|--------|------|
| F-001 | URL入力 | 必須 | ユーザーがURLを入力できるフォーム |
| F-002 | 取引先抽出 | 必須 | 入力されたURLから取引先企業リストを抽出 |
| F-003 | 結果表示 | 必須 | 抽出された企業名を表形式で表示 |
| F-004 | エラー表示 | 必須 | 抽出失敗時に適切なエラーメッセージを表示 |
| F-005 | ローディング表示 | 必須 | 処理中の状態をユーザーに通知 |
| F-006 | CSVエクスポート | 今後 | 抽出結果をCSV形式でダウンロード |
| F-007 | 複数URL一括処理 | 今後 | 複数のURLを一度に処理 |
| F-008 | 抽出履歴保存 | 今後 | 過去の抽出結果を保存・閲覧 |

---

### 1.3 非機能要件

| カテゴリ | 要件 |
|---------|------|
| **レスポンスタイム** | URL入力から結果表示まで10秒以内（通常時） |
| **対応ブラウザ** | Chrome, Safari, Edge最新版 |
| **スケーラビリティ** | MVP段階では考慮しない（単一ユーザー想定） |
| **セキュリティ** | APIキーの環境変数管理、XSS対策 |
| **可用性** | MVP段階では24/7稼働は不要 |

---

### 1.4 対応サイト分析

実際に動作確認した5つのサイトパターン：

| URL | HTML構造パターン | 特徴 | データ形式 |
|-----|----------------|------|-----------|
| `has-ltd.co.jp/company` | テーブル構造 | `<th class="wt">取引先実績</th>` | `<br>`タグ区切り（8社） |
| `kyoritsu.info/info/archive.html` | 見出し+テキスト | `<h2>主なお取引先` | テキストノード改行区切り |
| `kj-exp.com/light-cargo` | 段落内テキスト | `<p>＜取引実績＞...` | サービスごとに分散配置 |
| `bluebaton.co.jp/about` | リスト形式 | 見出し+箇条書き | 箇条書きリスト（9社+他多数） |
| `karitsu.co.jp/company/clients` | 順序なしリスト | `<ul><li>` | 50音順、70社以上 |

**共通課題:**
- HTML構造が完全にバラバラ
- セマンティックなマークアップが統一されていない
- 従来型スクレイピングでは各サイトごとにパーサーが必要

**解決策:**
- **AI活用型抽出エンジン**を採用
- HTMLを丸ごとAzure OpenAI APIに渡し、自然言語で抽出指示
- サイト構造の違いを吸収

---

### 1.5 制約事項

| 項目 | 制約内容 |
|------|---------|
| **対応ページ** | 静的HTML生成のページのみ（JavaScript動的レンダリングは非対応） |
| **APIコスト** | Azure OpenAI API利用料が発生（従量課金） |
| **抽出精度** | AI依存のため100%保証できない（誤抽出の可能性） |
| **レート制限** | Azure OpenAIのレート制限に依存 |

---

## 2. 技術設計

### 2.1 技術スタック

| レイヤー | 技術 | バージョン | 選定理由 |
|---------|------|-----------|---------|
| **フレームワーク** | Next.js | 14.x (App Router) | フルスタック、高速開発、TypeScript統合 |
| **言語** | TypeScript | 5.x | 型安全性、保守性 |
| **UI** | TailwindCSS | 3.x | 高速スタイリング、カスタマイズ性 |
| **AI API** | Azure OpenAI | GPT-4o-mini | 高精度テキスト抽出、日本語対応、コスト効率 |
| **HTTP Client** | node-fetch / axios | 最新 | HTML取得 |
| **パッケージ管理** | npm | - | Node.js標準 |

**その他ライブラリ候補:**
- `cheerio`: HTMLパース（必要に応じて）
- `zod`: バリデーション
- `react-hot-toast`: 通知UI

---

### 2.2 アーキテクチャ設計

#### システム構成図

```
┌─────────────────────────────────────────────┐
│         ユーザー（ブラウザ）                  │
└────────────────┬────────────────────────────┘
                 │ URL入力
                 ▼
┌─────────────────────────────────────────────┐
│      Next.js Frontend (app/page.tsx)        │
│  - URL入力フォーム                           │
│  - 結果表示テーブル                          │
│  - ローディング/エラー表示                    │
└────────────────┬────────────────────────────┘
                 │ POST /api/extract
                 ▼
┌─────────────────────────────────────────────┐
│   Next.js API Routes (app/api/extract)      │
│  - リクエスト検証                            │
│  - エラーハンドリング                         │
│  - レスポンス整形                            │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│    Business Logic Layer (lib/)              │
│                                             │
│  ┌─────────────┐      ┌─────────────┐      │
│  │ scraper.ts  │      │ extractor.ts│      │
│  │ HTML取得    │─────>│ AI抽出      │      │
│  └─────────────┘      └──────┬──────┘      │
│                               │             │
└───────────────────────────────┼─────────────┘
                                │
                                ▼
                   ┌────────────────────────┐
                   │  Azure OpenAI API      │
                   │  (GPT-4o-mini)         │
                   └────────────────────────┘
```

#### データフロー

```
1. ユーザーがURLを入力して送信
   ↓
2. Frontend が POST /api/extract にリクエスト
   ↓
3. API Route が lib/scraper.ts を呼び出し
   ↓
4. scraper.ts が対象URLのHTMLを取得
   ↓
5. lib/extractor.ts がHTMLをAzure OpenAI APIに送信
   ↓
6. Azure OpenAI APIが企業名リストをJSON形式で返却
   ↓
7. API Route がレスポンスを整形
   ↓
8. Frontend が結果を表示
```

---

### 2.3 ディレクトリ構造（重要度順）

```
jisseki-extract/
│
├── 📁 app/                      # メインアプリケーション
│   ├── page.tsx                 # トップページ（URL入力UI）
│   ├── layout.tsx               # 共通レイアウト
│   ├── globals.css              # グローバルスタイル
│   │
│   ├── api/                     # バックエンドAPI
│   │   └── extract/
│   │       └── route.ts         # POST /api/extract エンドポイント
│   │
│   └── components/              # UIコンポーネント
│       ├── UrlInput.tsx         # URL入力フォーム
│       ├── ResultTable.tsx      # 抽出結果表示テーブル
│       └── LoadingSpinner.tsx   # ローディング表示
│
├── 📁 lib/                      # ビジネスロジック層
│   ├── scraper.ts               # HTML取得処理
│   ├── extractor.ts             # Azure OpenAI API連携・企業名抽出
│   └── utils.ts                 # 汎用ユーティリティ
│
├── 📁 types/                    # TypeScript型定義
│   └── index.ts                 # 共通型（ExtractResult, Client等）
│
├── 📁 public/                   # 静的アセット
│   └── favicon.ico
│
├── 📄 package.json              # プロジェクト依存関係
├── 📄 package-lock.json         # 依存関係ロックファイル
├── 📄 tsconfig.json             # TypeScript設定
├── 📄 next.config.js            # Next.js設定
├── 📄 tailwind.config.ts        # TailwindCSS設定
├── 📄 postcss.config.js         # PostCSS設定
│
├── 📄 CLAUDE.md                 # プロジェクト設計書（このファイル）
├── 📄 README.md                 # プロジェクト概要・クイックスタート
│
├── 📄 .gitignore                # Git除外設定
├── 📄 .env.local                # 環境変数（Git除外）
└── 📄 .env.example              # 環境変数テンプレート（Gitコミット）

（自動生成ディレクトリ）
├── node_modules/                # npm依存関係（Git除外）
└── .next/                       # Next.jsビルド成果物（Git除外）
```

---

## 3. API仕様

### POST /api/extract

**概要:** URLから取引先実績を抽出する

**リクエスト:**
```typescript
POST /api/extract
Content-Type: application/json

{
  "url": "https://example.com/company"
}
```

**レスポンス（成功時）:**
```typescript
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "url": "https://example.com/company",
    "clients": [
      "ヤマト運輸株式会社",
      "佐川急便株式会社",
      "日本郵便株式会社"
    ],
    "extractedAt": "2025-11-19T12:34:56.789Z"
  }
}
```

**レスポンス（エラー時）:**
```typescript
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "success": false,
  "error": {
    "code": "INVALID_URL",
    "message": "有効なURLを入力してください"
  }
}
```

**エラーコード一覧:**

| コード | 説明 | HTTPステータス |
|-------|------|---------------|
| `INVALID_URL` | 不正なURL形式 | 400 |
| `FETCH_FAILED` | HTML取得失敗 | 500 |
| `EXTRACTION_FAILED` | AI抽出失敗 | 500 |
| `NO_CLIENTS_FOUND` | 取引先情報が見つからない | 404 |
| `API_KEY_MISSING` | Azure OpenAI APIキー未設定 | 500 |

---

## 4. 型定義

**types/index.ts:**

```typescript
// 抽出結果の型
export interface ExtractResult {
  url: string
  clients: string[]
  extractedAt: string
}

// APIレスポンスの型
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

// Azure OpenAI API用のプロンプト結果型
export interface AzureOpenAIExtractedData {
  clients: string[]
}
```

---

## 5. 開発ルール・規約

### 5.1 コーディング規約

**TypeScript:**
- 全てのファイルで厳格な型付けを行う（`strict: true`）
- `any`型の使用は原則禁止（やむを得ない場合のみコメント付きで許可）
- インターフェースは`types/index.ts`に集約

**命名規則:**
- コンポーネント: PascalCase（例: `UrlInput.tsx`）
- 関数・変数: camelCase（例: `extractClients`）
- 定数: UPPER_SNAKE_CASE（例: `API_ENDPOINT`）
- 型・インターフェース: PascalCase（例: `ExtractResult`）

**ファイル構成:**
- 1ファイル1コンポーネント/機能
- 200行を超える場合は分割を検討

---

### 5.2 コミット規約

**Conventional Commits形式を採用:**

```
<type>: <subject>

<body>
```

**Type一覧:**
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント変更
- `style`: コードスタイル修正（機能変更なし）
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `chore`: ビルド、設定変更

**例:**
```
feat: URL入力フォームコンポーネントを実装

- UrlInput.tsxを作成
- バリデーション追加
- TailwindCSSでスタイリング
```

---

### 5.3 エラーハンドリング方針

**原則:**
1. すべての非同期処理に`try-catch`を実装
2. ユーザーに分かりやすいエラーメッセージを表示
3. 開発環境ではコンソールに詳細ログ出力
4. 本番環境では機密情報を含まないエラーメッセージ

**実装例:**
```typescript
try {
  const result = await extractClients(url)
} catch (error) {
  console.error('Extraction failed:', error)
  return {
    success: false,
    error: {
      code: 'EXTRACTION_FAILED',
      message: '抽出処理に失敗しました。URLを確認してください。'
    }
  }
}
```

---

## 6. 環境変数

### 6.1 必要な環境変数

| 変数名 | 説明 | 必須 | 例 |
|-------|------|------|-----|
| `AZURE_OPENAI_API_KEY` | Azure OpenAI APIキー | ✅ | `0a3989a82aae4839...` |
| `AZURE_OPENAI_API_VERSION` | Azure OpenAI APIバージョン | ✅ | `2024-08-01-preview` |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | デプロイメント名 | ✅ | `gpt-4o-mini` |
| `AZURE_OPENAI_API_ENDPOINT` | エンドポイントURL | ✅ | `https://xxx.openai.azure.com` |

### 6.2 設定方法

**1. `.env.local`ファイルを作成（Git除外）:**
```bash
cp .env.example .env.local
```

**2. Azure OpenAI情報を設定:**
```env
AZURE_OPENAI_API_KEY=your_actual_key_here
AZURE_OPENAI_API_VERSION=2024-08-01-preview
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o-mini
AZURE_OPENAI_API_ENDPOINT=https://your-resource-name.openai.azure.com
```

**3. Azure OpenAI情報の確認方法:**
1. [Azure Portal](https://portal.azure.com/) にログイン
2. Azure OpenAI リソースを開く
3. 「Keys and Endpoint」セクションで確認
   - Key 1 または Key 2 → `AZURE_OPENAI_API_KEY`
   - Endpoint → `AZURE_OPENAI_API_ENDPOINT`
4. 「Model deployments」でデプロイメント名を確認 → `AZURE_OPENAI_DEPLOYMENT_NAME`

---

## 7. セットアップ手順

### 7.1 前提条件

- Node.js 18.x 以上
- npm 9.x 以上
- Azure OpenAI リソース（GPT-4o-miniデプロイ済み）

### 7.2 初期セットアップ

```bash
# 1. リポジトリをクローン（または作成）
cd jisseki-extract

# 2. 依存関係をインストール
npm install

# 3. 環境変数を設定
cp .env.example .env.local
# .env.localを編集してAPIキーを設定

# 4. 開発サーバーを起動
npm run dev

# 5. ブラウザで開く
# http://localhost:3000
```

### 7.3 よく使うコマンド

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー起動（http://localhost:3000） |
| `npm run build` | 本番用ビルド |
| `npm run start` | 本番サーバー起動 |
| `npm run lint` | ESLintでコードチェック |

---

## 8. 実装詳細

### 8.1 AI抽出ロジック（lib/extractor.ts）

**Azure OpenAI API呼び出し構成:**
```typescript
const messages = [
  {
    role: "system",
    content: "あなたは企業Webサイトから取引先情報を抽出する専門家です。HTMLから取引先企業名のみを正確に抽出してください。"
  },
  {
    role: "user",
    content: `以下のHTMLから「取引先実績」「主要取引先」「お取引先企業」などのセクションを探し、
企業名のリストを抽出してください。

抽出条件:
- 企業名のみを抽出（説明文は不要）
- 重複を排除
- 「株式会社」「有限会社」などの法人格を含める
- 「他多数」「※注記」などは除外

出力形式:
JSON形式で以下のように出力してください。
{
  "clients": ["企業名1", "企業名2", ...]
}

HTML:
${html}`
  }
]
```

**レート制限対策:**
- 同時リクエスト数制限（MVP段階では不要）
- リトライロジック（将来実装）

---

### 8.2 セキュリティ対策

| 脅威 | 対策 |
|------|------|
| **XSS** | Next.jsのデフォルトエスケープ機能を使用 |
| **APIキー漏洩** | `.env.local`をGit除外、環境変数で管理 |
| **SSRF** | URL検証（プロトコル、ドメインチェック） |
| **DoS** | レート制限（将来実装） |

---

## 9. 今後の拡張計画

### Phase 2（MVP後の追加機能）

| 機能 | 優先度 | 工数目安 | 説明 |
|------|--------|---------|------|
| CSVエクスポート | 高 | 1日 | 抽出結果をCSVダウンロード |
| 複数URL一括処理 | 中 | 2日 | 複数URLを一度に処理 |
| 抽出履歴保存 | 中 | 3日 | データベース（Supabase等）で履歴管理 |
| ユーザー認証 | 低 | 5日 | NextAuth.jsで認証機能 |
| カスタムプロンプト | 低 | 2日 | ユーザーが抽出条件をカスタマイズ |

### Phase 3（本格運用）

- JavaScript動的レンダリング対応（Puppeteer導入）
- 抽出精度のフィードバック機能
- 企業マスタとの突合
- API提供（外部サービス連携）

---

## 10. トラブルシューティング

### よくある問題

**Q1. `AZURE_OPENAI_API_KEY` が見つからないエラー**
```
A1. .env.localファイルが正しく配置されているか確認してください。
    ルートディレクトリに配置し、Next.jsを再起動してください。
    4つの環境変数（API_KEY, API_VERSION, DEPLOYMENT_NAME, API_ENDPOINT）が全て設定されているか確認してください。
```

**Q2. 抽出結果が空になる**
```
A2. 対象ページにJavaScriptで動的生成される内容が含まれている可能性があります。
    ブラウザで「ページのソースを表示」して、取引先情報が含まれているか確認してください。
```

**Q3. CORS エラーが発生**
```
A3. Next.js API Routesを経由しているため、通常発生しません。
    直接フロントエンドから外部URLにアクセスしている場合は実装を見直してください。
```

---

## 11. 参考リンク

- [Next.js 14 Documentation](https://nextjs.org/docs)
- [Azure OpenAI Service Documentation](https://learn.microsoft.com/azure/ai-services/openai/)
- [Azure OpenAI REST API Reference](https://learn.microsoft.com/azure/ai-services/openai/reference)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**最終更新:** 2025-11-19
**作成者:** Claude Code
**バージョン:** 1.0.0 (MVP)
