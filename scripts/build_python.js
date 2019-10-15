/******************************************************************************
 *
 * Copyright (c) 2017, the Perspective Authors.
 *
 * This file is part of the Perspective library, distributed under the terms of
 * the Apache License 2.0.  The full license can be found in the LICENSE file.
 *
 */

const resolve = require("path").resolve;
const execSync = require("child_process").execSync;
const fs = require("fs-extra");
const mkdir = require("mkdirp");
const rimraf = require("rimraf");
const execute = cmd => execSync(cmd, {stdio: "inherit"});

const IS_DOCKER = process.env.PSP_DOCKER;

function docker(image = "emsdk") {
    console.log(`-- Creating ${image} docker image`);
    let cmd = "docker run --rm -it";
    if (process.env.PSP_CPU_COUNT) {
        cmd += ` --cpus="${parseInt(process.env.PSP_CPU_COUNT)}.0"`;
    }
    cmd += ` -v $(pwd):/usr/src/app/python/perspective -w /usr/src/app/python/perspective perspective/${image}`;
    return cmd;
}

try {
    // copy C++ assets
    console.log("Building perspective-python: copying C++ source to python folder");
    rimraf.sync(resolve(__dirname, "..", "python", "perspective", "obj")); // unused obj folder
    fs.copySync(resolve(__dirname, "..", "cpp", "perspective"), resolve(__dirname, "..", "python", "perspective"), {overwrite: true});

    mkdir(resolve(__dirname, "..", "python", "perspective", "cmake"));
    fs.copySync(resolve(__dirname, "..", "cmake"), resolve(__dirname, "..", "python", "perspective", "cmake"), {overwrite: true});

    let cmd;
    if (IS_DOCKER) {
        cmd = `cd python/perspective && python3 setup.py build`;
        execute(`${docker("python")} bash -c "${cmd}"`);
    } else {
        const python_path = resolve(__dirname, "..", "python", "perspective");
        cmd = `cd ${python_path} && python3 setup.py build`;
        execute(cmd);
    }
} catch (e) {
    console.log(e.message);
    process.exit(1);
}
