import { Toolbar } from '@editor/toolbar'
import { Button, type ButtonEventProps, Dropdown, type DropDownEventProps } from '@editor/ui'
import { Balloon } from '@editor/ui/Balloon'
import arrowDropDown from '@icons/arrow-drop-down-line.svg'
import textDl from '@icons/image-left.svg'
import textDm from '@icons/image-middle.svg'
import textDr from '@icons/image-right.svg'
import imgSize from '@icons/image-size.svg'
import { type Editor } from '@tiptap/core'
import { type Node as ProseMirrorNode } from '@tiptap/pm/model'
import { type Node } from '@tiptap/pm/model'
import { type NodeView } from '@tiptap/pm/view'
import type ExitusEditor from 'src/ExitusEditor'

import { convertToBase64 } from './image'
import ResizableImage from './ResizableImage'

function imageClickHandler({ imageWrapper, balloon, resizer }: ImageView) {
  imageWrapper.addEventListener('click', event => {
    event.stopPropagation()
    //imageWrapper.classList.add('ex-selected')
    const resizers = resizer.resizers

    if (!balloon.isOpen()) {
      balloon.show()
      resizers.classList.remove('ex-hidden')
    }

    function clickOutside(event: Event) {
      const target = event.target as HTMLElement

      if (!target.matches('.ex-image-wrapper')) {
        balloon.hide()
        imageWrapper.classList.remove('ex-selected')
        resizers.classList.add('ex-hidden')
        window.removeEventListener('click', clickOutside)
      }
    }

    window.addEventListener('click', clickOutside)
  })
}

function alinhaDireita(imageView: ImageView) {
  return ({ button }: ButtonEventProps) => {
    const { imageWrapper } = imageView
    if (!imageWrapper.classList.contains('ex-direita')) {
      button.parentToolbar.tools.forEach(tool => tool instanceof Button && tool.off())
      button.on()
      imageWrapper.classList.add('ex-direita')
      imageWrapper.classList.remove('ex-meio', 'ex-esquerda')
    } else {
      button.off()
      imageWrapper.classList.remove('ex-direita')
    }
    imageView.updateAttributes({
      classes: imageWrapper.className
    })
  }
}

function alinhaEsquerda(imageView: ImageView) {
  return ({ button }: ButtonEventProps) => {
    const { imageWrapper } = imageView
    if (!imageWrapper.classList.contains('ex-esquerda')) {
      button.parentToolbar.tools.forEach(tool => tool instanceof Button && tool.off())
      button.on()
      imageWrapper.classList.add('ex-esquerda')
      imageWrapper.classList.remove('ex-meio', 'ex-direita')
    } else {
      button.off()
      imageWrapper.classList.remove('ex-esquerda')
    }
    imageView.updateAttributes({
      classes: imageWrapper.className
    })
  }
}

function alinhaMeio(imageView: ImageView) {
  return ({ button }: ButtonEventProps) => {
    const { imageWrapper } = imageView
    if (!imageWrapper.classList.contains('ex-meio')) {
      button.parentToolbar.tools.forEach(tool => tool instanceof Button && tool.off())
      button.on()
      imageWrapper.classList.add('ex-meio')
      imageWrapper.classList.remove('ex-esquerda', 'ex-direita')
    } else {
      button.off()
      imageWrapper.classList.remove('ex-meio')
    }
    imageView.updateAttributes({
      classes: imageWrapper.className
    })
  }
}

function originalPx(dropdown: Dropdown, icon: string) {
  const button = new Button(dropdown.editor, {
    icon: icon,
    classList: ['ex-mr-0']
  })

  button.bind('click', () => {
    /* if (!image.classList.contains('')) {
      //dropdown.parentToolbar.tools.forEach(tool => tool instanceof Button && tool.off())
      button.on()
      image.classList.remove('ex-grande', 'ex-pequeno', 'ex-medio')
    } else {
      button.off()
      image.classList.remove('ex-grande', 'ex-pequeno', 'ex-medio')
      dropdown.off()
    } */
  })

  return button.render()
}

function trezentosPx(dropdown: Dropdown, icon: string) {
  const button = new Button(dropdown.editor, {
    icon: icon,
    classList: ['ex-mr-0']
  })

  button.bind('click', () => {
    dropdown.editor.commands.setImageWidth('300px')
  })

  return button.render()
}

