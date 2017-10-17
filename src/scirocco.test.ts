import * as assert from "assert";
import * as mocha from "mocha";
import * as sci from "./scirocco";

describe("isErrorType()", () => {

    it("should correctly identify as error", async () => {
        assert.equal(await sci.isErrorType({ code: 200, status: "Success"}), true);
    });

    it("should correctly identify not as an error", async () => {
        assert.equal(await sci.isErrorType("{ code: 200, status: 'Success' }"), false);
        assert.equal(await sci.isErrorType(200), false);
        assert.equal(await sci.isErrorType({ code: "Success", status: 200 }), false);
    });
});

type Source = {};
type Target = {};

describe("guard()", () => {

    it("should build callback without errors", async () => {

        const callback = sci.guard<Source, Target>(
            (source: Source): source is Source => true, (source: Source) => ({}));

        return;
    });

    it("should throw error when error is thrown in guard", async () => {

        const callback = sci.guard<Source, Target>(
            (source: Source): source is Source => {
                throw sci.Errors.FormatError;
            },
            (source: Source) => ({}));

        try {
            await callback({});
            throw new Error("guard executed successfully");

        } catch (e) {
            if (sci.isErrorType(e)) {
                return;
            }

            throw new Error("not ErrorType error caught");
        }
    });

    it("should throw FormatError when guard evaluates to false", async () => {
        const callback = sci.guard<Source, Target>(
            (source: Source): source is Source => false,
            (source: Source) => ({}));

        try {
            await callback({});
            throw new Error("callback is being called even if the guard evaluates to false");

        } catch (e) {

            const isValid = sci.isErrorType(e) &&
                e.code === sci.Errors.FormatError.code &&
                e.status === sci.Errors.FormatError.status;

            if (isValid) {
                return;
            }

            throw new Error("not ErrorType / not FormatError caught");
        }
    });

    it("should throw error when error is thrown in callback", async () => {

        const callback = sci.guard<Source, Target>(
            (source: Source): source is Source => true,
            (source: Source) => { throw sci.Errors.FormatError; });

        try {
            await callback({});
            throw new Error("callback executed successfully");

        } catch (e) {
            if (sci.isErrorType(e)) {
                return;
            }

            throw new Error("not ErrorType error caught");
        }
    });

    it("should return result if no errors occured", async () => {
        const callback = sci.guard<Source, { success: boolean }>(
            (source: Source): source is Source => true,
            (source: Source) => ({ success: true }));

        const result = await callback({});
        const isValid = typeof result === "object" &&
            "success" in result &&
            (result as { success: boolean }).success === true;
        assert.equal(isValid, true);
    });

});
