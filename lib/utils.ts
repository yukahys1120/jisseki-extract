/**
 * ユーティリティ関数
 */

import type { ExtractResult } from '@/types'

/**
 * 抽出結果をCSV形式に変換
 * @param result 抽出結果
 * @returns CSV文字列
 */
export function convertToCSV(result: ExtractResult): string {
  // CSVヘッダー
  const headers = ['#', '企業名', 'URL', '抽出日時']

  // CSVボディ
  const rows = result.clients.map((client, index) => {
    return [
      index + 1,
      `"${client.replace(/"/g, '""')}"`, // ダブルクォートをエスケープ
      `"${result.url}"`,
      `"${new Date(result.extractedAt).toLocaleString('ja-JP')}"`,
    ].join(',')
  })

  // ヘッダーとボディを結合
  return [headers.join(','), ...rows].join('\n')
}

/**
 * CSVファイルをダウンロード
 * @param csvContent CSV文字列
 * @param filename ファイル名（拡張子なし）
 */
export function downloadCSV(csvContent: string, filename: string = '取引先実績'): void {
  // BOM付きUTF-8でエンコード（Excelで文字化けしないため）
  const bom = '\uFEFF'
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })

  // ダウンロードリンクを作成
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // オブジェクトURLを解放
  URL.revokeObjectURL(url)
}

/**
 * 抽出結果をCSVファイルとしてエクスポート
 * @param result 抽出結果
 */
export function exportToCSV(result: ExtractResult): void {
  const csv = convertToCSV(result)
  downloadCSV(csv)
}
