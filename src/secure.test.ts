import * as assert from "assert";
import * as mocha from "mocha";

import { Errors, isErrorType } from "./errors";
import { secure } from "./secure";

type Source = {};
type Target = {};

describe("secure.test.ts", () => {

    describe("secure()", () => {

        it("should build callback without errors", async () => {

            const callback = secure<Source, Target>(
                (source: Source): source is Source => true, (source: Source) => ({}));

            return;
        });

        it("should throw error when error is thrown in guard", async () => {

            const callback = secure<Source, Target>(
                (source: Source): source is Source => {
                    throw Errors.FormatError;
                },
                (source: Source) => ({}));

            try {
                await callback({});
                throw new Error("guard executed successfully");

            } catch (e) {
                if (isErrorType(e)) {
                    return;
                }

                throw new Error("not ErrorType error caught");
            }
        });

        it("should throw FormatError when guard evaluates to false", async () => {
            const callback = secure<Source, Target>(
                (source: Source): source is Source => false,
                (source: Source) => ({}));

            try {
                await callback({});
                throw new Error("callback is being called even if the guard evaluates to false");

            } catch (e) {
                if (isErrorType(e) && e.code === Errors.FormatError.code && e.status === Errors.FormatError.status) {
                    return;
                }

                throw new Error("not ErrorType / not FormatError caught");
            }
        });

        it("should throw error when error is thrown in callback", async () => {

            const callback = secure<Source, Target>(
                (source: Source): source is Source => true,
                (source: Source) => { throw Errors.FormatError; });

            try {
                await callback({});
                throw new Error("callback executed successfully");

            } catch (e) {
                if (isErrorType(e)) {
                    return;
                }

                throw new Error("not ErrorType error caught");
            }
        });

    });
});
