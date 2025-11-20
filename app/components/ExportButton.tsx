/**
 * CSVエクスポートボタンコンポーネント
 */

import type { ExtractResult } from '@/types'
import { exportToCSV } from '@/lib/utils'

interface ExportButtonProps {
  result: ExtractResult
}

export default function ExportButton({ result }: ExportButtonProps) {
  const handleExport = () => {
    exportToCSV(result)
  }

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
      aria-label="CSVファイルとしてエクスポート"
    >
      <svg
        className="-ml-1 mr-2 h-5 w-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      CSVエクスポート
    </button>
  )
}
