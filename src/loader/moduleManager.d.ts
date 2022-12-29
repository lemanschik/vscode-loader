import { AnnotatedError, Configuration, IConfigurationOptions, IDefineFunc, IRequireFunc } from "./configuration.js";
import { Environment } from "./env.js";
import { ILoaderEventRecorder, LoaderEvent } from "./loaderEvents.js";
import { IScriptLoader } from "./scriptLoader.js";
export interface ILoaderPlugin {
    load: (pluginParam: string, parentRequire: IRelativeRequire, loadCallback: IPluginLoadCallback, options: IConfigurationOptions) => void;
}
export interface IDefineCall {
    stack: string | null;
    dependencies: string[];
    callback: any;
}
export interface IRelativeRequire {
    (dependencies: string[], callback: Function, errorback?: (error: Error) => void): void;
    (dependency: string): any;
    toUrl(id: string): string;
    getStats(): LoaderEvent[];
    hasDependencyCycle(): boolean;
    getChecksums(): {
        [scriptSrc: string]: string;
    };
    config(params: IConfigurationOptions, shouldOverwrite?: boolean): void;
}
export interface IPluginLoadCallback {
    (value: any): void;
    error(err: any): void;
}
export interface IPluginWriteCallback {
    (contents: string): void;
    getEntryPoint(): string;
    asModule(moduleId: string, contents: string): void;
}
export interface IPluginWriteFileCallback {
    (filename: string, contents: string): void;
    getEntryPoint(): string;
    asModule(moduleId: string, contents: string): void;
}
export declare class ModuleIdResolver {
    static ROOT: ModuleIdResolver;
    private fromModulePath;
    constructor(fromModuleId: string);
    /**
     * Normalize 'a/../name' to 'name', etc.
     */
    static _normalizeModuleId(moduleId: string): string;
    /**
     * Resolve relative module ids
     */
    resolveModule(moduleId: string): string;
}
export declare class Module {
    readonly id: ModuleId;
    readonly strId: string;
    readonly dependencies: Dependency[] | null;
    private readonly _callback;
    private readonly _errorback;
    readonly moduleIdResolver: ModuleIdResolver | null;
    exports: any;
    error: AnnotatedError | null;
    exportsPassedIn: boolean;
    unresolvedDependenciesCount: number;
    private _isComplete;
    constructor(id: ModuleId, strId: string, dependencies: Dependency[], callback: any, errorback: ((err: AnnotatedError) => void) | null | undefined, moduleIdResolver: ModuleIdResolver | null);
    private static _safeInvokeFunction;
    private static _invokeFactory;
    complete(recorder: ILoaderEventRecorder, config: Configuration, dependenciesValues: any[], inversedependenciesProvider: (moduleId: number) => string[]): void;
    /**
     * One of the direct dependencies or a transitive dependency has failed to load.
     */
    onDependencyError(err: AnnotatedError): boolean;
    /**
     * Is the current module complete?
     */
    isComplete(): boolean;
}
export interface IPosition {
    line: number;
    col: number;
}
export interface IBuildModuleInfo {
    id: string;
    path: string | null;
    defineLocation: IPosition | null;
    dependencies: string[];
    shim: string | null;
    exports: any;
}
export declare const enum ModuleId {
    EXPORTS = 0,
    MODULE = 1,
    REQUIRE = 2
}
export declare class RegularDependency {
    static EXPORTS: RegularDependency;
    static MODULE: RegularDependency;
    static REQUIRE: RegularDependency;
    readonly id: ModuleId;
    constructor(id: ModuleId);
}
export declare class PluginDependency {
    readonly id: ModuleId;
    readonly pluginId: ModuleId;
    readonly pluginParam: string;
    constructor(id: ModuleId, pluginId: ModuleId, pluginParam: string);
}
export type Dependency = RegularDependency | PluginDependency;
export declare class ModuleManager {
    private readonly _env;
    private readonly _scriptLoader;
    private readonly _loaderAvailableTimestamp;
    private readonly _defineFunc;
    private readonly _requireFunc;
    private _moduleIdProvider;
    private _config;
    private _hasDependencyCycle;
    /**
     * map of module id => module.
     * If a module is found in _modules, its code has been loaded, but
     * not necessary all its dependencies have been resolved
     */
    private _modules2;
    /**
     * Set of module ids => true
     * If a module is found in _knownModules, a call has been made
     * to the scriptLoader to load its code or a call will be made
     * This is mainly used as a flag to not try loading the same module twice
     */
    private _knownModules2;
    /**
     * map of module id => array [module id]
     */
    private _inverseDependencies2;
    /**
     * Hash map of module id => array [ { moduleId, pluginParam } ]
     */
    private _inversePluginDependencies2;
    /**
     * current annonymous received define call, but not yet processed
     */
    private _currentAnonymousDefineCall;
    private _recorder;
    private _buildInfoPath;
    private _buildInfoDefineStack;
    private _buildInfoDependencies;
    constructor(env: Environment, scriptLoader: IScriptLoader, defineFunc: IDefineFunc, requireFunc: IRequireFunc, loaderAvailableTimestamp?: number);
    reset(): ModuleManager;
    getGlobalAMDDefineFunc(): IDefineFunc;
    getGlobalAMDRequireFunc(): IRequireFunc;
    private static _findRelevantLocationInStack;
    getBuildInfo(): IBuildModuleInfo[] | null;
    getRecorder(): ILoaderEventRecorder;
    getLoaderEvents(): LoaderEvent[];
    /**
     * Defines an anonymous module (without an id). Its name will be resolved as we receive a callback from the scriptLoader.
     * @param dependencies @see defineModule
     * @param callback @see defineModule
     */
    enqueueDefineAnonymousModule(dependencies: string[], callback: any): void;
    /**
     * Creates a module and stores it in _modules. The manager will immediately begin resolving its dependencies.
     * @param strModuleId An unique and absolute id of the module. This must not collide with another module's id
     * @param dependencies An array with the dependencies of the module. Special keys are: "require", "exports" and "module"
     * @param callback if callback is a function, it will be called with the resolved dependencies. if callback is an object, it will be considered as the exports of the module.
     */
    defineModule(strModuleId: string, dependencies: string[], callback: any, errorback: ((err: AnnotatedError) => void) | null | undefined, stack: string | null, moduleIdResolver?: ModuleIdResolver): void;
    private _normalizeDependency;
    private _normalizeDependencies;
    private _relativeRequire;
    /**
     * Require synchronously a module by its absolute id. If the module is not loaded, an exception will be thrown.
     * @param id The unique and absolute id of the required module
     * @return The exports of module 'id'
     */
    synchronousRequire(_strModuleId: string, moduleIdResolver?: ModuleIdResolver): any;
    configure(params: IConfigurationOptions, shouldOverwrite?: boolean): void;
    getConfig(): Configuration;
    /**
     * Callback from the scriptLoader when a module has been loaded.
     * This means its code is available and has been executed.
     */
    private _onLoad;
    private _createLoadError;
    /**
     * Callback from the scriptLoader when a module hasn't been loaded.
     * This means that the script was not found (e.g. 404) or there was an error in the script.
     */
    private _onLoadError;
    /**
     * Walks (recursively) the dependencies of 'from' in search of 'to'.
     * Returns true if there is such a path or false otherwise.
     * @param from Module id to start at
     * @param to Module id to look for
     */
    private _hasDependencyPath;
    /**
     * Walks (recursively) the dependencies of 'from' in search of 'to'.
     * Returns cycle as array.
     * @param from Module id to start at
     * @param to Module id to look for
     */
    private _findCyclePath;
    /**
     * Create the local 'require' that is passed into modules
     */
    private _createRequire;
    private _loadModule;
    /**
     * Resolve a plugin dependency with the plugin loaded & complete
     * @param module The module that has this dependency
     * @param pluginDependency The semi-normalized dependency that appears in the module. e.g. 'vs/css!./mycssfile'. Only the plugin part (before !) is normalized
     * @param plugin The plugin (what the plugin exports)
     */
    private _loadPluginDependency;
    /**
     * Examine the dependencies of module 'module' and resolve them as needed.
     */
    private _resolve;
    private _onModuleComplete;
}
