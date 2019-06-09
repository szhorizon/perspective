/******************************************************************************
 *
 * Copyright (c) 2017, the Perspective Authors.
 *
 * This file is part of the Perspective library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */

const fs = require("fs");
const path = require("path");
const mkdirp = require("mkdirp");
const prettier = require("prettier");
const execSync = require("child_process").execSync;
const argv = require("minimist")(process.argv.slice(2));
const minimatch = require("minimatch");
const os = require("os");

const execute = cmd => execSync(cmd, {stdio: "inherit"});

/**
 * ASMJS Output Options
 */
const WEB_ASMJS_OPTIONS = {
    inputFile: "psp.asmjs.js",
    format: false,
    packageName: "perspective",
    build: !!argv.asmjs // should we build asm?
};

/**
 * WASM Output Options
 */
const WEB_WASM_OPTIONS = {
    inputFile: "psp.async.js",
    inputWasmFile: "psp.async.wasm",
    format: false,
    packageName: "perspective",
    build: !!argv.wasm // flag as to whether to build
};

/**
 * Node.JS Output Options
 */
const NODE_OPTIONS = {
    inputFile: "psp.sync.js",
    inputWasmFile: "psp.sync.wasm",
    format: false,
    packageName: "perspective",
    build: !!argv.node // flag as to whether to build the node version
};

/**
 * Filter for the runtimes we should build
 */
const AVAILABLE_RUNTIMES = [WEB_WASM_OPTIONS, NODE_OPTIONS];

if (!process.env.PSP_DEBUG) {
    AVAILABLE_RUNTIMES.push(WEB_ASMJS_OPTIONS);
}

// Select the runtimes - if no builds are specified then build everything
const RUNTIMES = AVAILABLE_RUNTIMES.filter(runtime => runtime.build).length ? AVAILABLE_RUNTIMES.filter(runtime => runtime.build) : AVAILABLE_RUNTIMES;

// Directory of Emscripten output
const getBaseDir = packageName => path.join(__dirname, "..", "cpp", packageName, "obj");
const getBuildDir = packageName => path.join(getBaseDir(packageName), "build");
const getOuputDir = packageName => path.join(__dirname, "..", "packages", packageName);

const templateSource = source => `
var window = window || {};

exports.load_perspective = function (Module) {
    ${source};
    return Module;
};`;

function compileRuntime({inputFile, inputWasmFile, format, packageName}) {
    console.log("-- Building %s", inputFile);

    const OUTPUT_DIRECTORY = getOuputDir(packageName);
    const BUILD_DIRECTORY = getBuildDir(packageName);

    mkdirp.sync(path.join(OUTPUT_DIRECTORY, "obj"));
    mkdirp.sync(path.join(OUTPUT_DIRECTORY, "build"));

    if (inputWasmFile) {
        console.log("-- Copying WASM file %s", inputWasmFile);
        fs.copyFileSync(path.join(BUILD_DIRECTORY, inputWasmFile), path.join(OUTPUT_DIRECTORY, "build", inputWasmFile));
    }

    console.debug("-- Creating wrapped js runtime");
    const runtimeText = String(
        fs.readFileSync(path.join(BUILD_DIRECTORY, inputFile), {
            encoding: "utf8"
        })
    );

    let source = templateSource(runtimeText);
    if (format) {
        console.debug("Formatting code");
        source = prettier.format(source, {
            printWidth: 200,
            tabWidth: 4,
            parser: "babylon"
        });
    }

    fs.writeFileSync(path.join(OUTPUT_DIRECTORY, "obj", inputFile), source);
}

function docker(image = "emsdk") {
    console.log("-- Creating emsdk docker image");
    let cmd = "docker run --rm -it";
    if (process.env.PSP_CPU_COUNT) {
        cmd += ` --cpus="${parseInt(process.env.PSP_CPU_COUNT)}.0"`;
    }
    cmd += ` -v ${process.cwd()}:/src -e PACKAGE=${process.env.PACKAGE} perspective/${image}`;
    return cmd;
}

function compileCPP(packageName) {
    const BASE_DIRECTORY = getBaseDir(packageName);
    let cmd = `emcmake cmake ../ `;
    if (process.env.PSP_DEBUG) {
        cmd += `-DCMAKE_BUILD_TYPE=debug`;
    }
    cmd += `&& emmake make -j${process.env.PSP_CPU_COUNT || os.cpus().length}`;
    if (process.env.PSP_DOCKER) {
        cmd = `${docker()} bash -c "cd cpp/${packageName}/obj && ${cmd}"`;
    } else {
        cmd = `cd ${BASE_DIRECTORY} && ${cmd}`;
    }
    execute(cmd);
}

function lerna() {
    let cmd = `lerna exec --loglevel silent `;
    if (process.env.PACKAGE) {
        cmd += `--scope=@finos/${process.env.PACKAGE} `;
    }
    cmd += ` -- yarn build`;
    execute(cmd);
}

try {
    if (!process.env.PACKAGE || minimatch("perspective", process.env.PACKAGE)) {
        mkdirp("cpp/perspective/obj");
        compileCPP("perspective");
        RUNTIMES.map(compileRuntime);
    }
    lerna();
} catch (e) {
    console.log(e.message);
    process.exit(1);
}
