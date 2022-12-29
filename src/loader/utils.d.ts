export declare class Utilities {
    /**
     * This method does not take care of / vs \
     */
    static fileUriToFilePath(isWindows: boolean, uri: string): string;
    static startsWith(haystack: string, needle: string): boolean;
    static endsWith(haystack: string, needle: string): boolean;
    static containsQueryString(url: string): boolean;
    /**
     * Does `url` start with http:// or https:// or file:// or / ?
     */
    static isAbsolutePath(url: string): boolean;
    static forEachProperty(obj: any, callback: (key: string, value: any) => void): void;
    static isEmpty(obj: any): boolean;
    static recursiveClone(obj: any): any;
    private static NEXT_ANONYMOUS_ID;
    static generateAnonymousModule(): string;
    static isAnonymousModule(id: string): boolean;
    private static PERFORMANCE_NOW_PROBED;
    private static HAS_PERFORMANCE_NOW;
    static getHighPerformanceTimestamp(): number;
}
