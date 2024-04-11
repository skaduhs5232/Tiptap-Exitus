// @ts-nocheck
import italic from '@icons/italic.svg'
import { Italic as ItalicBase } from '@tiptap/extension-italic'

function toggleItalic({ editor, button }) {
  editor.chain().focus().toggleItalic().run()
  if (editor.isActive('italic')) {
    button.on()
  } else {
    button.off()
  }
}

export const Italic = ItalicBase.extend({
  addStorage() {
    return {
      toolbarButtonConfig: {
        icon: italic,
        events: {
          click: toggleItalic
        },
        checkActive: this.name
      }
    }
  }
})
