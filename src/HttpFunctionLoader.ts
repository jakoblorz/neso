import { NextFunction, Request, Response } from "express";

import { FormatError, ServerError } from "./HttpErrors";
import { sendStructuredData } from "./HttpToolkit";
import { CallbackGuardMethodType } from "./types/CallbackGuardMethodType";
import { CallbackOperationErrorType} from "./types/CallbackOperationErrorType";
import { CallbackOperationTransactionType } from "./types/CallbackOperationTransactionType";
import { CallbackOperationType } from "./types/CallbackOperationType";
import { MimeStringType} from "./types/MimeStringType";
import { MimeStringTypeSerializer } from "./types/MimeStringTypeSerializer";
import { MimeStringTypeSerializerAssociation} from "./types/MimeStringTypeSerializerAssociation";

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
    mime: MimeStringType = "application/json") => {

        // return a factory function which will select the correct serializer
        // for the return mime type
        return (serializers: MimeStringTypeSerializerAssociation[], invokeNextOnError: boolean = false) => {

            // select the correct serializer for the operation
            const serializer: MimeStringTypeSerializer = serializers
                .filter((s) => s.type === mime)[0].serializer ||
                ((data: any) => "");

            // return a callback which can be connected to a expressjs instance
            return async (request: any, req: Request, res: Response, next: NextFunction) => {

                // check if the request object follows the constraints
                // by invoking the guard method
                if (!guard(request)) {

                    // send a format error as the request constraints are not met
                    return sendStructuredData(FormatError, JSON.stringify, "application/json", FormatError.code, res);
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
                        sendStructuredData(response, JSON.stringify, "application/json", response.code, res);

                    // check if an error occured that was not handled yet
                    } else if (executionThrewError) {
                        sendStructuredData(ServerError, JSON.stringify, "application/json", ServerError.code, res);

                    // everything executed as expected
                    } else {
                        sendStructuredData(response, serializer, mime, type === "create" ? 201 : 200, res);
                    }
                }
            };
        };
    };
