/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Utilities } from "./utils.js";
export class LoaderEvent {
    type;
    timestamp;
    detail;
    constructor(type, detail, timestamp) {
        this.type = type;
        this.detail = detail;
        this.timestamp = timestamp;
    }
}
export class LoaderEventRecorder {
    _events;
    constructor(loaderAvailableTimestamp) {
        this._events = [new LoaderEvent(1 /* LoaderEventType.LoaderAvailable */, '', loaderAvailableTimestamp)];
    }
    record(type, detail) {
        this._events.push(new LoaderEvent(type, detail, Utilities.getHighPerformanceTimestamp()));
    }
    getEvents() {
        return this._events;
    }
}
export class NullLoaderEventRecorder {
    static INSTANCE = new NullLoaderEventRecorder();
    record(type, detail) {
        // Nothing to do
    }
    getEvents() {
        return [];
    }
}
