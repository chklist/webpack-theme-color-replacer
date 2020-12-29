'use strict'
const { Compilation } = require('webpack')
const Handler = require('./Handler')

const pluginName = 'ThemeColorReplacer'

class ThemeColorReplacer {
  constructor(options) {
    this.handler = new Handler(options)
  }

  apply(compiler) {
    // compiler.hooks.emit.tapAsync(pluginName, (compilation, callback) => {
    //   this.handler.handle(compilation)
    //   callback()
    // })
    compiler.hooks.compilation.tap(pluginName, (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: pluginName,
          stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS, // see below for more stages
        },
        (assets) => {
          this.handler.handle(assets)
        }
      )
    })
  }
}

ThemeColorReplacer.varyColor = require('../client/varyColor')

module.exports = ThemeColorReplacer
