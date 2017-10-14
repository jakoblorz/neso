import { NextFunction, Request, Response } from "express";
import { MimeStringTypeSerializerAssociation } from "./MimeStringTypeSerializerAssociation";
export type WrappedCallbackOperationType = (
    serializers: MimeStringTypeSerializerAssociation[],
    invokeNextOnError: boolean) =>
        (request: any, req: Request, res: Response, next: NextFunction) => void;
