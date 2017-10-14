import { NextFunction, Request, Response } from "express";
import { MimeType } from "./MimeType";

/* type aliases */
export type LowHttpError = { code: number, status: string };
export type MimeType = MimeType;
export type LowHttpSerializer<X> = (object: X) => string;
export type LowHttpSerializerMimeTuple<X> = { serializer: LowHttpSerializer<X>, mime: MimeType };
export type LowHttpGuardMethod<X> = (object: X) => object is X;
export type LowHttpCallback<X, Y> = (object: X) => Y | Promise<Y> |
    LowHttpError | Promise<LowHttpError> | Promise<Y | LowHttpError>;
export type LowHttpCallbackType = "create" | "read" | "update" | "delete" | "exist";

/* error definitions */
export const FormatError: LowHttpError = { code: 400, status: "Format Error" };
export const UnauthorizedError: LowHttpError = { code: 401, status: "Unauthorized Error" };
export const ForbiddenError: LowHttpError = { code: 403, status: "Forbidden Error" };
export const NotFoundError: LowHttpError = { code: 404, status: "Not Found Error" };
export const ServerError: LowHttpError = { code: 500, status: "Server Error" };

export const send = <X>(
    body: X, serializer: LowHttpSerializer<X>,
    mime: MimeType, status: number, res: Response) => {

    res.setHeader("Content-Type", mime + "; charset=utf-8");
    res.status(status).send(serializer(body));
};

export const wrap = <RequestType extends {}, ResponseType>(
    guard: LowHttpGuardMethod<RequestType>, callback: LowHttpCallback<RequestType, ResponseType>,
    mime: MimeType = "application/json") => {

    return (serializers: Array<LowHttpSerializerMimeTuple<any>>, type: LowHttpCallbackType,
            invokeNextOnError: boolean = false) => {

            const serializer: LowHttpSerializer<ResponseType> = serializers
                .filter((s) => s.mime === mime)[0].serializer || JSON.stringify;

            return async (object: any, req: Request, res: Response, next: NextFunction) => {

                if (!guard(object)) {
                    return send(FormatError, JSON.stringify, "application/json", FormatError.code, res);
                }

                let response: ResponseType | LowHttpError | any = ServerError;
                let executionThrewError: boolean = false;

                try {
                    response = await callback(object);
                } catch (e) {
                    executionThrewError = true;
                    response = e;
                } finally {
                    if (executionThrewError && invokeNextOnError) {
                        next(response);
                    } else if (executionThrewError && "code" in response && "status" in response) {
                        send(response, JSON.stringify, "application/json", response.code, res);
                    } else if (executionThrewError) {
                        send(ServerError, JSON.stringify, "application/json", ServerError.code, res);
                    } else {
                        send(response, serializer, mime, type === "create" ? 201 : 200, res);
                    }
                }
            };
    };
};
