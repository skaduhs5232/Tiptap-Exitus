import { Plugin } from '@editor/Plugin'
import { SpellChecker, type WordCheckResult } from '@editor/spell-checker/spell-checker'
import { type AnyExtension } from '@tiptap/core'
import { PluginKey, Plugin as ProseMirrorPlugin } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

import './style.css'

export interface SpellCheckerPluginConfig {
  apiUrl: string
  debounceMs?: number
  minWordLength?: number
}

const spellCheckPluginKey = new PluginKey('spellCheck')

export class SpellCheckerPlugin extends Plugin {
  private spellChecker: SpellChecker | null = null
  private suggestionsPopup: HTMLDivElement | null = null
  private prosemirrorPlugin: ProseMirrorPlugin | null = null

  static get requires(): AnyExtension[] {
    return []
  }

  static get pluginName(): string {
    return 'spellChecker'
  }

  init() {
    if (!this.config?.apiUrl) {
      console.warn('SpellCheckerPlugin: apiUrl não configurado')
      return
    }

    // Inicializa o SpellChecker
    this.spellChecker = new SpellChecker({
      apiUrl: this.config.apiUrl,
      debounceMs: typeof this.config.debounceMs === 'number' ? this.config.debounceMs : 500,
      minWordLength: typeof this.config.minWordLength === 'number' ? this.config.minWordLength : 3
    })

    // Registra callback para quando os resultados chegarem
    this.spellChecker.onResults(results => {
      this.updateEditorDecorations(results)
    })

    // Cria o popup de sugestões
    this.createSuggestionsPopup()

    // Adiciona listener para cliques no editor
    this.setupClickHandler()

    // Registra o plugin ProseMirror
    this.registerProseMirrorPlugin()

    // Adiciona listener para mudanças no editor
    this.editor.on('update', () => {
      this.scheduleSpellCheck()
    })
  }

  private registerProseMirrorPlugin() {
    // Cria um plugin ProseMirror para gerenciar as decorações
    this.prosemirrorPlugin = new ProseMirrorPlugin({
      key: spellCheckPluginKey,
      state: {
        init: () => DecorationSet.empty,
        apply: (tr, oldDecorations) => {
          const newDecorations = tr.getMeta(spellCheckPluginKey)
          if (newDecorations !== undefined) {
            return newDecorations
          }
          return oldDecorations.map(tr.mapping, tr.doc)
        }
      },
      props: {
        decorations: state => spellCheckPluginKey.getState(state)
      }
    })

    // Registra o plugin no editor
    this.editor.registerPlugin(this.prosemirrorPlugin)
  }

  private createSuggestionsPopup() {
    this.suggestionsPopup = document.createElement('div')
    this.suggestionsPopup.className = 'spell-checker-suggestions'
    this.suggestionsPopup.style.cssText = `
      position: absolute;
      display: none;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      z-index: 1000;
      max-height: 200px;
      overflow-y: auto;
      min-width: 150px;
    `
    document.body.appendChild(this.suggestionsPopup)

    // Fecha o popup quando clicar fora
    document.addEventListener('click', e => {
      if (this.suggestionsPopup && !this.suggestionsPopup.contains(e.target as Node)) {
        this.hideSuggestions()
      }
    })
  }

  private setupClickHandler() {
    const editorElement = this.editor.view.dom

    editorElement.addEventListener('click', (event: MouseEvent) => {
      const target = event.target as HTMLElement

      // Verifica se clicou em uma palavra com erro de ortografia
      if (target.classList.contains('spelling-error')) {
        event.preventDefault()
        event.stopPropagation()

        const word = target.dataset.word
        const suggestionsStr = target.dataset.suggestions
        const from = parseInt(target.dataset.from || '0', 10)
        const to = parseInt(target.dataset.to || '0', 10)

        if (word && suggestionsStr) {
          const suggestions = JSON.parse(suggestionsStr)
          this.showSuggestionsAt(event.clientX, event.clientY, word, suggestions, from, to)
        }
      }
    })
  }

  private scheduleSpellCheck() {
    if (!this.spellChecker) return

    const text = this.editor.getText()
    this.spellChecker.queueTextCheck(text)
  }

