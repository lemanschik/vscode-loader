/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';
import { Environment, global } from "./env.js";
import { ModuleManager } from "./moduleManager.js";
import { createScriptLoader, ensureRecordedNodeRequire } from "./scriptLoader.js";
import { Utilities } from "./utils.js";
var define;
const env = new Environment();
let moduleManager = null;
const DefineFunc = function (id, dependencies, callback) {
    if (typeof id !== 'string') {
        callback = dependencies;
        dependencies = id;
        id = null;
    }
    if (typeof dependencies !== 'object' || !Array.isArray(dependencies)) {
        callback = dependencies;
        dependencies = null;
    }
    if (!dependencies) {
        dependencies = ['require', 'exports', 'module'];
    }
    if (id) {
        moduleManager.defineModule(id, dependencies, callback, null, null);
    }
    else {
        moduleManager.enqueueDefineAnonymousModule(dependencies, callback);
    }
};
DefineFunc.amd = {
    jQuery: true
};
const _requireFunc_config = function (params, shouldOverwrite = false) {
    moduleManager.configure(params, undefined); // Nothing to dowrite);
};
const RequireFunc = function () {
    if (arguments.length === 1) {
        if ((arguments[0] instanceof Object) && !Array.isArray(arguments[0])) {
            _requireFunc_config(arguments[0]);
            return;
        }
        if (typeof arguments[0] === 'string') {
            return moduleManager.synchronousRequire(arguments[0]);
        }
    }
    if (arguments.length === 2 || arguments.length === 3) {
        if (Array.isArray(arguments[0])) {
            moduleManager.defineModule(Utilities.generateAnonymousModule(), arguments[0], arguments[1], arguments[2], null);
            return;
        }
    }
    throw new Error('Unrecognized require call');
};
RequireFunc.config = _requireFunc_config;
RequireFunc.getConfig = function () {
    return moduleManager.getConfig().getOptionsLiteral();
};
RequireFunc.reset = function () {
    moduleManager = moduleManager.reset();
};
RequireFunc.getBuildInfo = function () {
    return moduleManager.getBuildInfo();
};
RequireFunc.getStats = function () {
    return moduleManager.getLoaderEvents();
};
RequireFunc.define = DefineFunc;
export function init() {
    if (typeof global.require !== 'undefined' || typeof require !== 'undefined') {
        const _nodeRequire = (global.require || require);
        if (typeof _nodeRequire === 'function' && typeof _nodeRequire.resolve === 'function') {
            // re-expose node's require function
            const nodeRequire = ensureRecordedNodeRequire(moduleManager.getRecorder(), _nodeRequire);
            global.nodeRequire = nodeRequire;
            RequireFunc.nodeRequire = nodeRequire;
            RequireFunc.__$__nodeRequire = nodeRequire;
        }
    }
    if (env.isNode && !env.isElectronRenderer && !env.isElectronNodeIntegrationWebWorker) {
        module.exports = RequireFunc;
    }
    else {
        if (!env.isElectronRenderer) {
            global.define = DefineFunc;
        }
        global.require = RequireFunc;
    }
}

    moduleManager = new ModuleManager(env, createScriptLoader(env), DefineFunc, RequireFunc, Utilities.getHighPerformanceTimestamp());
    // The global variable require can configure the loader
    if (typeof global.require !== 'undefined' && typeof global.require !== 'function') {
        RequireFunc.config(global.require);
    }
    // This define is for the local closure defined in node in the case that the loader is concatenated
    define = function () {
        return DefineFunc.apply(null, arguments);
    };
    define.amd = DefineFunc.amd;
    if (typeof doNotInitLoader === 'undefined') {
        init();
    }

