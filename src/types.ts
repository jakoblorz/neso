import { NextFunction, Request, RequestHandler, Response } from "express";

export interface IError {
    code: number;
    status: string;
}

export type SupportedMimeType =
    "application/json" |
    "application/javascript" |
    "text/plain" |
    "text/html" |
    "text/css" |
    "text/csv";

export type Serializer<SourceType> = (object: SourceType) => string;
export interface IMimeSerializer<SourceType> {
    serializer: Serializer<SourceType>;
    mime: SupportedMimeType;
}

export type GuardCallback<TargetType> = (object: TargetType | any) => object is TargetType;

export type TransactionCallback<SourceType, TargetType> = (object: SourceType) =>
    TargetType | Promise<TargetType> | IError | Promise<IError> | Promise<TargetType | IError>;

export type TransactionCallbackMethod = "create" | "read" | "update" | "delete";
export type TransactionCallbackType = "middleware" | "endpoint";

export type SourceTransactionCallback<SourceType, TargetType> =
    (data: SourceType, req: Request, res: Response, next: NextFunction) => Promise<TargetType> | TargetType | null;

export type SourceTransactionCallbackFactory<SourceType, TargetType> = (serializer: Array<IMimeSerializer<any>>,
    // tslint:disable-next-line:align
    method: TransactionCallbackMethod | "all", type: TransactionCallbackType, invokeNextOnError: boolean) =>
        SourceTransactionCallback<SourceType, TargetType>;

export type SourceTypeConstructor<SourceType> = (req: Request) => Promise<SourceType> | SourceType;
export type TargetTypeDestructor<TargetType> = (response: TargetType, req: Request) => Promise<null> | null;

export interface ITransactionCallbackAlias {
    method: TransactionCallbackMethod | "all";
    type: TransactionCallbackType;
    name: string;
    url: string;
    callback: RequestHandler;
}