/**
 * HTML取得処理
 * 指定されたURLからHTMLを取得する
 */

export async function fetchHtml(url: string): Promise<string> {
  try {
    // URLバリデーション
    const urlObject = new URL(url)

    // HTTPSにアップグレード
    if (urlObject.protocol === 'http:') {
      urlObject.protocol = 'https:'
    }

    // HTML取得
    const response = await fetch(urlObject.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      // タイムアウト設定（10秒）
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()

    if (!html || html.trim().length === 0) {
      throw new Error('取得したHTMLが空です')
    }

    return html
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('Invalid URL')) {
      throw new Error('無効なURL形式です')
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('リクエストがタイムアウトしました')
    }

    throw error
  }
}
