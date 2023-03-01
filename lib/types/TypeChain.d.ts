import type { Listener } from "@ethersproject/providers";
import type { Event, EventFilter } from "ethers";
export interface TypedEvent<TArgsArray extends Array<any> = any, TArgsObject = any> extends Event {
    args: TArgsArray & TArgsObject;
}
export interface TypedEventFilter<_TEvent extends TypedEvent> extends EventFilter {
}
export interface TypedListener<TEvent extends TypedEvent> {
    (...listenerArg: [...__TypechainArgsArray<TEvent>, TEvent]): void;
}
type __TypechainArgsArray<T> = T extends TypedEvent<infer U> ? U : never;
export interface OnEvent<TRes> {
    <TEvent extends TypedEvent>(eventFilter: TypedEventFilter<TEvent>, listener: TypedListener<TEvent>): TRes;
    (eventName: string, listener: Listener): TRes;
}
export type PromiseOrValue<T> = T | Promise<T>;
export {};
