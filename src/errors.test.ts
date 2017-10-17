import * as assert from "assert";
import * as mocha from "mocha";

import { isErrorType } from "./errors";

describe("errors.test.ts", () => {

    describe("isErrorType()", () => {

        it("should correctly identify as error", async () => {
            assert.equal(await isErrorType({ code: 200, status: "Success"}), true);
        });

        it("should correctly identify not as an error", async () => {
            assert.equal(await isErrorType("{ code: 200, status: 'Success' }"), false);
            assert.equal(await isErrorType(200), false);
            assert.equal(await isErrorType({ code: "Success", status: 200 }), false);
        });
    });
});
