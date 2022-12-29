/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { global, _commonjsGlobal } from "./env.js";
import { Utilities } from "./utils.js";
/**
 * Load `scriptSrc` only once (avoid multiple <script> tags)
 */
class OnlyOnceScriptLoader {
    _env;
    _scriptLoader;
    _callbackMap;
    constructor(env) {
        this._env = env;
        this._scriptLoader = null;
        this._callbackMap = {};
    }
    load(moduleManager, scriptSrc, callback, errorback) {
        if (!this._scriptLoader) {
            if (this._env.isWebWorker) {
                this._scriptLoader = new WorkerScriptLoader();
            }
            else if (this._env.isElectronRenderer) {
                const { preferScriptTags } = moduleManager.getConfig().getOptionsLiteral();
                if (preferScriptTags) {
                    this._scriptLoader = new BrowserScriptLoader();
                }
                else {
                    this._scriptLoader = new NodeScriptLoader(this._env);
                }
            }
            else if (this._env.isNode) {
                this._scriptLoader = new NodeScriptLoader(this._env);
            }
            else {
                this._scriptLoader = new BrowserScriptLoader();
            }
        }
        let scriptCallbacks = {
            callback: callback,
            errorback: errorback
        };
        if (this._callbackMap.hasOwnProperty(scriptSrc)) {
            this._callbackMap[scriptSrc].push(scriptCallbacks);
            return;
        }
        this._callbackMap[scriptSrc] = [scriptCallbacks];
        this._scriptLoader.load(moduleManager, scriptSrc, () => this.triggerCallback(scriptSrc), (err) => this.triggerErrorback(scriptSrc, err));
    }
    triggerCallback(scriptSrc) {
        let scriptCallbacks = this._callbackMap[scriptSrc];
        delete this._callbackMap[scriptSrc];
        for (let i = 0; i < scriptCallbacks.length; i++) {
            scriptCallbacks[i].callback();
        }
    }
    triggerErrorback(scriptSrc, err) {
        let scriptCallbacks = this._callbackMap[scriptSrc];
        delete this._callbackMap[scriptSrc];
        for (let i = 0; i < scriptCallbacks.length; i++) {
            scriptCallbacks[i].errorback(err);
        }
    }
}
class BrowserScriptLoader {
    /**
     * Attach load / error listeners to a script element and remove them when either one has fired.
     * Implemented for browsers supporting HTML5 standard 'load' and 'error' events.
     */
    attachListeners(script, callback, errorback) {
        let unbind = () => {
            script.removeEventListener('load', loadEventListener);
            script.removeEventListener('error', errorEventListener);
        };
        let loadEventListener = (e) => {
            unbind();
            callback();
        };
        let errorEventListener = (e) => {
            unbind();
            errorback(e);
        };
        script.addEventListener('load', loadEventListener);
        script.addEventListener('error', errorEventListener);
    }
    load(moduleManager, scriptSrc, callback, errorback) {
        if (/^node\|/.test(scriptSrc)) {
            let opts = moduleManager.getConfig().getOptionsLiteral();
            let nodeRequire = ensureRecordedNodeRequire(moduleManager.getRecorder(), (opts.nodeRequire || global.nodeRequire));
            let pieces = scriptSrc.split('|');
            let moduleExports = null;
            try {
                moduleExports = nodeRequire(pieces[1]);
            }
            catch (err) {
                errorback(err);
                return;
            }
            moduleManager.enqueueDefineAnonymousModule([], () => moduleExports);
            callback();
        }
        else {
            let script = document.createElement('script');
            script.setAttribute('async', 'async');
            script.setAttribute('type', 'text/javascript');
            this.attachListeners(script, callback, errorback);
            const { trustedTypesPolicy } = moduleManager.getConfig().getOptionsLiteral();
            if (trustedTypesPolicy) {
                scriptSrc = trustedTypesPolicy.createScriptURL(scriptSrc);
            }
            script.setAttribute('src', scriptSrc);
            // Propagate CSP nonce to dynamically created script tag.
            const { cspNonce } = moduleManager.getConfig().getOptionsLiteral();
            if (cspNonce) {
                script.setAttribute('nonce', cspNonce);
            }
            document.getElementsByTagName('head')[0].appendChild(script);
        }
    }
}
function canUseEval(moduleManager) {
    const { trustedTypesPolicy } = moduleManager.getConfig().getOptionsLiteral();
    try {
        const func = (trustedTypesPolicy
            ? self.eval(trustedTypesPolicy.createScript('', 'true'))
            : new Function('true'));
        func.call(self);
        return true;
    }
    catch (err) {
        return false;
    }
}
class WorkerScriptLoader {
    _cachedCanUseEval = null;
    _canUseEval(moduleManager) {
        if (this._cachedCanUseEval === null) {
            this._cachedCanUseEval = canUseEval(moduleManager);
        }
        return this._cachedCanUseEval;
    }
    load(moduleManager, scriptSrc, callback, errorback) {
        if (/^node\|/.test(scriptSrc)) {
            const opts = moduleManager.getConfig().getOptionsLiteral();
            const nodeRequire = ensureRecordedNodeRequire(moduleManager.getRecorder(), (opts.nodeRequire || global.nodeRequire));
            const pieces = scriptSrc.split('|');
            let moduleExports = null;
            try {
                moduleExports = nodeRequire(pieces[1]);
            }
            catch (err) {
                errorback(err);
                return;
            }
            moduleManager.enqueueDefineAnonymousModule([], function () { return moduleExports; });
            callback();
        }
        else {
            const { trustedTypesPolicy } = moduleManager.getConfig().getOptionsLiteral();
            const isCrossOrigin = (/^((http:)|(https:)|(file:))/.test(scriptSrc) && scriptSrc.substring(0, self.origin.length) !== self.origin);
            if (!isCrossOrigin && this._canUseEval(moduleManager)) {
                // use `fetch` if possible because `importScripts`
                // is synchronous and can lead to deadlocks on Safari
                fetch(scriptSrc).then((response) => {
                    if (response.status !== 200) {
                        throw new Error(response.statusText);
                    }
                    return response.text();
                }).then((text) => {
                    text = `${text}\n//# sourceURL=${scriptSrc}`;
                    const func = (trustedTypesPolicy
                        ? self.eval(trustedTypesPolicy.createScript('', text))
                        : new Function(text));
                    func.call(self);
                    callback();
                }).then(undefined, errorback);
                return;
            }
            try {
                if (trustedTypesPolicy) {
                    scriptSrc = trustedTypesPolicy.createScriptURL(scriptSrc);
                }
                importScripts(scriptSrc);
                callback();
            }
            catch (e) {
                errorback(e);
            }
        }
    }
}
class NodeScriptLoader {
    static _BOM = 0xFEFF;
    static _PREFIX = '(function (require, define, __filename, __dirname) { ';
    static _SUFFIX = '\n});';
    _env;
    _didPatchNodeRequire;
    _didInitialize;
    _fs;
    _vm;
    _path;
    _crypto;
    constructor(env) {
        this._env = env;
        this._didInitialize = false;
        this._didPatchNodeRequire = false;
    }
    _init(nodeRequire) {
        if (this._didInitialize) {
            return;
        }
        this._didInitialize = true;
        // capture node modules
        this._fs = nodeRequire('fs');
        this._vm = nodeRequire('vm');
        this._path = nodeRequire('path');
        this._crypto = nodeRequire('crypto');
    }
    // patch require-function of nodejs such that we can manually create a script
    // from cached data. this is done by overriding the `Module._compile` function
    _initNodeRequire(nodeRequire, moduleManager) {
        // It is important to check for `nodeCachedData` first and then set `_didPatchNodeRequire`.
        // That's because `nodeCachedData` is set _after_ calling this for the first time...
        const { nodeCachedData } = moduleManager.getConfig().getOptionsLiteral();
        if (!nodeCachedData) {
            return;
        }
        if (this._didPatchNodeRequire) {
            return;
        }
        this._didPatchNodeRequire = true;
        const that = this;
        const Module = nodeRequire('module');
        function makeRequireFunction(mod) {
            const Module = mod.constructor;
            let require = function require(path) {
                try {
                    return mod.require(path);
                }
                finally {
                    // nothing
                }
            };
            require.resolve = function resolve(request, options) {
                return Module._resolveFilename(request, mod, false, options);
            };
            require.resolve.paths = function paths(request) {
                return Module._resolveLookupPaths(request, mod);
            };
            require.main = process.mainModule;
            require.extensions = Module._extensions;
            require.cache = Module._cache;
            return require;
        }
        Module.prototype._compile = function (content, filename) {
            // remove shebang and create wrapper function
            const scriptSource = Module.wrap(content.replace(/^#!.*/, ''));
            // create script
            const recorder = moduleManager.getRecorder();
            const cachedDataPath = that._getCachedDataPath(nodeCachedData, filename);
            const options = { filename };
            let hashData;
            try {
                const data = that._fs.readFileSync(cachedDataPath);
                hashData = data.slice(0, 16);
                options.cachedData = data.slice(16);
                recorder.record(60 /* LoaderEventType.CachedDataFound */, cachedDataPath);
            }
            catch (_e) {
                recorder.record(61 /* LoaderEventType.CachedDataMissed */, cachedDataPath);
            }
            const script = new that._vm.Script(scriptSource, options);
            const compileWrapper = script.runInThisContext(options);
            // run script
            const dirname = that._path.dirname(filename);
            const require = makeRequireFunction(this);
            const args = [this.exports, require, this, filename, dirname, process, _commonjsGlobal, Buffer];
            const result = compileWrapper.apply(this.exports, args);
            // cached data aftermath
            that._handleCachedData(script, scriptSource, cachedDataPath, !options.cachedData, moduleManager);
            that._verifyCachedData(script, scriptSource, cachedDataPath, hashData, moduleManager);
            return result;
        };
    }
    load(moduleManager, scriptSrc, callback, errorback) {
        const opts = moduleManager.getConfig().getOptionsLiteral();
        const nodeRequire = ensureRecordedNodeRequire(moduleManager.getRecorder(), (opts.nodeRequire || global.nodeRequire));
        const nodeInstrumenter = (opts.nodeInstrumenter || function (c) { return c; });
        this._init(nodeRequire);
        this._initNodeRequire(nodeRequire, moduleManager);
        let recorder = moduleManager.getRecorder();
        if (/^node\|/.test(scriptSrc)) {
            let pieces = scriptSrc.split('|');
            let moduleExports = null;
            try {
                moduleExports = nodeRequire(pieces[1]);
            }
            catch (err) {
                errorback(err);
                return;
            }
            moduleManager.enqueueDefineAnonymousModule([], () => moduleExports);
            callback();
        }
        else {
            scriptSrc = Utilities.fileUriToFilePath(this._env.isWindows, scriptSrc);
            const normalizedScriptSrc = this._path.normalize(scriptSrc);
            const vmScriptPathOrUri = this._getElectronRendererScriptPathOrUri(normalizedScriptSrc);
            const wantsCachedData = Boolean(opts.nodeCachedData);
            const cachedDataPath = wantsCachedData ? this._getCachedDataPath(opts.nodeCachedData, scriptSrc) : undefined;
            this._readSourceAndCachedData(normalizedScriptSrc, cachedDataPath, recorder, (err, data, cachedData, hashData) => {
                if (err) {
                    errorback(err);
                    return;
                }
                let scriptSource;
                if (data?.charCodeAt(0) === NodeScriptLoader._BOM) {
                    scriptSource = NodeScriptLoader._PREFIX + data?.substring(1) + NodeScriptLoader._SUFFIX;
                }
                else {
                    scriptSource = NodeScriptLoader._PREFIX + data + NodeScriptLoader._SUFFIX;
                }
                scriptSource = nodeInstrumenter(scriptSource, normalizedScriptSrc);
                const scriptOpts = { filename: vmScriptPathOrUri, cachedData };
                const script = this._createAndEvalScript(moduleManager, scriptSource, scriptOpts, callback, errorback);
                this._handleCachedData(script, scriptSource, cachedDataPath, wantsCachedData && !cachedData, moduleManager);
                this._verifyCachedData(script, scriptSource, cachedDataPath, hashData, moduleManager);
            });
        }
    }
    _createAndEvalScript(moduleManager, contents, options, callback, errorback) {
        const recorder = moduleManager.getRecorder();
        recorder.record(31 /* LoaderEventType.NodeBeginEvaluatingScript */, options.filename);
        const script = new this._vm.Script(contents, options);
        const ret = script.runInThisContext(options);
        const globalDefineFunc = moduleManager.getGlobalAMDDefineFunc();
        let receivedDefineCall = false;
        const localDefineFunc = function () {
            receivedDefineCall = true;
            return globalDefineFunc.apply(null, arguments);
        };
        localDefineFunc.amd = globalDefineFunc.amd;
        ret.call(global, moduleManager.getGlobalAMDRequireFunc(), localDefineFunc, options.filename, this._path.dirname(options.filename));
        recorder.record(32 /* LoaderEventType.NodeEndEvaluatingScript */, options.filename);
        if (receivedDefineCall) {
            callback();
        }
        else {
            errorback(new Error(`Didn't receive define call in ${options.filename}!`));
        }
        return script;
    }
    _getElectronRendererScriptPathOrUri(path) {
        if (!this._env.isElectronRenderer) {
            return path;
        }
        let driveLetterMatch = path.match(/^([a-z])\:(.*)/i);
        if (driveLetterMatch) {
            // windows
            return `file:///${(driveLetterMatch[1].toUpperCase() + ':' + driveLetterMatch[2]).replace(/\\/g, '/')}`;
        }
        else {
            // nix
            return `file://${path}`;
        }
    }
    _getCachedDataPath(config, filename) {
        const hash = this._crypto.createHash('md5').update(filename, 'utf8').update(config.seed, 'utf8').update(process.arch, '').digest('hex');
        const basename = this._path.basename(filename).replace(/\.js$/, '');
        return this._path.join(config.path, `${basename}-${hash}.code`);
    }
    _handleCachedData(script, scriptSource, cachedDataPath, createCachedData, moduleManager) {
        if (script.cachedDataRejected) {
            // cached data got rejected -> delete and re-create
            this._fs.unlink(cachedDataPath, err => {
                moduleManager.getRecorder().record(62 /* LoaderEventType.CachedDataRejected */, cachedDataPath);
                this._createAndWriteCachedData(script, scriptSource, cachedDataPath, moduleManager);
                if (err) {
                    moduleManager.getConfig().onError(err);
                }
            });
        }
        else if (createCachedData) {
            // no cached data, but wanted
            this._createAndWriteCachedData(script, scriptSource, cachedDataPath, moduleManager);
        }
    }
    // Cached data format: | SOURCE_HASH | V8_CACHED_DATA |
    // -SOURCE_HASH is the md5 hash of the JS source (always 16 bytes)
    // -V8_CACHED_DATA is what v8 produces
    _createAndWriteCachedData(script, scriptSource, cachedDataPath, moduleManager) {
        let timeout = Math.ceil(moduleManager.getConfig().getOptionsLiteral().nodeCachedData.writeDelay * (1 + Math.random()));
        let lastSize = -1;
        let iteration = 0;
        let hashData = undefined;
        const createLoop = () => {
            setTimeout(() => {
                if (!hashData) {
                    hashData = this._crypto.createHash('md5').update(scriptSource, 'utf8').digest();
                }
                const cachedData = script.createCachedData();
                if (cachedData.length === 0 || cachedData.length === lastSize || iteration >= 5) {
                    // done
                    return;
                }
                if (cachedData.length < lastSize) {
                    // less data than before: skip, try again next round
                    createLoop();
                    return;
                }
                lastSize = cachedData.length;
                this._fs.writeFile(cachedDataPath, Buffer.concat([hashData, cachedData]), err => {
                    if (err) {
                        moduleManager.getConfig().onError(err);
                    }
                    moduleManager.getRecorder().record(63 /* LoaderEventType.CachedDataCreated */, cachedDataPath);
                    createLoop();
                });
            }, timeout * (4 ** iteration++));
        };
        // with some delay (`timeout`) create cached data
        // and repeat that (with backoff delay) until the
        // data seems to be not changing anymore
        createLoop();
    }
    _readSourceAndCachedData(sourcePath, cachedDataPath, recorder, callback) {
        if (!cachedDataPath) {
            // no cached data case
            this._fs.readFile(sourcePath, { encoding: 'utf8' }, callback);
        }
        else {
            // cached data case: read both files in parallel
            let source = undefined;
            let cachedData = undefined;
            let hashData = undefined;
            let steps = 2;
            const step = (err) => {
                if (err) {
                    callback(err);
                }
                else if (--steps === 0) {
                    callback(undefined, source, cachedData, hashData);
                }
            };
            this._fs.readFile(sourcePath, { encoding: 'utf8' }, (err, data) => {
                source = data;
                step(err);
            });
            this._fs.readFile(cachedDataPath, (err, data) => {
                if (!err && data && data.length > 0) {
                    hashData = data.slice(0, 16);
                    cachedData = data.slice(16);
                    recorder.record(60 /* LoaderEventType.CachedDataFound */, cachedDataPath);
                }
                else {
                    recorder.record(61 /* LoaderEventType.CachedDataMissed */, cachedDataPath);
                }
                step(); // ignored: cached data is optional
            });
        }
    }
    _verifyCachedData(script, scriptSource, cachedDataPath, hashData, moduleManager) {
        if (!hashData) {
            // nothing to do
            return;
        }
        if (script.cachedDataRejected) {
            // invalid anyways
            return;
        }
        setTimeout(() => {
            // check source hash - the contract is that file paths change when file content
            // change (e.g use the commit or version id as cache path). this check is
            // for violations of this contract.
            const hashDataNow = this._crypto.createHash('md5').update(scriptSource, 'utf8').digest();
            if (!hashData.equals(hashDataNow)) {
                moduleManager.getConfig().onError(new Error(`FAILED TO VERIFY CACHED DATA, deleting stale '${cachedDataPath}' now, but a RESTART IS REQUIRED`));
                this._fs.unlink(cachedDataPath, err => {
                    if (err) {
                        moduleManager.getConfig().onError(err);
                    }
                });
            }
        }, Math.ceil(5000 * (1 + Math.random())));
    }
}
export function ensureRecordedNodeRequire(recorder, _nodeRequire) {
    if (_nodeRequire.__$__isRecorded) {
        // it is already recorded
        return _nodeRequire;
    }
    const nodeRequire = function nodeRequire(what) {
        recorder.record(33 /* LoaderEventType.NodeBeginNativeRequire */, what);
        try {
            return _nodeRequire(what);
        }
        finally {
            recorder.record(34 /* LoaderEventType.NodeEndNativeRequire */, what);
        }
    };
    nodeRequire.__$__isRecorded = true;
    return nodeRequire;
}
export function createScriptLoader(env) {
    return new OnlyOnceScriptLoader(env);
}
