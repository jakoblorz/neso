// tslint:disable-next-line:ordered-imports
import * as bodyParser from "body-parser";
import * as crypto from "crypto";
import { Request, Response } from "express";
import * as express from "express";
import * as morgan from "morgan";
import { module, NesoRouter } from "./";

const hash = (payload: string) => {
    const salt = crypto.randomBytes(Math.ceil(64 / 2)).toString("hex").slice(0, 64);
    return { salt, hash: crypto.createHmac("sha512", salt).update(payload).digest("hex") };
};

type CreatePasswordHashRequest = { username: string, password: string };
type CreatePasswordHashResponse = { hash: string, salt: string };

const PasswordHashFactory = module<CreatePasswordHashRequest, CreatePasswordHashResponse>(
    (data: any): data is CreatePasswordHashRequest =>
        "username" in data && data.username && "password" in data && data.password,
    (object: CreatePasswordHashRequest) => hash(object.password));

const router = new NesoRouter(undefined, [{ mime: "application/json", serializer: JSON.stringify }]);
router.create<CreatePasswordHashRequest, CreatePasswordHashResponse>("/", "", (req) =>
    ({ password: req.body.password, username: req.query.user }), PasswordHashFactory);

const expressRouter = router.build();
const app = express();
app.use(morgan("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use("/", expressRouter);
// tslint:disable-next-line:no-console
app.listen(8080, () => console.log("listening"));
