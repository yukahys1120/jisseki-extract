// 抽出結果の型
export interface ExtractResult {
  url: string
  clients: string[]
  extractedAt: string
}

// APIレスポンスの型
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}

// Azure OpenAI API用のプロンプト結果型
export interface AzureOpenAIExtractedData {
  clients: string[]
}
