#! /usr/bin/env node

/**
 * MIT License
 *
 * Copyright (c) 2017 Jakob Lorz
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */

import * as chalkDep from "chalk";
import * as cluster from "cluster";
import * as express from "express";
import * as http from "http";
import { IncomingMessage, ServerResponse } from "http";
import * as os from "os";
import * as path from "path";
import { IWrappedErrorHandler, IWrappedHandler, IWrappedRequestHandler, IWrappedRouter } from "../src/scirocco";
import { createApplication, IWrappedErrorHandlerGuard, IWrappedRequestHandlerGuard,
    IWrappedRouterGuard } from "../src/scirocco";

const chalk = chalkDep.default;

/**
 * added spaces to all strings that are shorted than the longest one
 * to make them even
 * @param strings list of strings that should be made even
 */
const spaceStringEven = (strings: string[]): string[] => {
    const maxLength = strings.reduce((max, s) => s.length > max ? s.length : max, 0);
    return strings.map((s) => s +
        ((l: number) => new Array(maxLength - l + 1).join(" "))(s.length));
};

/**
 * list all handlers that got hooked to the AppWrapper
 * @param handlerList list of all imported handlers
 * @param file path to the imported file
 */
const printHandlers = (handlerList: IWrappedHandler[], file: string): void => {

    /**
     * recurse over the list of handlers and log all of them to the console
     * @param handlers list of all imported handlers on the current layer
     * @param generalOffset offset of spaces to write handler to
     */
    const printHandlersResolvingCascading = (handlers: IWrappedHandler[], generalOffset: number = 0): void => {

        // event the length differences between the strings of name, method and url
        const names = spaceStringEven(handlers.map((h) => h.name));
        const methods = spaceStringEven(handlers.map((h) => h.method));
        const urls = spaceStringEven(handlers.map((h) => h.url));

        const lightHandlers = handlers.map((h, i) => ({ description: h.description, handler: h.handler,
            method: methods[i].toUpperCase(), name: names[i], url: urls[i] }));

        for (const handler of lightHandlers) {

            // detect if this handler is a router
            const isRouter = handler.handler instanceof Array;

            // logging handlers will require the text to be offseted x-wise
            const xOffsetText = new Array(generalOffset + 1).join(" ");

            // depending wether the current handler is a router, the url text should look
            // differently: either with http-method or with replacement (RTER)
            const xUrlText = isRouter ?
                " [" + chalk.red("RTER") + " " + chalk.blueBright(handler.url) + "]: " :
                " [" + chalk.red(handler.method.toUpperCase()) + " " + chalk.blueBright(handler.url) + "]: ";

            // the line start (tick-mark) is different depending wether the current
            // handler is a router or not: - vs >. The handler name should look different also.
            const xTickMark = chalk.greenBright(isRouter ? " > " : " - ");
            const xHandlerName = isRouter ? chalk.green(handler.name) : chalk.greenBright(handler.name);

            // in router mode, add a new line without any text for better readablity
            if (isRouter) {

                console.log("");
            }

            console.log(xOffsetText + xTickMark + xHandlerName + xUrlText + handler.description);

            // recursion-call only if this handler is a router which introduces
            // a new layer of handlers
            if (isRouter) {
                printHandlersResolvingCascading(handler.handler as IWrappedHandler[], generalOffset + 5);
            }
        }
    };

    // write the import-header
    console.log(chalk.greenBright("> Importer") + "[" +
        chalk.blueBright(file) + "] found handlers (total of " +
        chalk.blueBright(handlerList.length + "") + " on root level)");

    // write all found handlers to the console, offsetted by their respective layer
    printHandlersResolvingCascading(handlerList, 5);

    // add to spaces the split sections
    console.log("");
    console.log("");
};

/**
 * import a AppWrapper instance and check its validity
 * @param link path to the import file
 */
const importAppWrapperFileFromRelativePath = (link: string): IWrappedHandler[] => {

    // import the file to access the exported objects
    const file = require(path.join(process.cwd(), link));

    // the file should only export one key
    if (Object.keys(file).length < 1 ) {
        throw Error("import error: file " + file + " does not export any key");
    }
    if (Object.keys(file).length > 1) {
        throw Error("import error: file " + file + " exports more than one key - specify!");
    }

    // find the export-key and extract the value of it
    const exportKey = Object.keys(file).filter((k, i) => i === 0)[0];
    const wrapper = file[exportKey];

    // check if the extracted value (wrapper) is a valid AppWrapper object
    if (!("handler" in wrapper) || !("name" in wrapper) || !("handler" in wrapper && "name" in wrapper)) {
        throw Error("import error: exported object is not a valid AppWrapper");
    }

    // select all handler present in the handler array in the AppWrapper object
    // which satifies either RequestHandler, ErrorHandler or Router constraints
    return (wrapper.handler as any[]).filter((h) =>
        IWrappedRequestHandlerGuard(h) || IWrappedErrorHandlerGuard(h) || IWrappedRouterGuard(h)) as
            IWrappedHandler[];
};

