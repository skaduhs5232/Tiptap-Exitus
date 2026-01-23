import { Toolbar } from '@editor/toolbar'
import { Button, type ButtonEventProps, type Dropdown, type DropDownEventProps } from '@editor/ui'
import { Balloon, BalloonPosition } from '@editor/ui/Balloon'
import crop from '@icons/crop.svg'
import imgCaption from '@icons/image-caption.svg'
import imgFloatLeft from '@icons/image-float-left.svg'
import imgFloatRight from '@icons/image-float-right.svg'
import textDl from '@icons/image-left.svg'
import textDm from '@icons/image-middle.svg'
import textDr from '@icons/image-right.svg'
import imgSize from '@icons/image-size.svg'
import pallet from '@icons/palette.svg'
import type ExitusEditor from '@src/ExitusEditor'
import { findParentNodeClosestToPos, type Editor } from '@tiptap/core'
import { type Node as ProseMirrorNode } from '@tiptap/pm/model'
import { type Node } from '@tiptap/pm/model'
import { NodeSelection } from '@tiptap/pm/state'
import { type NodeView, type ViewMutationRecord } from '@tiptap/pm/view'
import { TextSelection } from 'prosemirror-state'

import ImageCropper from './ImageCropper'
import ResizableImage from './ResizableImage'

async function blobUrlToFile(blobUrl: string, fileName: string) {
  // Fetch the blob back from the blob URL
  const response = await fetch(blobUrl)
  const blob = await response.blob()

  // Convert blob to File
  return new File([blob], fileName, {
    type: blob.type,
    lastModified: Date.now()
  })
}

function resetImageClass(imageWrapper: HTMLElement, newClass: string) {
  const hadGray = imageWrapper.classList.contains('ex-image-grayscale')
  imageWrapper.className = ''
  imageWrapper.classList.add('ex-image-wrapper', 'tiptap-widget', newClass)
  if (hadGray) {
    imageWrapper.classList.add('ex-image-grayscale')
  }
}

function alinhaDireita(imageView: ImageView) {
  return ({ button }: ButtonEventProps) => {
    const { imageWrapper } = imageView
    if (!imageWrapper.classList.contains('ex-image-block-align-right')) {
      button.on()
      resetImageClass(imageWrapper, 'ex-image-block-align-right')
    } else {
      button.off()
      resetImageClass(imageWrapper, 'ex-image-block-middle')
    }
    imageView.updateAttributes({
      classes: imageWrapper.className
    })
  }
}

function alinhaEsquerda(imageView: ImageView) {
  return ({ button }: ButtonEventProps) => {
    const { imageWrapper } = imageView
    if (!imageWrapper.classList.contains('ex-image-block-align-left')) {
      button.on()
      resetImageClass(imageWrapper, 'ex-image-block-align-left')
    } else {
      button.off()
      resetImageClass(imageWrapper, 'ex-image-block-middle')
    }
    imageView.updateAttributes({
      classes: imageWrapper.className
    })
  }
}

function alinhaMeio(imageView: ImageView) {
  return ({ button }: ButtonEventProps) => {
    const { imageWrapper } = imageView
    if (!imageWrapper.classList.contains('ex-image-block-middle')) {
      button.on()
      resetImageClass(imageWrapper, 'ex-image-block-middle')
    } else {
      button.off()
      imageWrapper.classList.remove('ex-image-block-middle')
    }
    imageView.updateAttributes({
      classes: imageWrapper.className
    })
  }
}

function sizeButton(dropdown: Dropdown, imageView: ImageView, label: string, size: number | (() => number)) {
  const button = new Button(dropdown.editor, {
    label,
    classList: ['ex-mr-0']
  })

  button.bind('click', () => {
    const sizeValue = typeof size == 'number' ? size : size()
    imageView.updateAttributes({
      style: `width: ${sizeValue}px;`
    })
  })

  return button.render()
}

function criarDropDown(dropdown: Dropdown, imageView: ImageView) {
  const dropdownContent = document.createElement('div')
  dropdownContent.className = 'ex-dropdownList-content'

  const original = sizeButton(dropdown, imageView, `original`, () => {
    return imageView.originalSize
  })
  const pequeno = sizeButton(dropdown, imageView, '300px', 300)
  const medio = sizeButton(dropdown, imageView, '400px', 400)
  const grande = sizeButton(dropdown, imageView, '700px', 700)

  dropdownContent?.append(original, pequeno, medio, grande)

  return dropdownContent
}

