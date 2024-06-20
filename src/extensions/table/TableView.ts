/* eslint-disable @typescript-eslint/no-unused-vars */
import { Toolbar } from '@editor/toolbar'
import { Balloon, BalloonPosition } from '@editor/ui/Balloon'
import arrowDropDown from '@icons/arrow-drop-down-line.svg'
import tableCell from '@icons/merge-tableCells.svg'
import starredCell from '@icons/starred-cell.svg'
import starredTable from '@icons/starred-table.svg'
import tableColumns from '@icons/table-columns.svg'
import tableRow from '@icons/table-lines.svg'
import { type Editor } from '@tiptap/core'
import { type Node as ProseMirrorNode } from '@tiptap/pm/model'
import { type NodeView } from '@tiptap/pm/view'
import type ExitusEditor from 'src/ExitusEditor'

import { criaTabelaModal } from './itensModalTable'
import { objParaCss } from './table'
import { TableCellBalloon } from './TableCellBalloon'
import TableFocus, { UpDownTable } from './tableFocus'
import { criaDropCell, criaDropColuna, criaDropLinhas } from './tableToolbarItens'

function clickHandler(tableView: TableView) {
  tableView.table.addEventListener('click', () => {
    if (!tableView.balloon.isOpen()) {
      tableView.balloon.show()
    }

    function clickOutside(event: Event) {
      const target = event.target as HTMLElement

      if (target.closest('.pcr-app') !== null) {
        console.log(target.closest('.pcr-app'))
        return
      }

      if (target.closest('.tableWrapper') == null) {
        tableView.balloon.hide()
        tableView.tableWrapper.classList.remove('ex-selected')
        window.removeEventListener('click', clickOutside)
      }
    }

    window.addEventListener('click', clickOutside)
  })
}

function clickCellHandler(tableView: TableView) {
  function clickOutside(event: Event) {
    const target = event.target as HTMLElement

    if (target.closest('.pcr-app') !== null) {
      return
    }

    if (target.closest('.balloon-menu') == null) {
      tableView.tableCellBalloon.off()
      window.removeEventListener('click', clickOutside)
    }
  }

  window.addEventListener('click', clickOutside)
}

function showCellBalloon(tableView: TableView) {
  return () => {
    tableView.tableCellBalloon.updatePosition()
    tableView.balloon.hide()
    clickCellHandler(tableView)
  }
}

function getContentWidth(element: HTMLElement) {
  const widthWithPaddings = element.clientWidth
  const elementComputedStyle = window.getComputedStyle(element, null)
  return widthWithPaddings - parseFloat(elementComputedStyle.paddingLeft) - parseFloat(elementComputedStyle.paddingRight)
}

export function updateColumns(
  node: ProseMirrorNode,
  editor: Editor,
  colgroup: Element,
  tableView: TableView,
  cellMinWidth: number,
  overrideCol?: number,
  overrideValue?: any
) {
  let totalWidth = 0
  let fixedWidth = true
  let nextDOM = colgroup.firstChild
  const row = node.firstChild
  //console.log(row!.childCount)

  //tableView.table.style.width = `100%`
  //tableView.table.style.minWidth = `unset`

  const totalEditorWidth = getContentWidth(editor.view.dom)
  const colMaxWidth = totalEditorWidth / row!.childCount
  const colMinWidth = cellMinWidth
  const nCols = row!.childCount
  for (let i = 0, col = 0; i < row!.childCount; i += 1) {
    const { colspan, colwidth } = row!.child(i).attrs

    for (let j = 0; j < colspan; j += 1, col += 1) {
      const hasWidth = overrideCol === col ? overrideValue : colwidth && colwidth[j]
      let cssWidth = `${hasWidth}px`

      if (!hasWidth || hasWidth < colMinWidth) {
        cssWidth = `${colMinWidth}px`
        totalWidth += colMinWidth
      } else if (hasWidth && hasWidth > totalEditorWidth) {
        cssWidth = `${totalEditorWidth - totalWidth}px`
        totalWidth += totalEditorWidth - totalWidth
      } else {
        totalWidth += hasWidth
      }

      if (!hasWidth) {
        fixedWidth = false
      }

      if (!nextDOM) {
        colgroup.appendChild(document.createElement('col')).style.width = cssWidth
      } else {
        if ((nextDOM as HTMLElement).style.width !== cssWidth) {
          ;(nextDOM as HTMLElement).style.width = cssWidth
        }

        nextDOM = nextDOM.nextSibling
      }
    }
  }

  while (nextDOM) {
    const after = nextDOM.nextSibling

    nextDOM!.parentNode!.removeChild(nextDOM)
    nextDOM = after
  }
  console.log(totalWidth)

  /* if (hasWidth > totalEditorWidth) {
    console.log(hasWidth, totalEditorWidth)

    cssWidth = '100%'
  } else if (!hasWidth || hasWidth < 50) {
  } else if (!hasWidth || hasWidth < 50) {
    cssWidth = `${(50 * 100) / totalWidth}%`
  } else {
    cssWidth = `${(hasWidth * 100) / totalWidth}%`
  }

  const widthPercent = (totalWidth * 100) / totalEditorWidth
  tableView.tableWrapper.style.width = `${widthPercent > 100 ? 100 : widthPercent}%` */

  //if (fixedWidth) {
  console.log(totalWidth, totalEditorWidth)
  tableView.table.style.width = `${totalWidth > totalEditorWidth ? totalEditorWidth : totalWidth}px`
  tableView.table.style.minWidth = `${nCols * colMinWidth}px`
  tableView.tableWrapper.style.width = `${totalWidth > totalEditorWidth ? totalEditorWidth : totalWidth}px`
  //} else {
  //tableView.table.style.width = ''
  //tableView.table.style.minWidth = `${totalWidth}px`
}

