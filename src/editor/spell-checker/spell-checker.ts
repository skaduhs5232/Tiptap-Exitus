export interface SpellCheckerConfig {
  apiUrl: string
  debounceMs?: number
  minWordLength?: number
}

export interface WordCheckResult {
  word: string
  isCorrect: boolean
  suggestions: string[]
}

export interface CacheEntry {
  isCorrect: boolean
  suggestions: string[]
  timestamp: number
}

export interface SpellingError {
  word: string
  suggestions: string[]
  position: { from: number; to: number }
}

export class SpellChecker {
  private apiUrl: string
  private debounceMs: number
  private minWordLength: number
  private cache: Map<string, CacheEntry> = new Map()
  private pendingRequests: Map<string, Promise<WordCheckResult>> = new Map()
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private pendingWords: Set<string> = new Set()
  private cacheMaxAge: number = 5 * 60 * 1000 // 5 minutos
  private onResultsCallback: ((results: Map<string, WordCheckResult>) => void) | null = null

  constructor(config: SpellCheckerConfig) {
    this.apiUrl = config.apiUrl
    this.debounceMs = config.debounceMs ?? 300
    this.minWordLength = config.minWordLength ?? 3
  }

  /**
   * Registra um callback para ser chamado quando os resultados estiverem prontos
   */
  onResults(callback: (results: Map<string, WordCheckResult>) => void): void {
    this.onResultsCallback = callback
  }

  /**
   * Extrai palavras de um texto, ignorando números e palavras curtas
   */
  private extractWords(text: string): string[] {
    const wordRegex = /[a-zA-ZÀ-ÿ]+/g
    const matches = text.match(wordRegex) || []
    return matches
      .filter(word => word.length >= this.minWordLength)
      .map(word => word.toLowerCase())
      .filter((word, index, self) => self.indexOf(word) === index) // Remove duplicatas
  }

