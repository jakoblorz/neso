import { CallbackOperationReturnType } from "./CallbackOperationReturnType";
export type CallbackOperationTransactionType<A, B> = (request: A) => CallbackOperationReturnType<B>;
