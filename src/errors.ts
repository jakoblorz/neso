import { ErrorType } from "./types";

// tslint:disable-next-line:no-namespace
export namespace Errors {
    /* error definitions */
    export const FormatError: ErrorType = { code: 400, status: "Format Error" };
    export const UnauthorizedError: ErrorType = { code: 401, status: "Unauthorized Error" };
    export const ForbiddenError: ErrorType = { code: 403, status: "Forbidden Error" };
    export const NotFoundError: ErrorType = { code: 404, status: "Not Found Error" };
    export const ServerError: ErrorType = { code: 500, status: "Server Error" };
}

/**
 * check if the given object is a object containing the ErrorType
 * keys with the correct types
 * @param test object to test
 */
export const isErrorType = (test: any): test is ErrorType =>
    typeof test === "object" &&
    "status" in test && typeof test.status === "string" &&
    "code" in test && typeof test.code === "number";
