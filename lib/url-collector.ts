/**
 * BFS (Breadth-First Search) URL Collector
 * サイト全体のURLを収集するクローラー
 * 参考: homepage_analysis_ai/src/url_collector.py
 */

import * as cheerio from 'cheerio'

export interface CrawlOptions {
  maxPages?: number        // 最大ページ数（デフォルト: 100）
  maxDepth?: number        // 最大深度（デフォルト: 2）
  sameDomainOnly?: boolean // 同一ドメインのみ（デフォルト: true）
  timeout?: number         // タイムアウト（デフォルト: 10000ms）
}

interface QueueItem {
  url: string
  depth: number
}

/**
 * URLを正規化（相対URL解決、フラグメント除去）
 */
function normalizeUrl(candidateUrl: string, baseUrl: string): string {
  try {
    // 相対URLを絶対URLに変換
    const resolved = new URL(candidateUrl, baseUrl)

    // フラグメント（#section）を除去
    resolved.hash = ''

    // パスの正規化（末尾のスラッシュを統一）
    let path = resolved.pathname
    if (path !== '/' && path.endsWith('/')) {
      path = path.slice(0, -1)
    }
    resolved.pathname = path

    return resolved.href
  } catch (error) {
    // 無効なURLの場合は空文字を返す
    return ''
  }
}

/**
 * HTMLからリンクを抽出
 */
function extractLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html)
  const links: string[] = []

  $('a[href]').each((_, element) => {
    const href = $(element).attr('href')?.trim()
    if (!href) return

    // スキップするURL
    if (href.startsWith('#')) return
    if (href.toLowerCase().startsWith('mailto:')) return
    if (href.toLowerCase().startsWith('tel:')) return
    if (href.toLowerCase().startsWith('javascript:')) return
    if (href.toLowerCase().startsWith('ftp:')) return
    if (href.toLowerCase().startsWith('data:')) return

    const normalized = normalizeUrl(href, baseUrl)
    if (normalized) {
      links.push(normalized)
    }
  })

  return links
}

/**
 * BFSでサイト全体のURLを収集
 */
export async function crawlUrls(
  startUrl: string,
  options: CrawlOptions = {}
): Promise<string[]> {
  const {
    maxPages = 100,
    maxDepth = 2,
    sameDomainOnly = true,
    timeout = 10000,
  } = options

  // 開始URLを正規化
  const start = normalizeUrl(startUrl, startUrl)
  if (!start) {
    throw new Error('Invalid start URL')
  }

  const rootDomain = new URL(start).hostname

  // BFS用のデータ構造
  const queue: QueueItem[] = [{ url: start, depth: 0 }]
  const queued = new Set<string>([start])
  const visited = new Set<string>()
  const discovered: string[] = []

  while (queue.length > 0 && visited.size < maxPages) {
    const current = queue.shift()!
    const { url: currentUrl, depth } = current

    // すでに訪問済みならスキップ
    if (visited.has(currentUrl)) {
      queued.delete(currentUrl)
      continue
    }

    // 訪問済みに追加
    visited.add(currentUrl)
    discovered.push(currentUrl)

    // 深度制限に達したら次のリンクを探索しない
    if (depth >= maxDepth) {
      continue
    }

    // HTML取得
    let html: string
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(currentUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'jisseki-extract-bot/1.0',
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        console.warn(`[warn] Failed to fetch ${currentUrl}: ${response.status}`)
        continue
      }

      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('html')) {
        continue
      }

      html = await response.text()
    } catch (error) {
      console.warn(`[warn] Failed to fetch ${currentUrl}:`, error)
      continue
    }

    // リンク抽出
    const links = extractLinks(html, currentUrl)

    for (const link of links) {
      // 同一ドメインチェック
      if (sameDomainOnly) {
        const linkDomain = new URL(link).hostname
        if (linkDomain !== rootDomain) {
          continue
        }
      }

      // すでに訪問済みまたはキューに追加済みならスキップ
      if (visited.has(link) || queued.has(link)) {
        continue
      }

      // キューに追加
      queue.push({ url: link, depth: depth + 1 })
      queued.add(link)
    }
  }

  return discovered
}
