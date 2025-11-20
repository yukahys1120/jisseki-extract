/**
 * POST /api/extract
 * URLから取引先実績を抽出するAPIエンドポイント
 * BFSクローリング機能統合版
 */

import { NextRequest, NextResponse } from 'next/server'
import { fetchHtml } from '@/lib/scraper'
import { extractClients } from '@/lib/extractor'
import { crawlUrls } from '@/lib/url-collector'
import { filterByKeywords, groupByPriority } from '@/lib/keyword-filter'
import type { ApiResponse, ExtractResult } from '@/types'

export async function POST(request: NextRequest) {
  // デバッグ: 環境変数を確認
  console.log('[ROUTE ENV CHECK]', {
    endpoint: process.env.AZURE_OPENAI_API_ENDPOINT,
    deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION,
  })

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

    console.log(`[1/4] 入力URLで直接抽出を試行: ${url}`)

    // ステップ1: 入力URLで直接抽出を試行
    try {
      const html = await fetchHtml(url)
      const clients = await extractClients(html)

      if (clients.length > 0) {
        console.log(`[成功] 入力URLから${clients.length}件の取引先を抽出`)
        const result: ExtractResult = {
          url,
          clients,
          extractedAt: new Date().toISOString(),
        }
        return NextResponse.json<ApiResponse<ExtractResult>>({
          success: true,
          data: result,
        })
      }
    } catch (error) {
      console.log('[1/4] 入力URLから取引先が見つかりませんでした。サイト全体を探索します。')
    }

    // ステップ2: BFSでサイト全体のURL収集
    console.log('[2/4] BFSでサイト全体のURLを収集中...')
    let allUrls: string[]
    try {
      allUrls = await crawlUrls(url, {
        maxPages: 100,
        maxDepth: 2,
        sameDomainOnly: true,
        timeout: 10000,
      })
      console.log(`[2/4] ${allUrls.length}件のURLを収集しました`)
    } catch (error) {
      console.error('URL収集エラー:', error)
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: {
            code: 'CRAWL_FAILED',
            message: 'URL収集に失敗しました',
          },
        },
        { status: 500 }
      )
    }

    // ステップ3: キーワードフィルタリング
    console.log('[3/4] キーワードフィルタリング中...')
    const candidates = filterByKeywords(allUrls)
    const grouped = groupByPriority(candidates)

    console.log(
      `[3/4] 候補ページ: 優先度1=${grouped.priority1.length}件, 優先度2=${grouped.priority2.length}件, 優先度3=${grouped.priority3.length}件`
    )

    // デバッグ: 優先度2の候補を表示
    console.log('[DEBUG] 優先度2の候補URL:')
    grouped.priority2.slice(0, 10).forEach((c) => {
      console.log(`  - ${c.url} (${c.reason})`)
    })

    // デバッグ: corporate, archive が含まれているか確認
    const hasCorporate = allUrls.some((url) => url.includes('/corporate'))
    const hasArchive = allUrls.some((url) => url.includes('/archive'))
    console.log(`[DEBUG] /corporate を含むURL: ${hasCorporate}`)
    console.log(`[DEBUG] /archive を含むURL: ${hasArchive}`)

    // ステップ4: 優先度順にAI抽出（候補 → 残りの順で試行）
    console.log('[4/4] 候補ページから取引先を抽出中...')

    // 全候補を優先度順に結合
    const allCandidates = [
      ...grouped.priority1,
      ...grouped.priority2,
      ...grouped.priority3,
    ]

    console.log(`[4/4] まず優先候補${allCandidates.length}件を確認します`)

    // 候補URLのSetを作成
    const candidateUrls = new Set(allCandidates.map((c) => c.url))

    // 【フェーズ1】優先候補を順に試行
    for (let i = 0; i < allCandidates.length; i++) {
      const candidate = allCandidates[i]
      console.log(`[候補 ${i + 1}/${allCandidates.length}] ${candidate.url} (優先度${candidate.priority}) を確認中...`)

      try {
        const html = await fetchHtml(candidate.url)
        const clients = await extractClients(html)

        if (clients.length > 0) {
          console.log(`[成功] ${candidate.url}から${clients.length}件の取引先を抽出`)
          const result: ExtractResult = {
            url: candidate.url,
            clients,
            extractedAt: new Date().toISOString(),
          }
          return NextResponse.json<ApiResponse<ExtractResult>>({
            success: true,
            data: result,
          })
        } else {
          console.log(`[スキップ] ${candidate.url}: 取引先0件`)
        }
      } catch (error) {
        console.log(`[スキップ] ${candidate.url}: エラー -`, error instanceof Error ? error.message : String(error))
      }
    }

    // 【フェーズ2】候補で見つからなかった場合、残りのURLも試行
    const remainingUrls = allUrls.filter((url) => !candidateUrls.has(url))

    if (remainingUrls.length > 0) {
      console.log(`[4/4] 候補で見つからなかったため、残り${remainingUrls.length}件も確認します`)

      for (let i = 0; i < remainingUrls.length; i++) {
        const url = remainingUrls[i]
        console.log(`[残り ${i + 1}/${remainingUrls.length}] ${url} を確認中...`)

        try {
          const html = await fetchHtml(url)
          const clients = await extractClients(html)

          if (clients.length > 0) {
            console.log(`[成功] ${url}から${clients.length}件の取引先を抽出`)
            const result: ExtractResult = {
              url,
              clients,
              extractedAt: new Date().toISOString(),
            }
            return NextResponse.json<ApiResponse<ExtractResult>>({
              success: true,
              data: result,
            })
          } else {
            console.log(`[スキップ] ${url}: 取引先0件`)
          }
        } catch (error) {
          console.log(`[スキップ] ${url}: エラー -`, error instanceof Error ? error.message : String(error))
        }
      }
    }

    // すべて試行しても見つからなかった
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: 'NO_CLIENTS_FOUND',
          message: `サイト全体を探索しましたが、取引先情報が見つかりませんでした（${allUrls.length}ページを確認）`,
        },
      },
      { status: 404 }
    )
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
