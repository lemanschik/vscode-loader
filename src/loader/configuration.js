/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Utilities } from "./utils.js";
export function ensureError(err) {
    if (err instanceof Error) {
        return err;
    }
    const result = new Error(err.message || String(err) || 'Unknown Error');
    if (err.stack) {
        result.stack = err.stack;
    }
    return result;
}
;
export class ConfigurationOptionsUtil {
    /**
     * Ensure configuration options make sense
     */
    static validateConfigurationOptions(options) {
        function defaultOnError(err) {
            if (err.phase === 'loading') {
                console.error('Loading "' + err.moduleId + '" failed');
                console.error(err);
                console.error('Here are the modules that depend on it:');
                console.error(err.neededBy);
                return;
            }
            if (err.phase === 'factory') {
                console.error('The factory function of "' + err.moduleId + '" has thrown an exception');
                console.error(err);
                console.error('Here are the modules that depend on it:');
                console.error(err.neededBy);
                return;
            }
        }
        options = options || {};
        if (typeof options.baseUrl !== 'string') {
            options.baseUrl = '';
        }
        if (typeof options.isBuild !== 'boolean') {
            options.isBuild = false;
        }
        if (typeof options.paths !== 'object') {
            options.paths = {};
        }
        if (typeof options.config !== 'object') {
            options.config = {};
        }
        if (typeof options.catchError === 'undefined') {
            options.catchError = false;
        }
        if (typeof options.recordStats === 'undefined') {
            options.recordStats = false;
        }
        if (typeof options.urlArgs !== 'string') {
            options.urlArgs = '';
        }
        if (typeof options.onError !== 'function') {
            options.onError = defaultOnError;
        }
        if (!Array.isArray(options.ignoreDuplicateModules)) {
            options.ignoreDuplicateModules = [];
        }
        if (options.baseUrl.length > 0) {
            if (!Utilities.endsWith(options.baseUrl, '/')) {
                options.baseUrl += '/';
            }
        }
        if (typeof options.cspNonce !== 'string') {
            options.cspNonce = '';
        }
        if (typeof options.preferScriptTags === 'undefined') {
            options.preferScriptTags = false;
        }
        if (options.nodeCachedData && typeof options.nodeCachedData === 'object') {
            if (typeof options.nodeCachedData.seed !== 'string') {
                options.nodeCachedData.seed = 'seed';
            }
            if (typeof options.nodeCachedData.writeDelay !== 'number' || options.nodeCachedData.writeDelay < 0) {
                options.nodeCachedData.writeDelay = 1000 * 7;
            }
            if (!options.nodeCachedData.path || typeof options.nodeCachedData.path !== 'string') {
                const err = ensureError(new Error('INVALID cached data configuration, \'path\' MUST be set'));
                err.phase = 'configuration';
                options.onError(err);
                options.nodeCachedData = undefined;
            }
        }
        return options;
    }
    static mergeConfigurationOptions(overwrite = null, base = null) {
        let result = Utilities.recursiveClone(base || {});
        // Merge known properties and overwrite the unknown ones
        Utilities.forEachProperty(overwrite, (key, value) => {
            if (key === 'ignoreDuplicateModules' && typeof result.ignoreDuplicateModules !== 'undefined') {
                result.ignoreDuplicateModules = result.ignoreDuplicateModules.concat(value);
            }
            else if (key === 'paths' && typeof result.paths !== 'undefined') {
                Utilities.forEachProperty(value, (key2, value2) => result.paths[key2] = value2);
            }
            else if (key === 'config' && typeof result.config !== 'undefined') {
                Utilities.forEachProperty(value, (key2, value2) => result.config[key2] = value2);
            }
            else {
                result[key] = Utilities.recursiveClone(value);
            }
        });
        return ConfigurationOptionsUtil.validateConfigurationOptions(result);
    }
}
export class Configuration {
    _env;
    options;
    /**
     * Generated from the `ignoreDuplicateModules` configuration option.
     */
    ignoreDuplicateModulesMap;
    /**
     * Generated from the `paths` configuration option. These are sorted with the longest `from` first.
     */
    sortedPathsRules;
    constructor(env, options) {
        this._env = env;
        this.options = ConfigurationOptionsUtil.mergeConfigurationOptions(options);
        this._createIgnoreDuplicateModulesMap();
        this._createSortedPathsRules();
        if (this.options.baseUrl === '') {
            if (this.options.nodeRequire && this.options.nodeRequire.main && this.options.nodeRequire.main.filename && this._env.isNode) {
                let nodeMain = this.options.nodeRequire.main.filename;
                let dirnameIndex = Math.max(nodeMain.lastIndexOf('/'), nodeMain.lastIndexOf('\\'));
                this.options.baseUrl = nodeMain.substring(0, dirnameIndex + 1);
            }
        }
    }
    _createIgnoreDuplicateModulesMap() {
        // Build a map out of the ignoreDuplicateModules array
        this.ignoreDuplicateModulesMap = {};
        for (let i = 0; i < this.options.ignoreDuplicateModules.length; i++) {
            this.ignoreDuplicateModulesMap[this.options.ignoreDuplicateModules[i]] = true;
        }
    }
    _createSortedPathsRules() {
        // Create an array our of the paths rules, sorted descending by length to
        // result in a more specific -> less specific order
        this.sortedPathsRules = [];
        Utilities.forEachProperty(this.options.paths, (from, to) => {
            if (!Array.isArray(to)) {
                this.sortedPathsRules.push({
                    from: from,
                    to: [to]
                });
            }
            else {
                this.sortedPathsRules.push({
                    from: from,
                    to: to
                });
            }
        });
        this.sortedPathsRules.sort((a, b) => {
            return b.from.length - a.from.length;
        });
    }
    /**
     * Clone current configuration and overwrite options selectively.
     * @param options The selective options to overwrite with.
     * @result A new configuration
     */
    cloneAndMerge(options) {
        return new Configuration(this._env, ConfigurationOptionsUtil.mergeConfigurationOptions(options, this.options));
    }
    /**
     * Get current options bag. Useful for passing it forward to plugins.
     */
    getOptionsLiteral() {
        return this.options;
    }
    _applyPaths(moduleId) {
        let pathRule;
        for (let i = 0, len = this.sortedPathsRules.length; i < len; i++) {
            pathRule = this.sortedPathsRules[i];
            if (Utilities.startsWith(moduleId, pathRule.from)) {
                let result = [];
                for (let j = 0, lenJ = pathRule.to.length; j < lenJ; j++) {
                    result.push(pathRule.to[j] + moduleId.substr(pathRule.from.length));
                }
                return result;
            }
        }
        return [moduleId];
    }
    _addUrlArgsToUrl(url) {
        if (Utilities.containsQueryString(url)) {
            return url + '&' + this.options.urlArgs;
        }
        else {
            return url + '?' + this.options.urlArgs;
        }
    }
    _addUrlArgsIfNecessaryToUrl(url) {
        if (this.options.urlArgs) {
            return this._addUrlArgsToUrl(url);
        }
        return url;
    }
    _addUrlArgsIfNecessaryToUrls(urls) {
        if (this.options.urlArgs) {
            for (let i = 0, len = urls.length; i < len; i++) {
                urls[i] = this._addUrlArgsToUrl(urls[i]);
            }
        }
        return urls;
    }
    /**
     * Transform a module id to a location. Appends .js to module ids
     */
    moduleIdToPaths(moduleId) {
        if (this._env.isNode) {
            const isNodeModule = (this.options.amdModulesPattern instanceof RegExp
                && !this.options.amdModulesPattern.test(moduleId));
            if (isNodeModule) {
                // This is a node module...
                if (this.isBuild()) {
                    // ...and we are at build time, drop it
                    return ['empty:'];
                }
                else {
                    // ...and at runtime we create a `shortcut`-path
                    return ['node|' + moduleId];
                }
            }
        }
        let result = moduleId;
        let results;
        if (!Utilities.endsWith(result, '.js') && !Utilities.isAbsolutePath(result)) {
            results = this._applyPaths(result);
            for (let i = 0, len = results.length; i < len; i++) {
                if (this.isBuild() && results[i] === 'empty:') {
                    continue;
                }
                if (!Utilities.isAbsolutePath(results[i])) {
                    results[i] = this.options.baseUrl + results[i];
                }
                if (!Utilities.endsWith(results[i], '.js') && !Utilities.containsQueryString(results[i])) {
                    results[i] = results[i] + '.js';
                }
            }
        }
        else {
            if (!Utilities.endsWith(result, '.js') && !Utilities.containsQueryString(result)) {
                result = result + '.js';
            }
            results = [result];
        }
        return this._addUrlArgsIfNecessaryToUrls(results);
    }
    /**
     * Transform a module id or url to a location.
     */
    requireToUrl(url) {
        let result = url;
        if (!Utilities.isAbsolutePath(result)) {
            result = this._applyPaths(result)[0];
            if (!Utilities.isAbsolutePath(result)) {
                result = this.options.baseUrl + result;
            }
        }
        return this._addUrlArgsIfNecessaryToUrl(result);
    }
    /**
     * Flag to indicate if current execution is as part of a build.
     */
    isBuild() {
        return this.options.isBuild;
    }
    shouldInvokeFactory(strModuleId) {
        if (!this.options.isBuild) {
            // outside of a build, all factories should be invoked
            return true;
        }
        // during a build, only explicitly marked or anonymous modules get their factories invoked
        if (Utilities.isAnonymousModule(strModuleId)) {
            return true;
        }
        if (this.options.buildForceInvokeFactory && this.options.buildForceInvokeFactory[strModuleId]) {
            return true;
        }
        return false;
    }
    /**
     * Test if module `moduleId` is expected to be defined multiple times
     */
    isDuplicateMessageIgnoredFor(moduleId) {
        return this.ignoreDuplicateModulesMap.hasOwnProperty(moduleId);
    }
    /**
     * Get the configuration settings for the provided module id
     */
    getConfigForModule(moduleId) {
        if (this.options.config) {
            return this.options.config[moduleId];
        }
    }
    /**
     * Should errors be caught when executing module factories?
     */
    shouldCatchError() {
        return this.options.catchError;
    }
    /**
     * Should statistics be recorded?
     */
    shouldRecordStats() {
        return this.options.recordStats;
    }
    /**
     * Forward an error to the error handler.
     */
    onError(err) {
        this.options.onError(err);
    }
}
