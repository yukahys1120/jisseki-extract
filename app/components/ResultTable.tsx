/**
 * 抽出結果表示テーブルコンポーネント
 */

import type { ExtractResult } from '@/types'

interface ResultTableProps {
  result: ExtractResult
}

export default function ResultTable({ result }: ResultTableProps) {
  return (
    <div className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">抽出結果</h2>
        <p className="text-sm text-gray-600">
          {result.clients.length}件の取引先を抽出
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                企業名
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {result.clients.map((client, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {index + 1}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{client}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-lg bg-blue-50 p-4">
        <p className="text-xs text-gray-600">
          <span className="font-semibold">URL:</span> {result.url}
        </p>
        <p className="mt-1 text-xs text-gray-600">
          <span className="font-semibold">抽出日時:</span>{' '}
          {new Date(result.extractedAt).toLocaleString('ja-JP')}
        </p>
      </div>
    </div>
  )
}
