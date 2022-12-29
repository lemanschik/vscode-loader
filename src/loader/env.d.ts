export declare const _amdLoaderGlobal: typeof globalThis;
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
        arch: string;
        argv: string[];
        versions: {
            node: string;
            electron: string;
        };
    };
}
export declare const global: any;
export declare const _commonjsGlobal: any;
export declare class Environment {
    private _detected;
    private _isWindows;
    private _isNode;
    private _isElectronRenderer;
    private _isWebWorker;
    private _isElectronNodeIntegrationWebWorker;
    get isWindows(): boolean;
    get isNode(): boolean;
    get isElectronRenderer(): boolean;
    get isWebWorker(): boolean;
    get isElectronNodeIntegrationWebWorker(): boolean;
    constructor();
    private _detect;
    private static _isWindows;
}
