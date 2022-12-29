import { Configuration, IDefineFunc, IRequireFunc } from "./configuration.js";
import { Environment } from "./env.js";
import { ILoaderEventRecorder } from "./loaderEvents.js";
export interface IModuleManager {
    getGlobalAMDDefineFunc(): IDefineFunc;
    getGlobalAMDRequireFunc(): IRequireFunc;
    getConfig(): Configuration;
    enqueueDefineAnonymousModule(dependencies: string[], callback: any): void;
    getRecorder(): ILoaderEventRecorder;
}
export interface IScriptLoader {
    load(moduleManager: IModuleManager, scriptPath: string, loadCallback: () => void, errorCallback: (err: any) => void): void;
}
export declare function ensureRecordedNodeRequire(recorder: ILoaderEventRecorder, _nodeRequire: (nodeModule: string) => any): (nodeModule: string) => any;
export declare function createScriptLoader(env: Environment): IScriptLoader;
