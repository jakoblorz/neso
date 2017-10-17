import { Errors } from "./errors";
import { AsyncSyncTransactionMethod } from "./types";

/**
 * guard a callback which transforms a SourceType object into a TargetType object
 * @param guard callback to evaluate if the given object is a valid SourceType
 * @param callback callback which is being invoked only if the given object is a valid SourceType
 */
export const secure = <SourceType, TargetType>(
    guard: (object: any) => object is SourceType,
    callback: AsyncSyncTransactionMethod<SourceType, TargetType>,
): AsyncSyncTransactionMethod<SourceType, TargetType> => {

    // return a async callback which takes the source and calls
    // the callback only if the guard evaluates the source as valid
    // otherwise throw a FormatError which will be caught if this
    // callback is being hooked into the expressjs stack using the
    // scaffold function
    return async (source: SourceType): Promise<TargetType> => {

        // check if the source object is a valid SourceType object
        if (!guard(source)) {

            // source object is not valid - throw an FormatError
            throw Errors.FormatError;
        }

        // source object is a valid object - call the callback
        // and return its promise
        return callback(source);
    };
};
