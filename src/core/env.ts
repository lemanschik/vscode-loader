/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/*---------------------------------------------------------------------------------------------
 *---------------------------------------------------------------------------------------------
 *---------------------------------------------------------------------------------------------
 *---------------------------------------------------------------------------------------------
 *---------------------------------------------------------------------------------------------
 * Please make sure to make edits in the .ts file at https://github.com/microsoft/vscode-loader/
 *---------------------------------------------------------------------------------------------
 *---------------------------------------------------------------------------------------------
 *---------------------------------------------------------------------------------------------
 *---------------------------------------------------------------------------------------------
 *--------------------------------------------------------------------------------------------*/

export const _amdLoaderGlobal = globalThis;

declare var module: {
	exports: any;
};
declare var process: {
	platform: string;
	type: string;
	mainModule: string;
	arch: string
	argv: string[];
	versions: {
		node: string;
		electron: string;
	}
};

declare global {
	var require: {
		nodeRequire(module: string): any;
	};
	var module: {
		exports: any;
	};
	var process: {
		platform: string;
		type: string;
		mainModule: string;
		arch: string
		argv: string[];
		versions: {
			node: string;
			electron: string;
		}
	};
}


export const global: any = _amdLoaderGlobal
export const _commonjsGlobal = typeof global === 'object' ? global : {};
interface Map<K, V> {
	clear(): void;
	delete(key: K): boolean;
	forEach(callbackfn: (value: V, index: K, map: Map<K, V>) => void, thisArg?: any): void;
	get(key: K): V;
	has(key: K): boolean;
	set(key: K, value?: V): Map<K, V>;
	size: number;
	// not supported on IE11:
	// entries(): IterableIterator<[K, V]>;
	// keys(): IterableIterator<K>;
	// values(): IterableIterator<V>;
	// [Symbol.iterator]():IterableIterator<[K,V]>;
	// [Symbol.toStringTag]: string;
}
interface MapConstructor {
	new <K, V>(): Map<K, V>;
	prototype: Map<any, any>;
	// not supported on IE11:
	// new <K, V>(iterable: Iterable<[K, V]>): Map<K, V>;
}
declare var Map: MapConstructor;


export class Environment {

	private _detected: boolean;
	private _isWindows: boolean;
	private _isNode: boolean;
	private _isElectronRenderer: boolean;
	private _isWebWorker: boolean;
	private _isElectronNodeIntegrationWebWorker;

	public get isWindows(): boolean {
		this._detect();
		return this._isWindows;
	}
	public get isNode(): boolean {
		this._detect();
		return this._isNode;
	}
	public get isElectronRenderer(): boolean {
		this._detect();
		return this._isElectronRenderer;
	}
	public get isWebWorker(): boolean {
		this._detect();
		return this._isWebWorker;
	}
	public get isElectronNodeIntegrationWebWorker(): boolean {
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

	private _detect(): void {
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

	private static _isWindows(): boolean {
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