  /**
   * Verifica se uma entrada do cache ainda é válida
   */
  private isCacheValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < this.cacheMaxAge
  }

  /**
   * Obtém resultado do cache se disponível e válido
   */
  private getFromCache(word: string): CacheEntry | null {
    const entry = this.cache.get(word)
    if (entry && this.isCacheValid(entry)) {
      return entry
    }
    if (entry) {
      this.cache.delete(word) // Remove entrada expirada
    }
    return null
  }

  /**
   * Adiciona resultado ao cache
   */
  private addToCache(word: string, isCorrect: boolean, suggestions: string[]): void {
    this.cache.set(word, {
      isCorrect,
      suggestions,
      timestamp: Date.now()
    })
  }

  /**
   * Faz requisição para verificar uma única palavra
   */
  private async checkWordApi(word: string): Promise<WordCheckResult> {
    // Verifica se já existe uma requisição pendente para esta palavra
    const pending = this.pendingRequests.get(word)
    if (pending) {
      return pending
    }

    const request = (async () => {
      try {
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ word })
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const result = await response.json()

        // Adiciona ao cache
        this.addToCache(word, result.is_correct, result.suggestions || [])

        return {
          word: result.word,
          isCorrect: result.is_correct,
          suggestions: result.suggestions || []
        }
      } catch (error) {
        console.error(`Erro ao verificar palavra "${word}":`, error)
        // Em caso de erro, assume que a palavra está correta para não bloquear o usuário
        return {
          word,
          isCorrect: true,
          suggestions: []
        }
      } finally {
        this.pendingRequests.delete(word)
      }
    })()

    this.pendingRequests.set(word, request)
    return request
  }

  /**
   * Agenda a verificação de palavras com debounce
   */
  public queueWordCheck(word: string): void {
    const normalizedWord = word.toLowerCase().trim()

    // Ignora palavras muito curtas
    if (normalizedWord.length < this.minWordLength) {
      return
    }

    // Ignora se já está no cache e é válido
    if (this.getFromCache(normalizedWord)) {
      return
    }

    this.pendingWords.add(normalizedWord)
    this.scheduleCheck()
  }

  /**
   * Agenda a verificação de múltiplas palavras extraídas de um texto
   */
  public queueTextCheck(text: string): void {
    const words = this.extractWords(text)

    words.forEach(word => {
      // Ignora se já está no cache e é válido
      if (!this.getFromCache(word)) {
        this.pendingWords.add(word)
      }
    })

    if (this.pendingWords.size > 0) {
      this.scheduleCheck()
    }
  }

  /**
   * Agenda a execução da verificação com debounce
   */
  private scheduleCheck(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    this.debounceTimer = setTimeout(() => {
      this.executePendingChecks()
    }, this.debounceMs)
  }

  /**
   * Executa todas as verificações pendentes
   */
  private async executePendingChecks(): Promise<void> {
    if (this.pendingWords.size === 0) {
      return
    }

    const wordsToCheck = Array.from(this.pendingWords)
    this.pendingWords.clear()

    const results = new Map<string, WordCheckResult>()

    // Processa palavras em paralelo, mas limita a concorrência
    const batchSize = 5
    for (let i = 0; i < wordsToCheck.length; i += batchSize) {
      const batch = wordsToCheck.slice(i, i + batchSize)
      const batchResults = await Promise.all(batch.map(word => this.checkWordApi(word)))

      batchResults.forEach(result => {
        results.set(result.word, result)
      })
    }

    // Notifica o callback se registrado
    if (this.onResultsCallback && results.size > 0) {
      this.onResultsCallback(results)
    }
  }

  /**
   * Verifica uma palavra imediatamente (síncrono se no cache)
   */
  public checkWord(word: string): WordCheckResult | null {
    const normalizedWord = word.toLowerCase().trim()

    if (normalizedWord.length < this.minWordLength) {
      return { word: normalizedWord, isCorrect: true, suggestions: [] }
    }

    const cached = this.getFromCache(normalizedWord)
    if (cached) {
      return {
        word: normalizedWord,
        isCorrect: cached.isCorrect,
        suggestions: cached.suggestions
      }
    }

    return null // Não está no cache, precisa fazer requisição
  }

  /**
   * Verifica uma palavra de forma assíncrona
   */
  public async checkWordAsync(word: string): Promise<WordCheckResult> {
    const normalizedWord = word.toLowerCase().trim()

    if (normalizedWord.length < this.minWordLength) {
      return { word: normalizedWord, isCorrect: true, suggestions: [] }
    }

    const cached = this.getFromCache(normalizedWord)
    if (cached) {
      return {
        word: normalizedWord,
        isCorrect: cached.isCorrect,
        suggestions: cached.suggestions
      }
    }

    return this.checkWordApi(normalizedWord)
  }

  /**
   * Analisa um texto completo e retorna os erros encontrados
   * Usa cache quando possível e faz requisições apenas para palavras desconhecidas
   */
  public async analyzeText(text: string): Promise<SpellingError[]> {
    const errors: SpellingError[] = []
    const wordRegex = /[a-zA-ZÀ-ÿ]+/g
    let match: RegExpExecArray | null

    const wordsToCheck: { word: string; from: number; to: number }[] = []

    // Encontra todas as palavras e suas posições
    while ((match = wordRegex.exec(text)) !== null) {
      const word = match[0]
      if (word.length >= this.minWordLength) {
        wordsToCheck.push({
          word: word.toLowerCase(),
          from: match.index,
          to: match.index + word.length
        })
      }
    }

    // Separa palavras em cache e palavras que precisam de requisição
    const cachedResults: { word: string; result: CacheEntry; from: number; to: number }[] = []
    const uncachedWords: { word: string; from: number; to: number }[] = []

    wordsToCheck.forEach(item => {
      const cached = this.getFromCache(item.word)
      if (cached) {
        cachedResults.push({ ...item, result: cached })
      } else {
        uncachedWords.push(item)
      }
    })

    // Processa resultados do cache
    cachedResults.forEach(item => {
      if (!item.result.isCorrect) {
        errors.push({
          word: item.word,
          suggestions: item.result.suggestions,
          position: { from: item.from, to: item.to }
        })
      }
    })

    // Faz requisições para palavras não cacheadas (em batches)
    if (uncachedWords.length > 0) {
      const uniqueWords = [...new Set(uncachedWords.map(w => w.word))]
      const results = new Map<string, WordCheckResult>()

      const batchSize = 5
      for (let i = 0; i < uniqueWords.length; i += batchSize) {
        const batch = uniqueWords.slice(i, i + batchSize)
        const batchResults = await Promise.all(batch.map(word => this.checkWordApi(word)))
        batchResults.forEach(result => {
          results.set(result.word, result)
        })
      }

      // Adiciona erros das palavras verificadas
      uncachedWords.forEach(item => {
        const result = results.get(item.word)
        if (result && !result.isCorrect) {
          errors.push({
            word: item.word,
            suggestions: result.suggestions,
            position: { from: item.from, to: item.to }
          })
        }
      })
    }

    return errors
  }

  /**
   * Obtém sugestões para uma palavra específica (do cache ou via API)
   */
  public async getSuggestions(word: string): Promise<string[]> {
    const result = await this.checkWordAsync(word)
    return result.suggestions
  }

  /**
   * Limpa o cache
   */
  public clearCache(): void {
    this.cache.clear()
  }

  /**
   * Limpa palavras pendentes e cancela o timer
   */
  public cancelPending(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    this.pendingWords.clear()
  }

  /**
   * Destrói a instância e limpa recursos
   */
  public destroy(): void {
    this.cancelPending()
    this.clearCache()
    this.onResultsCallback = null
  }
}
