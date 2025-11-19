/**
 * POST /api/extract
 * URLから取引先実績を抽出するAPIエンドポイント
 */

import { NextRequest, NextResponse } from 'next/server'
import { fetchHtml } from '@/lib/scraper'
import { extractClients } from '@/lib/extractor'
import type { ApiResponse, ExtractResult } from '@/types'

export async function POST(request: NextRequest) {
  try {
    // リクエストボディの取得
    const body = await request.json()
    const { url } = body

    // URLバリデーション
    if (!url || typeof url !== 'string') {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: {
            code: 'INVALID_URL',
            message: '有効なURLを入力してください',
          },
        },
        { status: 400 }
      )
    }

    // HTML取得
    let html: string
    try {
      html = await fetchHtml(url)
    } catch (error) {
      console.error('HTML取得エラー:', error)
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: {
            code: 'FETCH_FAILED',
            message:
              error instanceof Error
                ? error.message
                : 'HTMLの取得に失敗しました',
          },
        },
        { status: 500 }
      )
    }

    // 取引先抽出
    let clients: string[]
    try {
      clients = await extractClients(html)
    } catch (error) {
      console.error('抽出エラー:', error)

      // 取引先が見つからない場合
      if (error instanceof Error && error.message.includes('見つかりませんでした')) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: {
              code: 'NO_CLIENTS_FOUND',
              message: '取引先情報が見つかりませんでした',
            },
          },
          { status: 404 }
        )
      }

      // APIキー未設定
      if (error instanceof Error && error.message.includes('環境変数')) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: {
              code: 'API_KEY_MISSING',
              message: 'Azure OpenAI APIの設定が不足しています',
            },
          },
          { status: 500 }
        )
      }

      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: {
            code: 'EXTRACTION_FAILED',
            message:
              error instanceof Error
                ? error.message
                : '抽出処理に失敗しました',
          },
        },
        { status: 500 }
      )
    }

    // 成功レスポンス
    const result: ExtractResult = {
      url,
      clients,
      extractedAt: new Date().toISOString(),
    }

    return NextResponse.json<ApiResponse<ExtractResult>>({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('予期しないエラー:', error)
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '予期しないエラーが発生しました',
        },
      },
      { status: 500 }
    )
  }
}
