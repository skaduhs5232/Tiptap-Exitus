import { type ButtonEventProps } from '@editor/ui'
import quote from '@icons/double-quotes-l.svg'
import { Blockquote as BlockquoteBase } from '@tiptap/extension-blockquote'

function toggleBlockQuote({ editor, button }: ButtonEventProps) {
  editor.chain().focus().toggleBlockquote().run()
  if (editor.isActive('blockquote')) {
    button.on()
  } else {
    button.off()
  }
}

export const Blockquote = BlockquoteBase.extend({
  addStorage() {
    return {
      toolbarButtonConfig: {
        icon: quote,
        click: toggleBlockQuote,
        checkActive: this.name
      }
    }
  }
})
