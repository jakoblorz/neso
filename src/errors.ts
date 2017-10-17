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
