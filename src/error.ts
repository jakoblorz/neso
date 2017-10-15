import { IError } from "./types";

/* error definitions */
export const FormatError: IError = { code: 400, status: "Format Error" };
export const UnauthorizedError: IError = { code: 401, status: "Unauthorized Error" };
export const ForbiddenError: IError = { code: 403, status: "Forbidden Error" };
export const NotFoundError: IError = { code: 404, status: "Not Found Error" };
export const ServerError: IError = { code: 500, status: "Server Error" };
