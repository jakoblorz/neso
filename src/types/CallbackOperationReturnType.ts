import { CallbackOperationErrorType } from "./CallbackOperationErrorType";
export type CallbackOperationReturnType<B> = B | CallbackOperationErrorType | Promise<B> |
Promise<CallbackOperationErrorType> | Promise<B | CallbackOperationErrorType>;
