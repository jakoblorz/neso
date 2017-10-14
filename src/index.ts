import { NextFunction, Request, Response } from "express";

import { CallbackGuardMethodType } from "./types/CallbackGuardMethodType";
import { CallbackOperationErrorType } from "./types/CallbackOperationErrorType";
import { CallbackOperationTransactionType } from "./types/CallbackOperationTransactionType";
import { CallbackOperationType } from "./types/CallbackOperationType";
import { MimeStringType } from "./types/MimeStringType";
import { MimeStringTypeSerializer } from "./types/MimeStringTypeSerializer";
import { MimeStringTypeSerializerAssociation } from "./types/MimeStringTypeSerializerAssociation";
import { WrappedCallbackOperationType } from "./types/WrappedCallbackOperationType";

export const FormatError: CallbackOperationErrorType = { code: 400, status: "Format Error" };
export const NotFoundError: CallbackOperationErrorType = { code: 404, status: "Not Found Error" };
export const ForbiddenError: CallbackOperationErrorType = { code: 403, status: "Forbidden Error" };
export const ServerError: CallbackOperationErrorType = { code: 500, status: "Server Error" };

/**
 * respond to a request with custom data
 * @param serializer function to serialize the body into a string which will
 * be the actual http body
 * @param body data representation that will be serialized to be the http body
 * @param res expressjs response object
 * @param mime mime header
 * @param status statuscode number
 */
const sendStructuredData = (
    serializer: MimeStringTypeSerializer,
    body: any,
    res: Response,
    mime: MimeStringType,
    status: number) => {

        // set the content-type header to the mime type
        res.setHeader("Content-Type", mime + "; charset=utf-8");

        // respond with the serialized data after setting the
        // status code
        res.status(status).send(serializer(body));
};

/**
 * create a wrapped callback of a protected operation method
 * @param name unique method name within the project-wide scop
 * @param type specify the type of operation
 * @param guard configure a guard which protects the callback
 * from being invoked with undefined or wrong formatted values
 * @param callback function which will be invoked to execute the
 * actual operation
 * @param mime specify the mime type of the response
 */
export const createWrappedCallback = <RequestType extends {}, ResponseType>(
    name: string,
    type: CallbackOperationType,
    guard: CallbackGuardMethodType<RequestType>,
    callback: CallbackOperationTransactionType<RequestType, ResponseType>,
    mime: MimeStringType = "application/json"): WrappedCallbackOperationType => {

        // return a builder function which will select the correct serializer for the
        // return mime type
        return (serializers: MimeStringTypeSerializerAssociation[], invokeNextOnError: boolean = false) => {

            // select the correct serializer for the operation
            const serializer: MimeStringTypeSerializer = serializers
                .filter((s) => s.type === mime)[0].serializer ||
                ((data: any) => data.toString());

            // return a callback which can be connected to a expressjs instance
            return async (request: any, req: Request, res: Response, next: NextFunction) => {

                // check if the request object follows the constraints
                // by invoking the guard method
                if (!guard(request)) {

                    // send a format error as the request constraints are not met
                    return sendStructuredData((data: any) => JSON.stringify(data), FormatError,
                        res, "application/json", FormatError.code);
                }

                // prepare a response object which will hold the callback response
                // or any occuring error
                let response: ResponseType | CallbackOperationErrorType | any = ServerError;
                let executionThrewError: boolean = false; // indicates if an error was thrown

                try {

                    // execute and await the callback
                    // -> can throw an error which will be fetched in the
                    // try-catch-finally construct
                    response = await callback(request);

                } catch (e) {

                    // set executionThrewError flag and the response to the error
                    executionThrewError = true;
                    response = e;

                } finally {

                    // check if an error occured and the next method should be invoked
                    if (executionThrewError && invokeNextOnError) {
                        next(response);

                    // check if an error occured and the error object can be parsed as response
                    } else if (executionThrewError && "code" in response && "status" in response) {
                        sendStructuredData((data: any) => JSON.stringify(data), response,
                            res, "application/json", response.code);

                    // check if an error occured that was not handled yet
                    } else if (executionThrewError) {
                        sendStructuredData((data: any) => JSON.stringify(data), ServerError,
                            res, "application/json", ServerError.code);

                    // everything executed as expected
                    } else {
                        sendStructuredData(serializer, response, res, mime, type === "create" ? 201 : 200);
                    }
                }
            };
        };
    };
