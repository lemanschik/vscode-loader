/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export const _amdLoaderGlobal = globalThis;
export const global = _amdLoaderGlobal;
export const _commonjsGlobal = typeof global === 'object' ? global : {};
export class Environment {
    _detected;
    _isWindows;
    _isNode;
    _isElectronRenderer;
    _isWebWorker;
    _isElectronNodeIntegrationWebWorker;
    get isWindows() {
        this._detect();
        return this._isWindows;
    }
    get isNode() {
        this._detect();
        return this._isNode;
    }
    get isElectronRenderer() {
        this._detect();
        return this._isElectronRenderer;
    }
    get isWebWorker() {
        this._detect();
        return this._isWebWorker;
    }
    get isElectronNodeIntegrationWebWorker() {
        this._detect();
        return this._isElectronNodeIntegrationWebWorker;
    }
    constructor() {
        this._detected = false;
        this._isWindows = false;
        this._isNode = false;
        this._isElectronRenderer = false;
        this._isWebWorker = false;
        this._isElectronNodeIntegrationWebWorker = false;
    }
    _detect() {
        if (this._detected) {
            return;
        }
        this._detected = true;
        this._isWindows = Environment._isWindows();
        this._isNode = (typeof module !== 'undefined' && !!module.exports);
        this._isElectronRenderer = (typeof process !== 'undefined' && typeof process.versions !== 'undefined' && typeof process.versions.electron !== 'undefined' && process.type === 'renderer');
        this._isWebWorker = (typeof global.importScripts === 'function');
        this._isElectronNodeIntegrationWebWorker = this._isWebWorker && (typeof process !== 'undefined' && typeof process.versions !== 'undefined' && typeof process.versions.electron !== 'undefined' && process.type === 'worker');
    }
    static _isWindows() {
        if (typeof navigator !== 'undefined') {
            if (navigator.userAgent && navigator.userAgent.indexOf('Windows') >= 0) {
                return true;
            }
        }
        if (typeof process !== 'undefined') {
            return (process.platform === 'win32');
        }
        return false;
    }
}
