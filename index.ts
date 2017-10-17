import { Request, RequestHandler } from "express";
import { ErrorType } from "./src/errors";
import { AsyncSyncDestructionMethod, AsyncSyncTransactionMethod, scaffold } from "./src/scirocco";

type ScaffoldFactory = <SourceType, TargetType extends ResponseType, ResponseType>(
    construct: AsyncSyncTransactionMethod<Request, SourceType | ErrorType>,
    callback: AsyncSyncTransactionMethod<SourceType, TargetType | ErrorType>,
    destruct?: AsyncSyncDestructionMethod<TargetType, ResponseType | ErrorType>,
    customSuccessCode?: number) => RequestHandler;

export { Errors, ErrorType } from "./src/errors";
export { secure as guard } from "./src/scirocco";
export interface ISciroccoConfiguration {
    invokeNextOnError?: boolean;
    passPureErrors?: boolean;
}

export const config = (configuration: ISciroccoConfiguration): ScaffoldFactory =>
    <SourceType, TargetType extends ResponseType, ResponseType>(
        construct: AsyncSyncTransactionMethod<Request, SourceType | ErrorType>,
        callback: AsyncSyncTransactionMethod<SourceType, TargetType | ErrorType>,
        destruct?: AsyncSyncDestructionMethod<TargetType, ResponseType | ErrorType>,
        customSuccessCode: number = 200,
    ): RequestHandler =>
        scaffold(construct, callback, destruct,
            configuration.invokeNextOnError, configuration.passPureErrors, customSuccessCode);
