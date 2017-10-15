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
export type LowHttpCallbackFactory =
    (serializers: Array<LowHttpSerializerMimeTuple<any>>, type: LowHttpCallbackType, invokeNextOnError: boolean) =>
        (object: any, req: Request, res: Response, next: NextFunction) => void;
export type LowHttpRequestBuilder<X> = (req: Request) => X;
export type LowHttpExpressJSCallback = (req: Request, res: Response, next: NextFunction) => void;
export type LowHttpCallbackAlias =
    { callback: LowHttpExpressJSCallback, name: string, url: string, type: LowHttpCallbackType };

/* error definitions */
export const FormatError: LowHttpError = { code: 400, status: "Format Error" };
export const UnauthorizedError: LowHttpError = { code: 401, status: "Unauthorized Error" };
export const ForbiddenError: LowHttpError = { code: 403, status: "Forbidden Error" };
export const NotFoundError: LowHttpError = { code: 404, status: "Not Found Error" };
export const ServerError: LowHttpError = { code: 500, status: "Server Error" };

/**
 * respond to a http request
 * @param body body object that needs to be serialized
 * @param serializer function to serialize the body type
 * @param mime body's mime type string
 * @param status http status code as number
 * @param res expressjs response object
 */
export const send = <X>(
    body: X, serializer: LowHttpSerializer<X>,
    mime: MimeType, status: number, res: Response) => {

    res.setHeader("Content-Type", mime + "; charset=utf-8");
    res.status(status).send(serializer(body));
};

/**
 * create a wrapped and guarded callback
 * @param guard function to validate that the request object is one of
 * type RequestType
 * @param callback function that will be invoked with the request object,
 * can return ResponseType, LowHttpError or both as promise
 * @param mime signal which mime type will be used
 */
export const wrap = <RequestType extends {}, ResponseType>(
    guard: LowHttpGuardMethod<RequestType>, callback: LowHttpCallback<RequestType, ResponseType>,
    mime: MimeType = "application/json"): LowHttpCallbackFactory => {

        // return a factory function which will select the correct serializer
        return (serializers: Array<LowHttpSerializerMimeTuple<any>>, type: LowHttpCallbackType,
                invokeNextOnError: boolean = false) => {

                    // select the correct serializer for the mime string, default is
                    // JSON.stringify()
                    const serializer: LowHttpSerializer<ResponseType> = serializers
                        .filter((s) => s.mime === mime)[0].serializer || JSON.stringify;

                    // result of the factory function is a expressjs styled handler
                    return async (object: any, req: Request, res: Response, next: NextFunction) => {

                        // check if the recieved request object contains the required keys
                        if (!guard(object)) {

                            // request does not contain the necessary keys, respond with a JSON-encoded
                            // Format Error
                            return send(FormatError, JSON.stringify, "application/json", FormatError.code, res);
                        }

                        // prepare a response object which will default to a ServerError (http error code: 500);
                        // prepare a error flag
                        let response: ResponseType | LowHttpError | any = ServerError;
                        let executionThrewError: boolean = false;

                        try {
                            // invoke the callback and wait for the result
                            response = await callback(object);

                        } catch (e) {
                            // catch possible errors during callback execution
                            // error will be set as the response while also setting
                            // the error flag to true
                            executionThrewError = true;
                            response = e;

                        }

                        // if an error occured and next-callback should be invoked,
                        // do it right here
                        if (executionThrewError && invokeNextOnError) {
                            return next(response);
                        }

                        // if an error occured and the response object (which is the error object
                        // in this case), contains the code and status key, the error is expected
                        // the been thrown on purpose, following the LowHttpError Type
                        // (like throw NotFoundError) - encode the error as JSON in this case
                        // and respond with it
                        if (executionThrewError && "code" in response && "status" in response) {
                            return send(response, JSON.stringify, "application/json", response.code, res);
                        }

                        // if an error occured and was not processed yet, the error must be something
                        // more concerning - respond with an JSON encoded general ServerError (http error code: 500)
                        if (executionThrewError) {
                            return send(ServerError, JSON.stringify, "application/json", ServerError.code, res);
                        }

                        // no error occured, respond with the response, using the selected serializer,
                        // the correct http status code and the correct mime type
                        return send(response, serializer, mime, type === "create" ? 201 : 200, res);
                    };
        };
};

/**
 * wrap the callback factory from the wrap() function into an expressjs callback
 * @param type specify the type of operation that will be executed
 * @param build provide a callback which will loosely collect all necessary data
 * from the express request object required for the operation
 * @param callback operation callback factory
 * @param serializers all loaded serializers that can be used
 * @param invokeNextOnError flag to change call flow - true will invoke the next
 * callback if an error occured instead of responding with the error or a custom
 * server error. The next function will be invoked with the error as argument
 */
export const express = <RequestType>(
    type: LowHttpCallbackType,
    build: LowHttpRequestBuilder<RequestType>,
    callback: LowHttpCallbackFactory,
    serializers: Array<LowHttpSerializerMimeTuple<any>>,
    invokeNextOnError: boolean = false): LowHttpExpressJSCallback => {

        // invoke the factory to build the operation callback
        const operation = callback(serializers, type, invokeNextOnError);

        // return an expressjs callback, which build the request object
        // losely and then invokes the operation callback with this req
        // object
        return async (req: Request, res: Response, next: NextFunction) =>
            await operation(build(req), req, res, next);
    };

/**
 * create a alias representation of a single expressjs callback
 * @param type specify the type of operation
 * @param name provide a unique name for this operation
 * @param url specify the unique expressjs url for this operation
 * @param callback expressjs callback
 */
export const alias = <RequestType>(
    type: LowHttpCallbackType,
    name: string,
    url: string,
    callback: LowHttpExpressJSCallback): LowHttpCallbackAlias =>
        ({ name, callback, url, type });
