import { type Editor } from '@tiptap/core'

import type ExitusEditor from '../../ExitusEditor'
import { Button } from '../ui'

function getExtensionStorage(editor: Editor, name: string) {
  const storage = editor.extensionStorage[name]
  return storage
}

function isEmptyObject(obj: object) {
  return Object.keys(obj).length === 0
}

class Toolbar {
  editor: Editor
  toolbarItems: string[]
  toolbarItemsDiv: HTMLDivElement

  constructor(exitusEditor: ExitusEditor) {
    this.editor = exitusEditor.getEditor()
    this.toolbarItems = exitusEditor.options.toolbar
    this.toolbarItemsDiv = exitusEditor.toolbarItemsDiv
  }

  createToolbar() {
    this.toolbarItems.forEach(item => {
      const tool = getExtensionStorage(this.editor, item)

      if (!isEmptyObject(tool)) {
        const toolbarButtonConfig = tool.toolbarButtonConfig
        const button = new Button(this.editor, toolbarButtonConfig)
        this.toolbarItemsDiv?.append(button.generateButton())
      }
    })
  }
}

export default Toolbar
