/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { global } from "./env.js";
export class Utilities {
    /**
     * This method does not take care of / vs \
     */
    static fileUriToFilePath(isWindows, uri) {
        uri = decodeURI(uri).replace(/%23/g, '#');
        if (isWindows) {
            if (/^file:\/\/\//.test(uri)) {
                // This is a URI without a hostname => return only the path segment
                return uri.substr(8);
            }
            if (/^file:\/\//.test(uri)) {
                return uri.substr(5);
            }
        }
        else {
            if (/^file:\/\//.test(uri)) {
                return uri.substr(7);
            }
        }
        // Not sure...
        return uri;
    }
    static startsWith(haystack, needle) {
        return haystack.length >= needle.length && haystack.substr(0, needle.length) === needle;
    }
    static endsWith(haystack, needle) {
        return haystack.length >= needle.length && haystack.substr(haystack.length - needle.length) === needle;
    }
    // only check for "?" before "#" to ensure that there is a real Query-String
    static containsQueryString(url) {
        return /^[^\#]*\?/gi.test(url);
    }
    /**
     * Does `url` start with http:// or https:// or file:// or / ?
     */
    static isAbsolutePath(url) {
        return /^((http:\/\/)|(https:\/\/)|(file:\/\/)|(\/))/.test(url);
    }
    static forEachProperty(obj, callback) {
        if (obj) {
            let key;
            for (key in obj) {
                if (obj.hasOwnProperty(key)) {
                    callback(key, obj[key]);
                }
            }
        }
    }
    static isEmpty(obj) {
        let isEmpty = true;
        Utilities.forEachProperty(obj, () => {
            isEmpty = false;
        });
        return isEmpty;
    }
    static recursiveClone(obj) {
        if (!obj || typeof obj !== 'object' || obj instanceof RegExp) {
            return obj;
        }
        if (!Array.isArray(obj) && Object.getPrototypeOf(obj) !== Object.prototype) {
            // only clone "simple" objects
            return obj;
        }
        let result = Array.isArray(obj) ? [] : {};
        Utilities.forEachProperty(obj, (key, value) => {
            if (value && typeof value === 'object') {
                result[key] = Utilities.recursiveClone(value);
            }
            else {
                result[key] = value;
            }
        });
        return result;
    }
    static NEXT_ANONYMOUS_ID = 1;
    static generateAnonymousModule() {
        return '===anonymous' + (Utilities.NEXT_ANONYMOUS_ID++) + '===';
    }
    static isAnonymousModule(id) {
        return Utilities.startsWith(id, '===anonymous');
    }
    static PERFORMANCE_NOW_PROBED = false;
    static HAS_PERFORMANCE_NOW = false;
    static getHighPerformanceTimestamp() {
        if (!this.PERFORMANCE_NOW_PROBED) {
            this.PERFORMANCE_NOW_PROBED = true;
            this.HAS_PERFORMANCE_NOW = (global.performance && typeof global.performance.now === 'function');
        }
        return (this.HAS_PERFORMANCE_NOW ? global.performance.now() : Date.now());
    }
}
