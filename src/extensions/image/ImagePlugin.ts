import { Plugin } from '@editor/Plugin'
import imageAdd from '@icons/image-add-fill.svg'
import type ExitusEditor from '@src/ExitusEditor'

import { Image, imageFileToBlobUrl } from './image'
import './style.css'

export class ImagePlugin extends Plugin {
  static get pluginName(): string {
    return 'image'
  }

  static get requires() {
    return [
      Image.configure({
        inline: false,
        allowBase64: true
      })
    ]
  }

  init(): void {
    this.editor.toolbar.setButton('image', {
      icon: imageAdd,
      click: this.addImage,
      checkActive: 'image',
      tooltip: 'Carregar imagem'
    })
  }

  addImage({ editor }: { editor: ExitusEditor }) {
    const inputElement = document.createElement('input')
    inputElement.setAttribute('type', 'file')
    inputElement.className = 'ex-hidden'
    inputElement.setAttribute('id', 'editorImagePicker' + editor.editorInstance)
    inputElement.setAttribute('accept', 'image/jpeg,image/png,image/gif,image/bmp,image/webp,image/tiff')
    inputElement.addEventListener('change', function () {
      imageFileToBlobUrl(this.files![0], editor)
    })
    inputElement.click()
  }
}