  private updateEditorDecorations(results: Map<string, WordCheckResult>) {
    const { state, view } = this.editor
    const { doc, tr } = state
    const decorations: Decoration[] = []

    // Percorre todos os nós de texto do documento
    doc.descendants((node, pos) => {
      if (node.isText) {
        const nodeText = node.text || ''
        const regex = /[a-zA-ZÀ-ÿ]+/g
        let wordMatch: RegExpExecArray | null

        while ((wordMatch = regex.exec(nodeText)) !== null) {
          const word = wordMatch[0].toLowerCase()
          const result = results.get(word)

          // Também verifica o cache local
          const cachedResult = this.spellChecker?.checkWord(word)
          const finalResult = result || cachedResult

          if (finalResult && !finalResult.isCorrect) {
            const from = pos + wordMatch.index
            const to = from + wordMatch[0].length

            decorations.push(
              Decoration.inline(from, to, {
                class: 'spelling-error',
                'data-word': word,
                'data-suggestions': JSON.stringify(finalResult.suggestions.slice(0, 5)),
                'data-from': String(from),
                'data-to': String(to),
                style: 'text-decoration: underline wavy red; cursor: pointer;'
              })
            )
          }
        }
      }
      return true
    })

    // Cria o DecorationSet e atualiza o editor
    const decorationSet = DecorationSet.create(doc, decorations)

    // Despacha a transação com as novas decorações
    const transaction = tr.setMeta(spellCheckPluginKey, decorationSet)
    view.dispatch(transaction)
  }

  private showSuggestionsAt(x: number, y: number, word: string, suggestions: string[], from: number, to: number) {
    if (!this.suggestionsPopup) return

    // Limpa o conteúdo anterior
    this.suggestionsPopup.innerHTML = ''

    // Título
    const title = document.createElement('div')
    title.style.cssText = 'padding: 8px 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #666;'
    title.textContent = `"${word}"`
    this.suggestionsPopup.appendChild(title)

    if (suggestions.length === 0) {
      const noSuggestions = document.createElement('div')
      noSuggestions.style.cssText = 'padding: 8px 12px; color: #999; font-style: italic;'
      noSuggestions.textContent = 'Sem sugestões'
      this.suggestionsPopup.appendChild(noSuggestions)
    } else {
      // Adiciona cada sugestão
      suggestions.forEach(suggestion => {
        const item = document.createElement('div')
        item.style.cssText = 'padding: 8px 12px; cursor: pointer; transition: background 0.2s;'
        item.textContent = suggestion

        item.addEventListener('mouseenter', () => {
          item.style.background = '#f0f0f0'
        })
        item.addEventListener('mouseleave', () => {
          item.style.background = 'transparent'
        })

        item.addEventListener('click', e => {
          e.preventDefault()
          e.stopPropagation()
          this.replaceWord(from, to, suggestion)
          this.hideSuggestions()
        })

        this.suggestionsPopup!.appendChild(item)
      })
    }

    // Posiciona e mostra o popup
    this.suggestionsPopup.style.left = `${x}px`
    this.suggestionsPopup.style.top = `${y + 10}px`
    this.suggestionsPopup.style.display = 'block'

    // Ajusta se estiver fora da tela
    const rect = this.suggestionsPopup.getBoundingClientRect()
    if (rect.right > window.innerWidth) {
      this.suggestionsPopup.style.left = `${window.innerWidth - rect.width - 10}px`
    }
    if (rect.bottom > window.innerHeight) {
      this.suggestionsPopup.style.top = `${y - rect.height - 10}px`
    }
  }

  private hideSuggestions() {
    if (this.suggestionsPopup) {
      this.suggestionsPopup.style.display = 'none'
    }
  }

  private replaceWord(from: number, to: number, replacement: string) {
    this.editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, replacement).run()

    // Reagenda verificação após a substituição
    setTimeout(() => {
      this.scheduleSpellCheck()
    }, 100)
  }

  destroy() {
    if (this.spellChecker) {
      this.spellChecker.destroy()
      this.spellChecker = null
    }

    if (this.suggestionsPopup) {
      this.suggestionsPopup.remove()
      this.suggestionsPopup = null
    }

    if (this.prosemirrorPlugin) {
      this.editor.unregisterPlugin(spellCheckPluginKey)
      this.prosemirrorPlugin = null
    }
  }
}
