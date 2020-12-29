'use strict';
var crypto = require('crypto')
var AssetsExtractor = require('./AssetsExtractor')
var { ConcatSource } = require('webpack-sources');
var LineReg = /\n/g

module.exports = class Handler {
    constructor(options) {
        // Default options
        this.options = Object.assign({
            fileName: 'css/theme-colors-[contenthash:8].css',
            matchColors: [],
            isJsUgly: !(process.env.NODE_ENV === 'development' || process.argv.find(arg => arg.match(/\bdev/))),
        }, options);
        this.assetsExtractor = new AssetsExtractor(this.options)
    }

    handle(compilation) {
        var output = this.assetsExtractor.extractAssets(compilation.assets);
        console.log('Extracted theme color css content length: ' + output.length);

        //Add to assets for output
        var outputName = getFileName(this.options.fileName, output)
        compilation.assets[outputName] = {
            source: () => output,
            size: () => output.length
        };

        // 记录动态的文件名，到每个入口
        this.addToEntryJs(outputName, compilation, output)

        // function getFileName(fileName, src) {
        //     var contentHash = crypto.createHash('md4')
        //         .update(src)
        //         .digest('hex')
        //     return compilation.getPath(fileName, { contentHash })
        // }

        function getFileName(fileName, src) {
            var contentHash = crypto.createHash('md4').update(src).digest('hex')
            var p1 = fileName.indexOf('contenthash:')
            if (p1 > -1) {
                p1 += 12
                var p2 = fileName.indexOf(']', p1)
                if (p2 > p1) {
                    var len = fileName.substr(p1, p2 - p1)
                    fileName = fileName.replace('[contenthash:' + len + ']', contentHash.slice(0, len))
                }
            }
            return fileName;
        }
    }

// 自动注入js代码，设置css文件名
    addToEntryJs(outputName, compilation, cssCode) {
        var onlyEntrypoints = {
            entrypoints: true,
            errorDetails: false,
            modules: false,
            assets: false,
            children: false,
            chunks: false,
            chunkGroups: false
        }
        var entrypoints = compilation.getStats().toJson(onlyEntrypoints).entrypoints;
        Object.keys(entrypoints).forEach(entryName => {
            var entryAssets = entrypoints[entryName].assets
            for (var i = 0, l = entryAssets.length; i < l; i++) {
                var assetName = entryAssets[i].name
                if (assetName.slice(-3) === '.js' && assetName.indexOf('manifest.') === -1) { //
                    var assetSource = compilation.assets[assetName]
                    if (assetSource && !assetSource._isThemeJsInjected) {
                        var cSrc = this.getEntryJs(outputName, assetSource, cssCode)
                        cSrc._isThemeJsInjected = true
                        compilation.assets[assetName] = cSrc
                        break;
                    }
                }
            }
        })
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


