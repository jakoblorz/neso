import { Request, RequestHandler, Response } from "express";

/* pure types */
export type ErrorType = { code: number, status: string };
export type AsyncTransactionMethod<SourceType, TargetType> = (source: SourceType) =>
    Promise<TargetType>;
export type SyncTransactionMethod<SourceType, TargetType> = (source: SourceType) =>
    TargetType;
export type AsyncDestructionMethod<SourceType, TargetType> = (source: SourceType, req: Request, res: Response) =>
    Promise<TargetType>;
export type SyncDestructionMethod<SourceType, TargetType> = (source: SourceType, req: Request, res: Response) =>
    TargetType;

/* combined types */
export type AsyncSyncTransactionMethod<SourceType, TargetType> =
    AsyncTransactionMethod<SourceType, TargetType> | SyncTransactionMethod<SourceType, TargetType>;
export type AsyncSyncDestructionMethod<SourceType, TargetType> =
    AsyncDestructionMethod<SourceType, TargetType> | SyncDestructionMethod<SourceType, TargetType>;
export type ScaffoldFactoryResult = <SourceType, TargetType extends ResponseType, ResponseType>(
    construct: AsyncSyncTransactionMethod<Request, SourceType | ErrorType>,
    callback: AsyncSyncTransactionMethod<SourceType, TargetType | ErrorType>,
    destruct?: AsyncSyncDestructionMethod<TargetType, ResponseType | ErrorType>,
    isMiddlewareCallback?: boolean, customSuccessCode?: number) => RequestHandler;
