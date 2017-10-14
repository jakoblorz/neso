import { CallbackOperationErrorType } from "./types/CallbackOperationErrorType";

export const FormatError: CallbackOperationErrorType = { code: 400, status: "Format Error" };
export const NotFoundError: CallbackOperationErrorType = { code: 404, status: "Not Found Error" };
export const ForbiddenError: CallbackOperationErrorType = { code: 403, status: "Forbidden Error" };
export const ServerError: CallbackOperationErrorType = { code: 500, status: "Server Error" };