export class TableView implements NodeView {
  node: ProseMirrorNode
  dom: Element
  table: HTMLElement
  colgroup: Element
  balloon: Balloon
  tableCellBalloon: TableCellBalloon
  editor: Editor
  cellMinWidth: number
  tableWrapper: HTMLElement
  contentDOM: HTMLElement
  getPos: boolean | (() => number)
  tableStyle: { [key: string]: string }
  tableWrapperStyle: { [key: string]: string }

  constructor(node: ProseMirrorNode, editor: Editor, getPos: boolean | (() => number)) {
    this.node = node
    this.editor = editor
    this.getPos = getPos
    this.cellMinWidth = 50
    this.dom = document.createElement('div')
    this.tableWrapper = document.createElement('div')
    this.dom = this.tableWrapper
    this.tableWrapper.classList.add('tableWrapper', 'tiptap-widget')
    this.table = this.tableWrapper.appendChild(document.createElement('table'))
    this.colgroup = this.table.appendChild(document.createElement('colgroup'))

    this.tableStyle = node.attrs.style
    this.tableWrapperStyle = node.attrs.styleTableWrapper

    updateTableStyle(this)

    updateColumns(node, this.editor, this.colgroup, this, this.cellMinWidth)
    this.contentDOM = this.table.appendChild(document.createElement('tbody'))

    new TableFocus(this, this.editor)
    new UpDownTable(this, this.editor)
    this.tableCellBalloon = new TableCellBalloon(editor)

    const configStorage = {
      celumnsTable: {
        toolbarButtonConfig: {
          icon: tableColumns + arrowDropDown,
          dropdown: criaDropColuna(),
          tooltip: 'Colunas'
        }
      },
      RowTable: {
        toolbarButtonConfig: {
          icon: tableRow + arrowDropDown,
          dropdown: criaDropLinhas(),
          tooltip: 'Linhas'
        }
      },
      cellTable: {
        toolbarButtonConfig: {
          icon: tableCell + arrowDropDown,
          dropdown: criaDropCell(),
          tooltip: 'Mesclar Células'
        }
      },
      tableStarred: {
        toolbarButtonConfig: {
          icon: starredTable + arrowDropDown,
          title: 'editar tabela',
          dropdown: criaTabelaModal(node.attrs.style),
          tooltip: 'Propriedades da Tabela'
        }
      },
      cellStarred: {
        toolbarButtonConfig: {
          icon: starredCell,
          click: showCellBalloon(this),
          tooltip: 'Propriedades da Célula'
        }
      }
    }

    const toolbar = new Toolbar(editor as ExitusEditor, {
      toolbarOrder: ['celumnsTable', 'RowTable', 'cellTable', 'tableStarred', 'cellStarred'],
      configStorage
    })

    this.balloon = new Balloon(editor, {
      position: BalloonPosition.TOP
    })

    this.balloon.ballonPanel.appendChild(toolbar.createToolbar())

    this.tableWrapper.appendChild(this.balloon.getBalloon())

    //this.dom.appendChild(this.tableWrapper)

    clickHandler(this)
  }

  selectNode() {
    this.tableWrapper.classList.add('ex-selected')
  }

  updateAttributes(attributes: Record<string, any>) {
    if (typeof this.getPos === 'function') {
      const { view } = this.editor
      const { state, dispatch } = view

      if (view.dom.contains(document.activeElement)) {
        const tr = state.tr.setNodeMarkup(this.getPos(), undefined, {
          ...this.node.attrs,
          ...attributes
        })
        dispatch(tr)
      }
    }
  }

  destroy() {
    this.balloon.destroy()
    this.tableCellBalloon.destroy()
  }

  update(node: ProseMirrorNode) {
    if (node.type !== this.node.type) {
      return false
    }

    this.node = node

    this.tableStyle = node.attrs.style
    this.tableWrapperStyle = node.attrs.styleTableWrapper
    updateTableStyle(this)

    updateColumns(node, this.editor, this.colgroup, this, this.cellMinWidth)

    return true
  }

  stopEvent(event: Event) {
    if (event instanceof KeyboardEvent) {
      return true
    }
    return false
  }

  ignoreMutation(mutation: MutationRecord | { type: 'selection'; target: Element }) {
    if (mutation.type === 'attributes' && this.balloon.ballonMenu.contains(mutation.target)) {
      return true
    }
    //@ts-ignore
    if (mutation.type === 'attributes' && mutation.target.classList.contains('ex-dropdown')) {
      return true
    }

    if (mutation.type === 'selection' && mutation.target.closest('.baloon-menu')) {
      return true
    }

    return (
      mutation.type === 'attributes' &&
      (mutation.target === this.tableWrapper || mutation.target === this.table || this.colgroup.contains(mutation.target))
    )
  }
}
function updateTableStyle(tableView: TableView) {
  const { table, tableWrapperStyle, tableWrapper, tableStyle } = tableView
  //table.setAttribute('style', objParaCss({ ...tableStyle, width: '100%' }))
  tableWrapper.setAttribute('style', objParaCss(tableWrapperStyle))
}
