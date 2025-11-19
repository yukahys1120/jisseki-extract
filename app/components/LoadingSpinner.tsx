/**
 * ローディング表示コンポーネント
 */

export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
        <p className="text-sm text-gray-600">抽出処理中...</p>
      </div>
    </div>
  )
}
