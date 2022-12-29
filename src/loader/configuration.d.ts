import { Environment } from "./env.js";
import { LoaderEvent } from "./loaderEvents.js";
import { IBuildModuleInfo } from "./moduleManager.js";
export interface AnnotatedLoadingError extends Error {
    phase: 'loading';
    moduleId: string;
    neededBy: string[];
}
export interface AnnotatedFactoryError extends Error {
    phase: 'factory';
    moduleId: string;
    neededBy: string[];
}
export interface AnnotatedValidationError extends Error {
    phase: 'configuration';
}
export type AnnotatedError = AnnotatedLoadingError | AnnotatedFactoryError | AnnotatedValidationError;
export declare function ensureError<T extends Error>(err: any): T;
/**
 * The signature for the loader's AMD "define" function.
 */
export interface IDefineFunc {
    (id: 'string', dependencies: string[], callback: any): void;
    (id: 'string', callback: any): void;
    (dependencies: string[], callback: any): void;
    (callback: any): void;
    amd: {
        jQuery: boolean;
    };
}
/**
 * The signature for the loader's AMD "require" function.
 */
export interface IRequireFunc {
    (module: string): any;
    (config: any): void;
    (modules: string[], callback: Function): void;
    (modules: string[], callback: Function, errorback: (err: any) => void): void;
    config(params: IConfigurationOptions, shouldOverwrite?: boolean): void;
    getConfig(): IConfigurationOptions;
    /**
     * Non standard extension to reset completely the loader state. This is used for running amdjs tests
     */
    reset(): void;
    /**
     * Non standard extension to fetch loader state for building purposes.
     */
    getBuildInfo(): IBuildModuleInfo[] | null;
    /**
     * Non standard extension to fetch loader events
     */
    getStats(): LoaderEvent[];
    /**
     * The define function
     */
    define(id: 'string', dependencies: string[], callback: any): void;
    define(id: 'string', callback: any): void;
    define(dependencies: string[], callback: any): void;
    define(callback: any): void;
}
export interface IModuleConfiguration {
    [key: string]: any;
}
export interface INodeRequire {
    (nodeModule: string): any;
    main: {
        filename: string;
    };
}
export interface INodeCachedDataConfiguration {
    /**
     * Directory path in which cached is stored.
     */
    path: string;
    /**
     * Seed when generating names of cache files.
     */
    seed?: string;
    /**
     * Optional delay for filesystem write/delete operations
     */
    writeDelay?: number;
}
export interface IConfigurationOptions {
    /**
     * The prefix that will be aplied to all modules when they are resolved to a location
     */
    baseUrl?: string;
    /**
     * Redirect rules for modules. The redirect rules will affect the module ids themselves
     */
    paths?: {
        [path: string]: any;
    };
    /**
     * Per-module configuration
     */
    config?: {
        [moduleId: string]: IModuleConfiguration;
    };
    /**
     * Catch errors when invoking the module factories
     */
    catchError?: boolean;
    /**
     * Record statistics
     */
    recordStats?: boolean;
    /**
     * The suffix that will be aplied to all modules when they are resolved to a location
     */
    urlArgs?: string;
    /**
     * Callback that will be called when errors are encountered
     */
    onError?: (err: AnnotatedError) => void;
    /**
     * The loader will issue warnings when duplicate modules are encountered.
     * This list will inhibit those warnings if duplicate modules are expected.
     */
    ignoreDuplicateModules?: string[];
    /**
     * Flag to indicate if current execution is as part of a build. Used by plugins
     */
    isBuild?: boolean;
    /**
     * Normally, during a build, no module factories are invoked. This can be used
     * to forcefully execute a module's factory.
     */
    buildForceInvokeFactory?: {
        [moduleId: string]: boolean;
    };
    /**
     * Content Security Policy nonce value used to load child scripts.
     */
    cspNonce?: string;
    /**
     * If running inside an electron renderer, prefer using <script> tags to load code.
     * Defaults to false.
     */
    preferScriptTags?: boolean;
    /**
     * A trusted types policy which will be used to create TrustedScriptURL-values.
     * https://w3c.github.io/webappsec-trusted-types/dist/spec/#introduction.
     */
    trustedTypesPolicy?: {
        createScriptURL(value: string): string & object;
        createScript(_: string, value: string): string;
    };
    /**
     * A regex to help determine if a module is an AMD module or a node module.
     * If defined, then all amd modules in the system must match this regular expression.
     */
    amdModulesPattern?: RegExp;
    /**
     * The main entry point node's require
     */
    nodeRequire?: INodeRequire;
    /**
     * An optional transformation applied to the source before it is loaded in node's vm
     */
    nodeInstrumenter?: (source: string, vmScriptSrc: string) => string;
    /**
    * Support v8 cached data (http://v8project.blogspot.co.uk/2015/07/code-caching.html)
    */
    nodeCachedData?: INodeCachedDataConfiguration;
}
export interface IValidatedConfigurationOptions extends IConfigurationOptions {
    baseUrl: string;
    paths: {
        [path: string]: any;
    };
    config: {
        [moduleId: string]: IModuleConfiguration;
    };
    catchError: boolean;
    recordStats: boolean;
    urlArgs: string;
    onError: (err: AnnotatedError) => void;
    ignoreDuplicateModules: string[];
    isBuild: boolean;
    cspNonce: string;
    preferScriptTags: boolean;
}
export declare class ConfigurationOptionsUtil {
    /**
     * Ensure configuration options make sense
     */
    private static validateConfigurationOptions;
    static mergeConfigurationOptions(overwrite?: IConfigurationOptions | null, base?: IConfigurationOptions | null): IValidatedConfigurationOptions;
}
export declare class Configuration {
    private readonly _env;
    private options;
    /**
     * Generated from the `ignoreDuplicateModules` configuration option.
     */
    private ignoreDuplicateModulesMap;
    /**
     * Generated from the `paths` configuration option. These are sorted with the longest `from` first.
     */
    private sortedPathsRules;
    constructor(env: Environment, options?: IConfigurationOptions);
    private _createIgnoreDuplicateModulesMap;
    private _createSortedPathsRules;
    /**
     * Clone current configuration and overwrite options selectively.
     * @param options The selective options to overwrite with.
     * @result A new configuration
     */
    cloneAndMerge(options?: IConfigurationOptions): Configuration;
    /**
     * Get current options bag. Useful for passing it forward to plugins.
     */
    getOptionsLiteral(): IValidatedConfigurationOptions;
    private _applyPaths;
    private _addUrlArgsToUrl;
    private _addUrlArgsIfNecessaryToUrl;
    private _addUrlArgsIfNecessaryToUrls;
    /**
     * Transform a module id to a location. Appends .js to module ids
     */
    moduleIdToPaths(moduleId: string): string[];
    /**
     * Transform a module id or url to a location.
     */
    requireToUrl(url: string): string;
    /**
     * Flag to indicate if current execution is as part of a build.
     */
    isBuild(): boolean;
    shouldInvokeFactory(strModuleId: string): boolean;
    /**
     * Test if module `moduleId` is expected to be defined multiple times
     */
    isDuplicateMessageIgnoredFor(moduleId: string): boolean;
    /**
     * Get the configuration settings for the provided module id
     */
    getConfigForModule(moduleId: string): IModuleConfiguration | undefined;
    /**
     * Should errors be caught when executing module factories?
     */
    shouldCatchError(): boolean;
    /**
     * Should statistics be recorded?
     */
    shouldRecordStats(): boolean;
    /**
     * Forward an error to the error handler.
     */
    onError(err: AnnotatedError): void;
}