function showDropdown({ event, dropdown }: DropDownEventProps) {
  event.stopPropagation()
  if (dropdown.isOpen) {
    dropdown.off()
  } else {
    dropdown.on()
  }
}

function criarDropDownAlinhamentoTexto(dropdown: Dropdown, imageView: ImageView) {
  const dropdownContent = document.createElement('div')
  dropdownContent.className = 'ex-dropdownList-content'

  const buttonAlignLeft = new Button(dropdown.editor, {
    icon: imgFloatLeft,
    classList: ['ex-mr-0']
  })

  const buttonAlignRight = new Button(dropdown.editor, {
    icon: imgFloatRight,
    classList: ['ex-mr-0']
  })

  buttonAlignLeft.bind('click', () => {
    const { imageWrapper } = imageView
    if (!imageWrapper.classList.contains('ex-image-float-left')) {
      buttonAlignLeft.on()
      buttonAlignRight.off()
      resetImageClass(imageWrapper, 'ex-image-float-left')
    } else {
      buttonAlignLeft.off()
      resetImageClass(imageWrapper, 'ex-image-block-middle')
    }
    imageView.updateAttributes({
      classes: imageWrapper.className
    })
  })

  buttonAlignRight.bind('click', () => {
    const { imageWrapper } = imageView
    if (!imageWrapper.classList.contains('ex-image-float-right')) {
      buttonAlignRight.on()
      buttonAlignLeft.off()
      resetImageClass(imageWrapper, 'ex-image-float-right')
    } else {
      buttonAlignRight.off()
      resetImageClass(imageWrapper, 'ex-image-block-middle')
    }
    imageView.updateAttributes({
      classes: imageWrapper.className
    })
  })

  dropdownContent?.append(buttonAlignLeft.render(), buttonAlignRight.render())

  return dropdownContent
}

function showDropdownAlinnhamentoTexto({ event, dropdown }: DropDownEventProps) {
  event.stopPropagation()
  if (dropdown.isOpen) {
    dropdown.off()
  } else {
    dropdown.on()
  }
}

function colorToggle(imageView: ImageView) {
  return ({ button }: ButtonEventProps) => {
    const { imageWrapper } = imageView
    if (imageWrapper.classList.contains('ex-image-grayscale')) {
      imageWrapper.classList.remove('ex-image-grayscale')
      button.on()
    } else {
      imageWrapper.classList.add('ex-image-grayscale')
      button.off()
    }
    imageView.updateAttributes({
      classes: imageWrapper.className
    })
  }
}
export class ImageView implements NodeView {
  node: Node
  dom: Element
  contentDOM?: HTMLElement | null | undefined
  image: HTMLImageElement
  imageWrapper: HTMLElement
  figcaption: HTMLElement
  balloon: Balloon
  editor: Editor
  getPos: boolean | (() => number)
  resizer: ResizableImage
  cropper: ImageCropper
  originalSize: number = 300

