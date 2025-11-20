/**
 * AI抽出ロジック
 * Azure OpenAI APIを使用してHTMLから取引先企業名を抽出する
 */

import { AzureOpenAI } from 'openai'
import type { AzureOpenAIExtractedData } from '@/types'

// 環境変数のバリデーション
function validateEnvVariables() {
  const required = [
    'AZURE_OPENAI_API_KEY',
    'AZURE_OPENAI_API_ENDPOINT',
    'AZURE_OPENAI_DEPLOYMENT_NAME',
  ]

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`環境変数 ${key} が設定されていません`)
    }
  }
}

/**
 * HTMLから取引先企業名を抽出
 */
export async function extractClients(html: string): Promise<string[]> {
  validateEnvVariables()

  // デバッグ: 環境変数の値を確認
  console.log('[ENV CHECK]', {
    endpoint: process.env.AZURE_OPENAI_API_ENDPOINT,
    deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-08-01-preview',
  })

  const client = new AzureOpenAI({
    apiKey: process.env.AZURE_OPENAI_API_KEY!,
    endpoint: process.env.AZURE_OPENAI_API_ENDPOINT!,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-08-01-preview',
  })

  const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME!

  try {
    const response = await client.chat.completions.create({
      model: deploymentName,
      messages: [
        {
          role: 'system',
          content:
            'あなたは企業Webサイトから取引先情報を抽出する専門家です。HTMLから取引先企業名のみを正確に抽出してください。',
        },
        {
          role: 'user',
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
${html.substring(0, 50000)}`,
        },
      ],
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content

    if (!content) {
      throw new Error('Azure OpenAI APIからレスポンスが取得できませんでした')
    }

    const parsed = JSON.parse(content) as AzureOpenAIExtractedData

    if (!parsed.clients || !Array.isArray(parsed.clients)) {
      throw new Error('取引先情報の抽出に失敗しました')
    }

    // 空の配列の場合
    if (parsed.clients.length === 0) {
      throw new Error('取引先情報が見つかりませんでした')
    }

    return parsed.clients
  } catch (error) {
    if (error instanceof Error) {
      // デバッグ用: エラーの詳細をログ出力
      console.error('[Azure OpenAI Error]', {
        message: error.message,
        name: error.name,
        stack: error.stack,
      })

      // Azure OpenAI APIエラーのハンドリング
      if (error.message.includes('rate limit')) {
        throw new Error('APIのレート制限に達しました。しばらく待ってから再試行してください。')
      }

      if (error.message.includes('authentication')) {
        throw new Error('Azure OpenAI APIの認証に失敗しました。APIキーを確認してください。')
      }

      if (error.message.includes('404') || error.message.includes('Resource not found')) {
        throw new Error(
          `404 Resource not found - デプロイメント名またはエンドポイントが正しくありません。` +
            `\nデプロイメント名: ${deploymentName}` +
            `\nエンドポイント: ${process.env.AZURE_OPENAI_API_ENDPOINT}`
        )
      }

      throw error
    }

    throw new Error('予期しないエラーが発生しました')
  }
}
