import { Request, RequestHandler } from "express";
import { scaffold } from "./src/scaffold";
import {
    AsyncSyncDestructionMethod,
    AsyncSyncTransactionMethod,
    ErrorType,
    ScaffoldFactoryResult,
} from "./src/types";

export { Errors } from "./src/errors";
export { ErrorType } from "./src/types";
export { secure as guard } from "./src/secure";
export interface ISciroccoConfiguration {
    invokeNextOnError?: boolean;
    passPureErrors?: boolean;
}

export const config = (configuration: ISciroccoConfiguration): ScaffoldFactoryResult =>
    <SourceType, TargetType extends ResponseType, ResponseType>(
        construct: AsyncSyncTransactionMethod<Request, SourceType | ErrorType>,
        callback: AsyncSyncTransactionMethod<SourceType, TargetType | ErrorType>,
        destruct: AsyncSyncDestructionMethod<TargetType, ResponseType | ErrorType> =
            (source, req, res) => source,
        isMiddlewareCallback: boolean = false, customSuccessCode: number = 200,
    ): RequestHandler =>
        scaffold(construct, callback, destruct,
            configuration.invokeNextOnError, configuration.passPureErrors, customSuccessCode, isMiddlewareCallback);