  constructor(
    node: Node,
    editor: Editor,
    getPos: boolean | (() => number),
    public uploadServer: { server: string; ignoreUrlsPrefix?: string[] } | undefined,
    public imgColorida: boolean = false
  ) {
    this.node = node
    this.editor = editor
    this.getPos = getPos

    this.imageWrapper = document.createElement('figure')
    this.imageWrapper.draggable = true
    this.imageWrapper.className = node.attrs.classes
    // aplicar grayscale por padrão apenas se imgColorida for false
    if (!this.imgColorida) {
      this.imageWrapper.classList.add('ex-image-grayscale')
    }

    this.image = this.imageWrapper.appendChild(document.createElement('img'))
    this.setImageAttributes(this.image, node)
    this.image.contentEditable = 'false'
    this.image.draggable = false
    this.image.setAttribute('style', 'display: table-cell')

    this.figcaption = this.imageWrapper.appendChild(document.createElement('figcaption'))
    this.figcaption.dataset['placeholder'] = 'Legenda da imagem'
    const figcaptionText = node.content.size === 0
    if (figcaptionText) {
      this.figcaption.className = 'ex-hidden'
    }

    this.contentDOM = this.figcaption

    this.uploadToMidiaServer(node.attrs.src)

    // Inicializa o resizer com configurações do Tiptap
    this.resizer = new ResizableImage(this, {
      directions: ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'],
      minWidth: 50,
      minHeight: 50,
      maxWidth: 700,
      maxHeight: 700,
      preserveAspectRatio: true
    })

    this.cropper = new ImageCropper(this)

    const toolbar = this.setupToolbar()

    this.balloon = new Balloon(this.editor, {
      position: BalloonPosition.TOP
    })

    this.balloon.ballonPanel.appendChild(toolbar.render())

    this.imageWrapper.appendChild(this.balloon.getBalloon())

    // Insert Paragraph Before button
    const insertBeforeBtn = document.createElement('div')
    insertBeforeBtn.classList.add('insert-paragraph-btn', 'insert-paragraph-before')
    insertBeforeBtn.innerHTML =
      '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M11 9l1.42 1.42L8.83 14H18V7h2v9H8.83l3.59 3.58L11 21l-6-6 6-6z"/></svg>'
    insertBeforeBtn.title = 'Insert paragraph before'
    insertBeforeBtn.addEventListener('click', e => {
      e.stopPropagation()
      this.insertParagraph('before')
    })
    this.imageWrapper.appendChild(insertBeforeBtn)

    // Insert Paragraph After button
    const insertAfterBtn = document.createElement('div')
    insertAfterBtn.classList.add('insert-paragraph-btn', 'insert-paragraph-after')
    insertAfterBtn.innerHTML =
      '<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M11 9l1.42 1.42L8.83 14H18V7h2v9H8.83l3.59 3.58L11 21l-6-6 6-6z"/></svg>'
    insertAfterBtn.title = 'Insert paragraph after'
    insertAfterBtn.addEventListener('click', e => {
      e.stopPropagation()
      this.insertParagraph('after')
    })
    this.imageWrapper.appendChild(insertAfterBtn)

    this.imageClickHandler()

    this.dom = this.imageWrapper
  }

  toggleFigcation(button: Button) {
    const figcaption = this.figcaption
    if (figcaption) {
      if (figcaption.classList.contains('ex-hidden')) {
        figcaption.classList.remove('ex-hidden')
        this.figcaption.classList.add('figcaption-is-empty')
        button.on()
      } else {
        figcaption.classList.add('ex-hidden')
        figcaption.textContent = ''
        button.off()
      }
    }
  }

  update(newNode: ProseMirrorNode) {
    if (newNode.type !== this.node.type) {
      return false
    }

    this.figcaption.classList.toggle('figcaption-is-empty', newNode.content.size === 0)

    this.node = newNode
    this.setImageAttributes(this.image, this.node)

    return true
  }

  imageClickHandler() {
    this.image.addEventListener('click', event => {
      event.stopPropagation()

      const clickOutside = (event: Event) => {
        const target = event.target as HTMLElement

        if (target.closest('.ex-image-wrapper') === null) {
          if (this.cropper.active) {
            this.cropper.cancel()
          }
          this.balloon.hide()
          this.imageWrapper.classList.remove('ex-selected')
          this.resizer.hide()
          window.removeEventListener('mousedown', clickOutside)
        }
      }

      window.addEventListener('mousedown', clickOutside)

      const { view, state } = this.editor

      if (typeof this.getPos === 'function') {
        const transaction = state.tr.setSelection(NodeSelection.create(state.doc, this.getPos()))
        view.dispatch(transaction)
      }
    })
  }

  selectNode() {
    this.imageWrapper.classList.add('ex-selected')
    this.resizer.show()
    this.balloon.show()
  }

