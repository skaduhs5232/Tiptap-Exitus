import { Plugin } from '@editor/Plugin'
import { Button, type Dropdown, type DropDownEventProps } from '@editor/ui'
import centertIcon from '@icons/align-center.svg'
import justifyIcon from '@icons/align-justify.svg'
import alignLeftIcon from '@icons/align-left.svg'
import alignRightIcon from '@icons/align-right.svg'
import type ExitusEditor from '@src/ExitusEditor'
import { TextAlign } from '@tiptap/extension-text-align'

export class TextAlignPlugin extends Plugin {
  static get pluginName() {
    return 'textAlign'
  }

  static get requires() {
    return [
      TextAlign.configure({
        types: ['heading', 'paragraph']
      })
    ]
  }

  init(): void {
    this.editor.toolbar.setDropDown(
      TextAlignPlugin.pluginName,
      {
        icon: alignLeftIcon,
        click: this.showDropdown,
        tooltip: 'Alinhamento de texto',
        classes: ['ex-dropdown-alignments']
      },
      dropdown => {
        return this.createDropDownContent(this.editor, dropdown)
      }
    )
  }

  showDropdown({ event, dropdown }: DropDownEventProps) {
    event.stopPropagation()
    if (dropdown.isOpen) {
      dropdown.off()
    } else {
      dropdown.on()
    }
  }

  createDropDownContent(editor: ExitusEditor, dropdown: Dropdown) {
    const dropdownContent = document.createElement('div')
    dropdownContent.className = 'ex-dropdown-content'

    const alignLeft = createAlignmentButton(editor, dropdown, alignLeftIcon, 'left')
    const alignRight = createAlignmentButton(editor, dropdown, alignRightIcon, 'right')
    const justify = createAlignmentButton(editor, dropdown, justifyIcon, 'justify')
    const center = createAlignmentButton(editor, dropdown, centertIcon, 'center')

    dropdownContent?.append(alignLeft, alignRight, justify, center)

    return dropdownContent
  }
}

function createAlignmentButton(editor: ExitusEditor, dropdown: Dropdown, icon: string, alignment: string) {
  const button = new Button(editor, {
    icon: icon,
    classList: ['ex-mr-0'],
    checkActive: { textAlign: alignment }
  })

  button.bind('click', () => {
    editor.chain().focus().setTextAlign(alignment).run()
    dropdown.off()
  })

  return button.render()
}
