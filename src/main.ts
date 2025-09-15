import './public/style.css'

import ExitusEditor from './ExitusEditor'
import { BlockquotePlugin } from './extensions/blockquote/BlockquotePlugin'
import { BoldPlugin } from './extensions/bold/BoldPlugin'
import BubbleMenuPlugin from './extensions/bubble-menu/BubbleMenuPlugin'
import { ColarQuestaoPlugin } from './extensions/colar-questao/ColarQuestaoPlugin'
import { DefaultPlugin } from './extensions/default-plugin/DefaultPlugin'
import { FormatClear } from './extensions/format-clear/FormatClearPlugin'
import { HistoryPlugin } from './extensions/history/HistoryPlugin'
import { ImagePlugin } from './extensions/image/ImagePlugin'
import { IndentPlugin } from './extensions/indent/IndentPlugin'
import { ItalicPlugin } from './extensions/italic/ItalicPlugin'
import { KatexPlugin } from './extensions/katex/KatexPlugin'
import { ListItemPlugin } from './extensions/listitem/ListItemPlugin'
import { StrikePlugin } from './extensions/strike/StrikePlugin'
import { SubscriptPlugin } from './extensions/subscript/SubscriptPlugin'
import { SuperscriptPlugin } from './extensions/superscript/SuperscriptPlugin'
import { TabPlugin } from './extensions/tab/TabPlugin'
import { TablePlugin } from './extensions/table/TablePlugin'
import { TextAlignPlugin } from './extensions/textAlign/TextAlingPlugin'
import { UnderlinePlugin } from './extensions/underline/UnderlinePlugin'

ExitusEditor.plugins = [
  DefaultPlugin,
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  KatexPlugin,
  StrikePlugin,
  SubscriptPlugin,
  SuperscriptPlugin,
  TablePlugin,
  TextAlignPlugin,
  ImagePlugin,
  BlockquotePlugin,
  HistoryPlugin,
  ListItemPlugin,
  TabPlugin,
  IndentPlugin,
  ColarQuestaoPlugin,
  FormatClear
]

// Adiciona o Bubble Menu (por instância) – mantém as extensões existentes
ExitusEditor.plugins.push(BubbleMenuPlugin)

ExitusEditor.toolbarOrder = [
  'bold',
  'italic',
  'underline',
  'strike',
  'subscript',
  'superscript',
  'formatClear',
  '|',
  'table',
  'textAlign',
  'image',
  'blockquote',
  'goback',
  'goforward',
  'listItem',
  'rmRecuo',
  'addRecuo',
  '|',
  'katex'
]

// Remove a toolbar fixa. Mantemos a ordem somente para reutilizar ferramentas na criação do bubble.
//ExitusEditor.toolbarOrder = []

export default ExitusEditor
