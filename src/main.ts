import './public/style.css'

import ExitusEditor from './ExitusEditor'
import { BlockquotePlugin } from './extensions/blockquote/BlockquotePlugin'
import { BoldPlugin } from './extensions/bold/BoldPlugin'
import { ColarQuestaoPlugin } from './extensions/colar-questao/ColarQuestaoPlugin'
import { DefaultPlugin } from './extensions/default-plugin/DefaultPlugin'
import { FormatClear } from './extensions/format-clear/FormatClearPlugin'
import { HistoryPlugin } from './extensions/history/HistoryPlugin'
import { ImagePlugin } from './extensions/image/ImagePlugin'
import { IndentPlugin } from './extensions/indent/IndentPlugin'
import { ItalicPlugin } from './extensions/italic/ItalicPlugin'
import { KatexPlugin } from './extensions/katex/KatexPlugin'
import { ListItemPlugin } from './extensions/listitem/ListItemPlugin'
import { MathTypePlugin } from './extensions/mathtype/MathTypePlugin'
import { SpecialCharactersPlugin } from './extensions/special-characters/SpecialCharactersPlugin'
import { SpellCheckerPlugin } from './extensions/spell-checker/SpellCheckerPlugin'
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
  MathTypePlugin,
  ImagePlugin,
  BlockquotePlugin,
  HistoryPlugin,
  ListItemPlugin,
  TabPlugin,
  IndentPlugin,
  ColarQuestaoPlugin,
  FormatClear,
  SpecialCharactersPlugin,
  SpellCheckerPlugin
]

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
  'katex',
  'specialCharacters',
  'mathtype',
  'chemtype'
]

export default ExitusEditor