function quatrocentosPx(dropdown: Dropdown, icon: string) {
  const button = new Button(dropdown.editor, {
    icon: icon,
    classList: ['ex-mr-0']
  })

  button.bind('click', () => {
    dropdown.editor.commands.setImageWidth('400px')
  })

  return button.render()
}

function setecentosPx(dropdown: Dropdown, icon: string) {
  const button = new Button(dropdown.editor, {
    icon: icon,
    classList: ['ex-mr-0']
  })

  button.bind('click', () => {
    dropdown.editor.commands.setImageWidth('700px')
  })

  return button.render()
}

function criarDropDown(dropdown: Dropdown) {
  const dropdownContent = document.createElement('div')
  dropdownContent.className = '.ex-dropdownList-content'

  const original = originalPx(dropdown, 'Original')
  const pequeno = trezentosPx(dropdown, '300px')
  const medio = quatrocentosPx(dropdown, '400px')
  const grande = setecentosPx(dropdown, '700px')

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

function balloonDropDown() {
  return ({ editor }: any) => {
    const dropdown = new Dropdown(editor, {
      events: {
        open: showDropdown
      },
      classes: ['ex-dropdown-listItem']
    })

    dropdown.setDropDownContent(criarDropDown(dropdown))

    window.addEventListener('click', function (event: Event) {
      const target = event.target as HTMLElement
      if (!target.matches('.dropdown')) {
        dropdown.off()
      }
    })

    return dropdown
  }
}

export class ImageView implements NodeView {
  node: Node
  dom: Element
  image: HTMLImageElement
  imageWrapper: HTMLElement
  balloon: Balloon
  editor: Editor
  getPos: boolean | (() => number)
  resizer: ResizableImage

  constructor(node: Node, editor: Editor, getPos: boolean | (() => number)) {
    this.node = node
    this.editor = editor
    this.getPos = getPos
    this.dom = document.createElement('div')
    this.imageWrapper = this.dom.appendChild(document.createElement('div'))
    this.imageWrapper.className = node.attrs.classes

    this.image = this.imageWrapper.appendChild(document.createElement('img'))

    this.setImageAttributes(this.image, node)

    const imageUrlRegex = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif|bmp|webp|svg))/i

    if (imageUrlRegex.test(node.attrs.src)) {
      this.urlToBase64()
    }

    // Adiciona redimensionamento de imagens
    this.resizer = new ResizableImage(this)

    const configStorage = {
      alinhaDireita: {
        toolbarButtonConfig: {
          icon: textDr,
          title: 'direita',
          events: {
            click: alinhaDireita(this)
          }
        }
      },
      alinhaMeio: {
        toolbarButtonConfig: {
          icon: textDm,
          title: 'meio',
          events: {
            click: alinhaMeio(this)
          }
        }
      },
      alinhaEsquerda: {
        toolbarButtonConfig: {
          icon: textDl,
          title: 'esquerda',
          events: {
            click: alinhaEsquerda(this)
          }
        }
      },
      tamanhoImg: {
        toolbarButtonConfig: {
          icon: imgSize + arrowDropDown,
          title: 'Aumenta e diminui',
          dropdown: balloonDropDown()
        }
      }
    }

    const toolbar = new Toolbar(editor as ExitusEditor, {
      toolbarOrder: ['alinhaEsquerda', 'alinhaMeio', 'alinhaDireita', 'tamanhoImg'],
      configStorage
    })

    this.balloon = new Balloon(editor, {
      position: 'top'
    })
    this.balloon.ballonPanel.appendChild(toolbar.createToolbar())

    this.imageWrapper.appendChild(this.balloon.getBalloon())

    imageClickHandler(this)
  }

  update(newNode: ProseMirrorNode) {
    if (newNode.type !== this.node.type) {
      return false
    }

    this.node = newNode
    this.setImageAttributes(this.image, this.node)

    return true
  }

  urlToBase64() {
    const self = this
    this.image.setAttribute('crossorigin', 'anonymous')
    this.image.onload = convertToBase64(this.image, (base64Url: string) => {
      self.updateAttributes({ src: base64Url })
    })
  }

  selectNode() {
    this.imageWrapper.classList.add('ex-selected')
  }

  deselectNode() {
    this.imageWrapper.classList.remove('ex-selected')
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
    ;(this.imageWrapper as HTMLElement).setAttribute('style', node.attrs.style)
    image.setAttribute('src', node.attrs.src)
  }
}
