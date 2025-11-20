/**
 * キーワードフィルタリング
 * URLとリンクテキストから取引先情報がありそうなページを優先度付け
 */

export interface CandidatePage {
  url: string
  priority: number  // 1=最高, 2=高, 3=中, 0=対象外
  reason: string    // マッチした理由
}

/**
 * URLパスとリンクテキストから優先度を計算
 */
function calculatePriority(url: string, linkText: string = ''): { priority: number; reason: string } {
  const urlLower = url.toLowerCase()
  const textLower = linkText.toLowerCase()

  // 優先度1（最高）: 実績・取引先を明示
  const priority1Patterns = {
    text: /(取引先|実績|クライアント|お客様|導入事例|主要取引先|配送実績|業務実績)/,
    url: /\/(client|achievement|partner|portfolio|jisseki|torihikisaki|case)/,
  }

  if (priority1Patterns.text.test(textLower)) {
    return { priority: 1, reason: `リンクテキスト: ${linkText}` }
  }
  if (priority1Patterns.url.test(urlLower)) {
    return { priority: 1, reason: `URLパス: ${url}` }
  }

  // 優先度2（高）: 会社情報系（実績が含まれている可能性が高い）
  const priority2Patterns = {
    text: /(会社概要|会社情報|会社案内|企業情報|about|corporate)/,
    url: /\/(company|about|corporate|info|archive)/,
  }

  if (priority2Patterns.text.test(textLower)) {
    return { priority: 2, reason: `リンクテキスト: ${linkText}` }
  }
  if (priority2Patterns.url.test(urlLower)) {
    return { priority: 2, reason: `URLパス: ${url}` }
  }

  // 優先度3（中）: サービス・事業内容（実績が含まれる場合あり）
  const priority3Patterns = {
    text: /(事業内容|サービス|service|business)/,
    url: /\/(service|business)/,
  }

  if (priority3Patterns.text.test(textLower)) {
    return { priority: 3, reason: `リンクテキスト: ${linkText}` }
  }
  if (priority3Patterns.url.test(urlLower)) {
    return { priority: 3, reason: `URLパス: ${url}` }
  }

  return { priority: 0, reason: 'マッチなし' }
}

/**
 * URL一覧からキーワードマッチングで候補を抽出
 *
 * Note: リンクテキストは現在のクローラーでは取得していないため、
 * URLのみで判定する簡易版。将来的にリンクテキストも収集する場合は拡張可能。
 */
export function filterByKeywords(urls: string[]): CandidatePage[] {
  const candidates: CandidatePage[] = []

  for (const url of urls) {
    const { priority, reason } = calculatePriority(url)

    if (priority > 0) {
      candidates.push({ url, priority, reason })
    }
  }

  // 優先度順にソート（数値が小さいほど優先度が高い）
  candidates.sort((a, b) => a.priority - b.priority)

  return candidates
}

/**
 * 候補ページを優先度別に分類
 */
export function groupByPriority(candidates: CandidatePage[]): {
  priority1: CandidatePage[]
  priority2: CandidatePage[]
  priority3: CandidatePage[]
} {
  return {
    priority1: candidates.filter((c) => c.priority === 1),
    priority2: candidates.filter((c) => c.priority === 2),
    priority3: candidates.filter((c) => c.priority === 3),
  }
}
