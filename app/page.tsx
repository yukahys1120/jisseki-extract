/**
 * メインページ
 * 取引先実績抽出システムのUIを提供
 */

'use client'

import { useState } from 'react'
import UrlInput from './components/UrlInput'
import ResultTable from './components/ResultTable'
import LoadingSpinner from './components/LoadingSpinner'
import type { ApiResponse, ExtractResult } from '@/types'

export default function Home() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ExtractResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (url: string) => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })

      const data: ApiResponse<ExtractResult> = await response.json()

      if (data.success && data.data) {
        setResult(data.data)
      } else if (data.error) {
        setError(data.error.message)
      } else {
        setError('予期しないエラーが発生しました')
      }
    } catch (err) {
      console.error('リクエストエラー:', err)
      setError('通信エラーが発生しました。もう一度お試しください。')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <header className="mb-12 text-center">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">
            取引先実績抽出システム
          </h1>
          <p className="text-gray-600">
            企業WebサイトからAIが自動的に取引先情報を抽出します
          </p>
        </header>

        <main className="rounded-xl bg-white p-8 shadow-lg">
          <UrlInput onSubmit={handleSubmit} isLoading={isLoading} />

          {isLoading && <LoadingSpinner />}

          {error && (
            <div className="mt-8 rounded-lg bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    エラーが発生しました
                  </h3>
                  <p className="mt-2 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {result && <ResultTable result={result} />}
        </main>

        <footer className="mt-8 text-center text-sm text-gray-600">
          <p>Powered by Azure OpenAI (GPT-4o-mini)</p>
        </footer>
      </div>
    </div>
  )
}
