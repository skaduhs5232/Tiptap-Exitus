//@ts-nocheck
import { Plugin } from '@editor/Plugin'
import type ExitusEditor from '@src/ExitusEditor'
import Configuration from '@wiris/mathtype-html-integration-devkit/src/configuration'
import Core from '@wiris/mathtype-html-integration-devkit/src/core.src'
import Image from '@wiris/mathtype-html-integration-devkit/src/image'
import IntegrationModel from '@wiris/mathtype-html-integration-devkit/src/integrationmodel'
import Latex from '@wiris/mathtype-html-integration-devkit/src/latex'
import Listeners from '@wiris/mathtype-html-integration-devkit/src/listeners'
import MathML from '@wiris/mathtype-html-integration-devkit/src/mathml'
import Parser from '@wiris/mathtype-html-integration-devkit/src/parser'
import Util from '@wiris/mathtype-html-integration-devkit/src/util'

import chemIcon from './icons/ckeditor5-chem.svg'
import mathIcon from './icons/ckeditor5-formula.svg'
import { MathType } from './mathtype'
import { ExitusEditorIntegration } from './mathtype-integration'

export class MathTypePlugin extends Plugin {
  private integration: ExitusEditorIntegration | undefined

  static get pluginName() {
    return 'mathtype'
  }

  static get requires() {
    return [MathType]
  }

  constructor(editor: ExitusEditor) {
    super(editor)
    this.createMathTypeIntegration()
  }

  init(): void {
    this.editor.toolbar.setButton('mathtype', {
      icon: mathIcon,
      click: () => {
        this.openEditor()
      },
      tooltip: 'Fórmula matemática - Mathtype'
    })
    this.editor.toolbar.setButton('chemtype', {
      icon: chemIcon,
      click: () => {
        this.openEditor('chemistry')
      },
      tooltip: 'Fórmula química - Chemtype'
    })
  }

  openEditor(editorType: string | null) {
    //return ({ editor }) => {
    try {
      const integration = this.integration
      if (editorType == null) {
        integration.core.getCustomEditors().disable()
      } else {
        integration.core.getCustomEditors().enable(editorType)
      }

      integration.core.editionProperties.dbclick = false
      const image = null
      if (typeof image !== 'undefined' && image !== null && image.classList.contains(WirisPlugin.Configuration.get('imageClassName'))) {
        integration.core.editionProperties.temporalImage = image
        integration.openExistingFormulaEditor()
      } else {
        integration.openNewFormulaEditor()
      }
    } catch (e) {
      console.error(e)
    }
    //}
  }

  createMathTypeIntegration() {
    try {
      if (this.integration !== undefined) return

      this.integration = this.addIntegration({
        editorParameters: {
          fontFamily: 'Arial',
          fontStyle: 'normal',
          fontSize: '14px',
          fonts: [
            {
              id: 'inherit',
              label: 'Arial'
            }
          ],
          language: 'pt_br'
        }
      })
      //getExtensionStorage(editor).currentInstances.set(editor.editorInstance, integration)

      window.WirisPlugin = {
        Core,
        Parser,
        Image,
        MathML,
        Util,
        Configuration,
        Listeners,
        IntegrationModel,
        currentInstance: this.integration,
        Latex
      }
    } catch (e) {
      console.error(e)
    }
  }

  addIntegration(integrationParameters: any) {
    /**
     * Integration model constructor attributes.
     * @type {integrationModelProperties}
     */
    const integrationProperties = {}
    integrationProperties.environment = {}
    integrationProperties.environment.editor = 'ExitusEditor'
    integrationProperties.environment.editorVersion = '1.x'
    integrationProperties.version = '1.0.0'
    integrationProperties.editorObject = this.editor
    integrationProperties.serviceProviderProperties = {}
    integrationProperties.serviceProviderProperties.URI = 'https://www.wiris.net/demo/plugins/app'
    integrationProperties.serviceProviderProperties.server = 'java'
    integrationProperties.target = this.editor.view.dom.parentElement
    integrationProperties.scriptName = 'bundle.js'
    integrationProperties.managesLanguage = true
    integrationProperties.integrationParameters = integrationParameters

    // etc

    // There are platforms like Drupal that initialize CKEditor but they hide or remove the container element.
    // To avoid a wrong behaviour, this integration only starts if the workspace container exists.
    let integration: ExitusEditorIntegration
    if (integrationProperties.target) {
      // Instance of the integration associated to this editor instance
      integration = new ExitusEditorIntegration(integrationProperties)
      integration.init()
      integration.listeners.fire('onTargetReady', {})

      integration.checkElement()

      this.editor.view.dom.addEventListener('click', evt => {
        if (evt.detail === 2) {
          integration.doubleClickHandler(evt.target, evt)
        }
      })
    }

    return integration
  }

  destroy(): void {
    this.integration.destroy()
    this.integration = null
  }
}
