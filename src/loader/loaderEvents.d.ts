export declare const enum LoaderEventType {
    LoaderAvailable = 1,
    BeginLoadingScript = 10,
    EndLoadingScriptOK = 11,
    EndLoadingScriptError = 12,
    BeginInvokeFactory = 21,
    EndInvokeFactory = 22,
    NodeBeginEvaluatingScript = 31,
    NodeEndEvaluatingScript = 32,
    NodeBeginNativeRequire = 33,
    NodeEndNativeRequire = 34,
    CachedDataFound = 60,
    CachedDataMissed = 61,
    CachedDataRejected = 62,
    CachedDataCreated = 63
}
export declare class LoaderEvent {
    type: LoaderEventType;
    timestamp: number;
    detail: string;
    constructor(type: LoaderEventType, detail: string, timestamp: number);
}
export interface ILoaderEventRecorder {
    record(type: LoaderEventType, detail: string): void;
    getEvents(): LoaderEvent[];
}
export declare class LoaderEventRecorder implements ILoaderEventRecorder {
    private _events;
    constructor(loaderAvailableTimestamp: number);
    record(type: LoaderEventType, detail: string): void;
    getEvents(): LoaderEvent[];
}
export declare class NullLoaderEventRecorder implements ILoaderEventRecorder {
    static INSTANCE: NullLoaderEventRecorder;
    record(type: LoaderEventType, detail: string): void;
    getEvents(): LoaderEvent[];
}
