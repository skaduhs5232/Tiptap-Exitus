import { EventBus } from '@editor/EventBus'
import { type Plugin } from '@editor/Plugin'
import { Toolbar } from '@editor/toolbar'
import { createHTMLElement, getHTMLFromFragment } from '@editor/utils'
import { type AnyExtension, Editor, type EditorOptions } from '@tiptap/core'
interface Config {
  [key: string]: any
  initialHeight?: number
  /**
   * Define a largura mínima e máxima do editor.
   * Aceita número (px) ou string com unidade (ex: '50%', '640px').
   */
  editorWidth?: {
    min?: number | string
    max?: number | string
  }
}

export interface ExitusEditorOptions extends EditorOptions {
  container: Element
  toolbarOrder: string[]
  config: Config
}

export type PluginClassConstructor = typeof Plugin

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function loadPluginsRequirements(options: Partial<ExitusEditorOptions>) {
  const plugins = ExitusEditor.plugins.reduce<AnyExtension[]>((acc, plugin) => {
    const requirements = plugin.requires.map(p => {
      if (plugin.pluginName === p.name) {
        if (options.config?.[plugin.pluginName]) {
          return p.configure(options.config?.[plugin.pluginName])
        }
      }

      return p
    })

    return [...acc, ...requirements]
  }, [])

  return plugins
}

class ExitusEditor extends Editor {
  editorInstance: string
  toolbar: Toolbar
  toolbarItemsDiv!: HTMLDivElement
  editorMainDiv!: HTMLDivElement
  private editorShellDiv!: HTMLDivElement
  private pluginsInstances = new Map<string, Plugin>()
  static extensions: AnyExtension[]
  static plugins: PluginClassConstructor[]
  static toolbarOrder: string[]
  private container: Element
  private config?: Config
  private _eventBus: EventBus
  private _handleDocumentPointer?: (e: Event) => void
  private _showToolbar?: () => void
  constructor(options: Partial<ExitusEditorOptions>) {
    if (!options.container) {
      throw new Error('Invalid Container Element !!')
    }

    const extensions = loadPluginsRequirements(options)

    super({ ...options, extensions })
    this._eventBus = new EventBus()

    this.config = options.config
    this.editorInstance = generateUUID()

    const toolbarOrder: string[] = [...ExitusEditor.toolbarOrder, ...(options.toolbarOrder ?? [])]

    this.toolbar = new Toolbar(this, toolbarOrder)

    this.initializePlugins(options)

    this.container = options.container as Element

    this._createUI()
  }

  private initializePlugins(options: Partial<ExitusEditorOptions>) {
    ExitusEditor.plugins.forEach(plugin => {
      const config = options.config?.[plugin.pluginName]
      const pluginInstance = new plugin(this, config)
      pluginInstance.init()
      this.pluginsInstances.set(plugin.pluginName, pluginInstance)
    })
  }

  getPluginInstance(name: string) {
    return this.pluginsInstances.get(name)
  }

  private _generateEditorUI() {
    const toolbarItemsDiv = this.toolbar.render()

    const toolbarEditor = createHTMLElement('div', { class: 'ex-toolbar-editor' }, [toolbarItemsDiv])

    const editorMain = this.options.element
    editorMain.className = 'editor-main'
    editorMain.setAttribute('spellcheck', 'false')
    editorMain.setAttribute('id', generateUUID())
    this.editorMainDiv = editorMain as HTMLDivElement

    const initialHeight = this.config && this.config?.initialHeight

    const editorScroller = createHTMLElement('div', { class: 'editor-scroller', style: initialHeight ? `height: ${initialHeight}px` : '' }, [
      editorMain
    ])

    const editorShell = createHTMLElement('div', { class: 'editor-shell' }, [toolbarEditor, editorScroller])

    const widthCfg = this.config?.editorWidth
    if (widthCfg) {
      const toCss = (v?: number | string) => (typeof v === 'number' ? `${v}px` : v)
      const minW = toCss(widthCfg.min)
      const maxW = toCss(widthCfg.max)
      if (minW) (editorShell as HTMLDivElement).style.minWidth = minW
      if (maxW) (editorShell as HTMLDivElement).style.maxWidth = maxW
    }
    this.editorShellDiv = editorShell as HTMLDivElement

    this.toolbarItemsDiv = toolbarItemsDiv

    if (this.config?.toolbar && this.config?.toolbar.showOnFocus) {
      this.toolbarItemsDiv.style.display = 'none'
      this._showToolbar = () => {
        this.toolbarItemsDiv.style.display = 'flex'
      }

      this.on('focus', this._showToolbar)

      this._handleDocumentPointer = (e: Event) => {
        const target = e.target as Node | null
        if (!target) return

        const inside = this.editorShellDiv.contains(target)

        if (inside) {
          this._showToolbar?.()
        } else {
          this.toolbarItemsDiv.style.display = 'none'
        }
      }

      document.addEventListener('pointerdown', this._handleDocumentPointer)
    }

    return editorShell
  }

  public getHTML(): string {
    return getHTMLFromFragment(this.state.doc.content, this.schema)
  }

  get eventBus() {
    return this._eventBus
  }

  private _createUI() {
    const editorUI = this._generateEditorUI()
    this.container.appendChild(editorUI)
  }

  destroy(): void {
    if (this._handleDocumentPointer) {
      document.removeEventListener('pointerdown', this._handleDocumentPointer)
      this._handleDocumentPointer = undefined
    }
    if (this._showToolbar) {
      this.off('focus', this._showToolbar)
      this._showToolbar = undefined
    }
    this.pluginsInstances.forEach(plugin => plugin.destroy())
    this.pluginsInstances.clear()
    super.destroy()
    this.container.innerHTML = ''

    this.toolbarItemsDiv = undefined as unknown as HTMLDivElement
    this.editorShellDiv = undefined as unknown as HTMLDivElement
    this.editorMainDiv = undefined as unknown as HTMLDivElement
  }
}

export default ExitusEditor
