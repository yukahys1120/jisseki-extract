/**
 * URL入力フォームコンポーネント
 */

'use client'

import { useState } from 'react'

interface UrlInputProps {
  onSubmit: (url: string) => void
  isLoading: boolean
}

export default function UrlInput({ onSubmit, isLoading }: UrlInputProps) {
  const [url, setUrl] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (url.trim()) {
      onSubmit(url.trim())
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="url-input"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            企業WebサイトのURL
          </label>
          <input
            id="url-input"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/company"
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
            required
          />
          <p className="mt-2 text-xs text-gray-500">
            取引先実績が記載されているページのURLを入力してください
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading || !url.trim()}
          className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {isLoading ? '抽出中...' : '取引先を抽出'}
        </button>
      </div>
    </form>
  )
}
