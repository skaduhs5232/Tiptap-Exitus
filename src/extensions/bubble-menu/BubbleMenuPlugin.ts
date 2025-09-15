import { Plugin } from '@editor/Plugin'
import { Toolbar } from '@editor/toolbar/Toolbar'
import { Button } from '@editor/ui'
import type ExitusEditor from '@src/ExitusEditor'
import './bubbleMenu.css'
import BubbleMenu from '@tiptap/extension-bubble-menu'

export class BubbleMenuPlugin extends Plugin {
  static get pluginName() {
    return 'bubble-menu'
  }

  private toolbar!: Toolbar
  private tools: string[] = ['bold', 'italic', 'strike', 'katex']

  static get requires() {
    const element = document.createElement('div')
    element.className = 'bubble-menu ex-reset-all ex-bubble-menu'

    const bubble = BubbleMenu.configure({
      element,
      tippyOptions: {
        placement: 'bottom',
        offset: [0, 8]
      },
      shouldShow: ({ editor, state }) => {
        const instance = (editor as any as ExitusEditor).getPluginInstance?.(BubbleMenuPlugin.pluginName)
        const hasConfig = !!instance?.config
        return hasConfig && editor.isFocused && !state.selection.empty
      }
    })

    return [bubble]
  }

  init(): void {
    if (!this.config) return

    const allowed = new Set(['bold', 'italic', 'strike', 'katex'])
    const configured = Array.isArray(this.config?.tools) ? this.config!.tools : this.tools
    this.tools = configured.filter((k: string) => allowed.has(k))

    const editor = this.editor as ExitusEditor

    this.toolbar = new Toolbar(editor, this.tools)

    for (const key of this.tools) {
      const tool = editor.toolbar.getTool(key)
      if (!tool) continue
      if (tool instanceof Button) {
        const cfg = (tool as Button).config
        this.toolbar.setButton(key, {
          icon: cfg.icon as string,
          label: cfg.label as string,
          title: cfg.title as string,
          attributes: (cfg.attributes as any) || {},
          classList: (cfg.classList as string[]) || [],
          click: cfg.click as any,
          checkActive: cfg.checkActive as any,
          tooltip: cfg.tooltip as string
        })
      }
    }

    const bubbleExt: any = (editor as any).extensionManager.extensions.find((e: any) => e.name === 'bubbleMenu')
    const el: HTMLElement | null = bubbleExt?.options?.element ?? null
    if (el) {
      el.contentEditable = 'false'
      el.classList.add('bubble-menu', 'ex-reset-all')
      el.innerHTML = ''
      el.appendChild(this.toolbar.render())
    }
  }

  destroy(): void {
    const editor = this.editor as ExitusEditor
    const bubbleExt: any = (editor as any).extensionManager.extensions.find((e: any) => e.name === 'bubbleMenu')
    const el: HTMLElement | null = bubbleExt?.options?.element ?? null
    if (el) {
      // Remove qualquer conteúdo injetado pelo plugin (toolbar, etc.)
      el.innerHTML = ''
    }
    // Libera referência à toolbar para GC
    ;(this as any).toolbar = undefined
  }
}

export default BubbleMenuPlugin
