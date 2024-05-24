import { type Toolbar } from '@editor/toolbar'
import { createHTMLElement } from '@editor/utils'
import { type Editor } from '@tiptap/core'

import type ExitusEditor from '../../ExitusEditor'
import { type Tool } from '../toolbar/Tool'

import { type Dropdown } from '.'

export type ButtonEventProps = {
  editor: ExitusEditor
  button: Button
  event: Event
}

export interface ButtonConfig {
  icon: string
  label: string
  title: string
  attributes: object[]
  classList: string[]
  events: {
    [key: string]: (obj: ButtonEventProps) => void
  }
  checkActive: string | object
}

const defaultConfig: Partial<ButtonConfig> = {
  icon: '',
  label: '',
  title: '',
  classList: []
}

export class Button implements Tool {
  config: Partial<ButtonConfig>
  button: HTMLButtonElement
  editor: Editor
  dropdown!: Dropdown
  parentToolbar!: Toolbar
  constructor(editor: Editor, config: Partial<ButtonConfig>) {
    this.config = { ...defaultConfig, ...config }
    this.editor = editor
    this.button = this.createButton()
  }

  setEditor(editor: ExitusEditor) {
    this.editor = editor
  }

  createButton(): HTMLButtonElement {
    const button = createHTMLElement('button', {
      class: ['ex-toolbar-button', ...(this.config.classList as string[])].join(' '),
      id: `${Math.floor(Math.random() * 100) + 1}`,
      title: this.config.title as string
    })

    return button as HTMLButtonElement
  }

  setParentToolbar(toolbar: Toolbar) {
    this.parentToolbar = toolbar
  }

  bindEvents() {
    const events = this.config.events
    for (const key in events) {
      this.bind(key, events[key])
    }
  }

  bind(eventName: string, callback: (obj: any) => void) {
    this.button.addEventListener(eventName, event => {
      event.stopPropagation()
      event.preventDefault()
      callback({
        editor: this.editor,
        button: this,
        event
      })
    })
  }

  on() {
    this.button.classList.add('ex-button-active')
  }

  off() {
    this.button.classList.remove('ex-button-active')
  }

  toggleActive(on: boolean) {
    this.button.classList.toggle('ex-button-active', on)
  }

  active() {
    return this.button.classList.contains('ex-button-active')
  }

  editorCheckActive() {
    if (this.config.checkActive != undefined) {
      this.editor.on('transaction', () => {
        if (this.editor.isActive(this.config?.checkActive as string | object)) {
          this.on()
        } else {
          this.off()
        }
      })
    }
  }

  render() {
    this.editorCheckActive()
    this.button.innerHTML = (this.config?.icon as string) + (this.config?.label as string)
    return this.button
  }

  getButtonElement(): HTMLButtonElement {
    return this.button
  }
}
