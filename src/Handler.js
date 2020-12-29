'use strict'
const crypto = require('crypto')
const AssetsExtractor = require('./AssetsExtractor')
const { RawSource, ConcatSource } = require('webpack-sources')
const LineReg = /\n/g
const REGEXP_CONTENTHASH = /\[contenthash(?::(\d+))?\]/i

module.exports = class Handler {
  constructor(options) {
    // Default options
    this.options = Object.assign(
      {
        fileName: 'css/theme-colors-[contenthash:8].css',
        matchColors: [],
        isJsUgly: !(process.env.NODE_ENV === 'development' || process.argv.find((arg) => arg.match(/\bdev/))),
      },
      options
    )
    this.assetsExtractor = new AssetsExtractor(this.options)
  }

  handle(assets) {
    var output = this.assetsExtractor.extractAssets(assets)
    if ((output.length === 0)) return
    console.log('Extracted theme color css content length: ' + output.length)

    //Add to assets for output
    var outputName = this.getFileName(this.options.fileName, output)
    assets[outputName] = new RawSource(output)

    // 记录动态的文件名，到每个入口
    this.addToEntryJs(outputName, assets, output)
  }

  getFileName(fileName, src) {
    const regExp = new RegExp(REGEXP_CONTENTHASH)
    if (regExp.test(fileName)) {
      const len = RegExp.$1
      const contentHash = crypto.createHash('md4').update(src).digest('hex')
      if (len) {
        fileName = fileName.replace(REGEXP_CONTENTHASH, contentHash.slice(0, len))
      } else {
        fileName = fileName.replace(REGEXP_CONTENTHASH, contentHash)
      }
    }
    return fileName
  }

  // 自动注入js代码，设置css文件名
  addToEntryJs(outputName, assets, cssCode) {
    for (const assetName of Object.keys(assets)) {
      if (assetName.slice(-3) === '.js' && assetName.indexOf('manifest.') === -1) {
        var assetSource = assets[assetName]
        if (assetSource && !assetSource._isThemeJsInjected) {
          var cSrc = this.getEntryJs(outputName, assetSource, cssCode)
          cSrc._isThemeJsInjected = true
          assets[assetName] = cSrc
          break
        }
      }
    }
  }

  getEntryJs(outputName, assetSource, cssCode) {
    var config = { url: outputName, colors: this.options.matchColors }
    var configJs = `\nwindow.__theme_COLOR_cfg=${JSON.stringify(config)};\n`
    if (this.options.injectCss) {
      configJs = configJs + 'window.__theme_COLOR_css=' + JSON.stringify(cssCode.replace(LineReg, '')) + ';\n'
    }
    return new ConcatSource(assetSource, configJs)
  }
}