/**
 * print the hermelin logo to the console
 */
const printLogo = () => {
    console.log("");
    console.log(chalk.blueBright("┌─┐┌─┐┬┬─┐┌─┐┌─┐┌─┐┌─┐"));
    console.log(chalk.blueBright("└─┐│  │├┬┘│ ││  │  │ │"));
    console.log(chalk.blueBright("└─┘└─┘┴┴└─└─┘└─┘└─┘└─┘"));
    console.log("");
};

// tslint:disable-next-line:no-var-requires
const vorpal = require("vorpal")();

vorpal.command("list <path>", "list all handlers found in the file")
    .action((args: any) => {

        // import all handlers from the given file
        const handlers = importAppWrapperFileFromRelativePath(args.path);
        printLogo();
        printHandlers(handlers, args.path);
    });

vorpal.command("start <path>", "build a expressjs app from the file and start it")
    .option("-v, --verbose", "log found handlers to the console")
    .option("-p, --port <number>", "use custom port number - default is 8080")
    .option("-h, --hostname <name>", "specify the hostname to listen to - default is localhost")
    .option("-c, --cluster [number]", "start the app in cluster mode / specify the number of workers - default is 1")
    .option("-f, --force", "restart workers if they exit")
    .action((args: any) => {

        // parse the port, hostname and import all handlers from the given file
        const port = parseInt(args.options.port, 10) || args.options.port || 8080;
        const hostname = args.options.hostname || "localhost";
        const handlers = importAppWrapperFileFromRelativePath(args.path);

        // prepare worker/master text beginnings
        const xWorkerTextIdent = (state: "run" | "dead") => state === "run" ?
            chalk.greenBright(new Array(5 + 1).join(" ") + " - Worker") + "[" +
                chalk.blueBright(process.pid + "") + "]" :
            chalk.redBright(new Array(5 + 1).join(" ") + " - Worker") + "[" +
                chalk.blueBright(process.pid + "") + "]";
        const xMasterTextIdent = (state: "run" | "dead") => state === "run" ?
            chalk.greenBright("> Master") + "[" +
                chalk.blueBright(process.pid + "") + "]" :
            chalk.redBright("> Master") + "[" +
                chalk.blueBright(process.pid + "") + "]";

        if (cluster.isMaster) {

            // print logo if this process is a master process, e.g. the user console process
            printLogo();

            // print the handlers if the verbose switch is set
            if (args.options.verbose) {
                printHandlers(handlers, args.path);
            }

            // decide which amount of workers are required
            let workerCount = os.cpus().length;
            if (!args.options.cluster) {
                workerCount = 1;
            } else if (typeof args.options.cluster === "number") {
                workerCount = args.options.cluster;
            }

            // create a cluster master setting
            // -> invoke this cli with the necessary arguments
            cluster.setupMaster({
                args: ["start " + args.path + " -p " + port + " -h " + hostname],
                exec: __filename,
                silent: false,
            });

            // notify user that the master is set up
            console.log(xMasterTextIdent("run") + " is running (planning " +
                chalk.blueBright(workerCount + "") + " workers)");

            // create cluster forks (spawn worker processes)
            for (let i = 0; i < workerCount; i++) {
                cluster.fork();
            }

            // set an event-handler to detect if a worker exited
            // and (depending on the force switch) if the exited
            // worker needs restarting
            cluster.on("exit", (worker, code, signal) => {

                // notify the user that a worker exited
                console.log(xWorkerTextIdent("dead") + " stopped running");

                // spawn a new worker process if the force switch
                // is set
                if (args.options.force) {
                    cluster.fork();
                }
            });
        }

        // create the server instance only if this process is a worker process
        if (cluster.isWorker) {

            // build a expressjs worker-app
            const worker = createApplication(handlers, express());

            // start the http server from the generated expressjs instance
            worker.listen(port, hostname, () => {
                console.log(xWorkerTextIdent("run") + " is running");
            });
        }
    });

vorpal.delimiter("")
    .parse(process.argv);