  async uploadToMidiaServer(url: string) {
    //const imageUrlRegex = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif|bmp|webp|svg))/i
    if (url.startsWith('blob:')) {
      const imageFile = await blobUrlToFile(url, 'upload.png')

      const formData = new FormData()
      formData.append('file', imageFile)

      this.imageWrapper.classList.add('ex-image-uploading')

      fetch(`${this.uploadServer?.server}`, {
        method: 'POST',
        body: formData
      })
        .then(res => res.json())
        .then(data => {
          this.imageWrapper.classList.remove('ex-image-uploading')
          this.updateAttributes({ src: data.url })
        })

      return
    }

    if (this.uploadServer && !this.uploadServer?.ignoreUrlsPrefix?.some(prefix => url.startsWith(prefix)) && !url.startsWith('data:image')) {
      this.imageWrapper.classList.add('ex-image-uploading')
      fetch(`${this.uploadServer?.server}?url=${encodeURIComponent(url)}`, {
        method: 'GET'
      })
        .then(res => res.json())
        .then(data => {
          this.imageWrapper.classList.remove('ex-image-uploading')
          this.updateAttributes({ src: data.url })
        })

      return
    }
  }

  ignoreMutation(mutation: ViewMutationRecord) {
    if (mutation.type === 'attributes') {
      return true
    }
    return false
  }

  updateAttributes(attributes: Record<string, any>) {
    if (typeof this.getPos === 'function') {
      const { view } = this.editor
      const transaction = view.state.tr
      transaction.setNodeMarkup(this.getPos(), undefined, {
        ...this.node.attrs,
        ...attributes
      })
      view.dispatch(transaction)
    }
  }

  setImageAttributes(image: Element, node: Node) {
    this.imageWrapper.setAttribute('style', `${node.attrs.style}`)
    image.setAttribute('src', node.attrs.src)
  }

  setupToolbar() {
    const toolbar = new Toolbar(this.editor as ExitusEditor, [
      'adicionarLegenda',
      'alinhaEsquerda',
      'alinhaMeio',
      'alinhaDireita',
      'tamanhoImg',
      'alinhamentoTexto',
      'colorirImagem',
      'cortarImagem'
    ])
    toolbar.setButton('adicionarLegenda', {
      icon: imgCaption,
      click: ({ button }) => {
        this.toggleFigcation(button)
      },
      tooltip: 'Habilitar legenda'
    })
    toolbar.setButton('alinhaDireita', {
      icon: textDr,
      click: alinhaDireita(this),
      tooltip: 'Imagem alinhada a direita'
    })
    toolbar.setButton('alinhaMeio', {
      icon: textDm,
      click: alinhaMeio(this),
      tooltip: 'Imagem centralizada'
    })
    toolbar.setButton('alinhaEsquerda', {
      icon: textDl,
      click: alinhaEsquerda(this),
      tooltip: 'Imagem alinhada a asquerda'
    })
    toolbar.setDropDown(
      'tamanhoImg',
      {
        icon: imgSize,
        click: showDropdown,
        tooltip: 'Redimensionar imagem',
        classes: []
      },
      dropdown => {
        return criarDropDown(dropdown, this)
      }
    )
    toolbar.setDropDown(
      'alinhamentoTexto',
      {
        icon: imgFloatLeft,
        click: showDropdownAlinnhamentoTexto,
        tooltip: 'Alinhar imagem ao texto',
        classes: []
      },
      dropdown => {
        return criarDropDownAlinhamentoTexto(dropdown, this)
      }
    )
    toolbar.setButton('colorirImagem', {
      icon: pallet,
      click: colorToggle(this),
      tooltip: 'Colorir/descolorir imagem'
    })
    toolbar.setButton('cortarImagem', {
      icon: crop,
      click: ({ button }) => {
        this.cropper.toggle(button)
      },
      tooltip: 'Cortar imagem'
    })

    return toolbar
  }

  insertParagraph(where: 'before' | 'after') {
    if (typeof this.getPos !== 'function') return

    const { state, view } = this.editor
    const pos = this.getPos()

    const $pos = state.doc.resolve(pos)

    const paragraphParent = findParentNodeClosestToPos($pos, node => node.type.name === 'paragraph')

    if (!paragraphParent) return

    const insertPos = where === 'before' ? paragraphParent.pos : paragraphParent.pos + paragraphParent.node.nodeSize

    const paragraph = state.schema.nodes.paragraph.createAndFill()
    if (!paragraph) return

    let tr = state.tr.insert(insertPos, paragraph)

    // 🔑 ALWAYS move INSIDE the inserted paragraph
    const cursorPos = tr.mapping.map(insertPos + 1)

    tr = tr.setSelection(TextSelection.create(tr.doc, cursorPos))

    view.dispatch(tr)
    view.focus()
  }
}
