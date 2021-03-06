"use strict";

import * as assert from "assert";
import { binaryRead } from "../binaryReader";
import * as path from "path";
import { Casl2 } from "../../src/casl2";
import * as fs from "fs";
import { Writer } from "../binaryWriter";
import * as _ from "lodash";

const defaultCompiler = new Casl2();

function compile(casFilePath: string, compiler?: Casl2) {
    const compilerToUse = compiler || defaultCompiler;

    const result = compilerToUse.compile(casFilePath);

    if (!result.success) {
        console.error("errors in " + casFilePath);
        result.diagnostics.forEach(x => console.log(x.toString()));
    }

    assert(result.success);

    const { hexes } = result;
    return hexes!;
}

export function binaryTest(casFilePath: string, comFilePath: string, compiler?: Casl2) {
    const expected = binaryRead(comFilePath);
    const actual = compile(casFilePath, compiler);

    if (!_.isEqual(actual, expected)) {
        console.log(casFilePath);
    }

    const actualChunks = _.chunk(actual, 8);
    const expectedChunks = _.chunk(expected, 8);
    for (let i = 0; i < actualChunks.length; i++) {
        const eChunk = expectedChunks[i];
        const aChunk = actualChunks[i];

        if (!_.isEqual(eChunk, aChunk)) {
            console.log("Line " + i);
            console.log(eChunk);
            console.log(aChunk);
        }

        assert.deepEqual(aChunk, eChunk);
    }
}

function dirTest(dir: string, compiler?: Casl2) {
    const folder = path.join("./test/testdata/", dir);
    const files = fs.readdirSync(folder);
    const casFiles = files.filter(x => x.match(/.*\.cas$/));

    for (const casFile of casFiles) {
        const casFilePath = path.join(folder, casFile);

        const comFile = casFile.replace(".cas", ".com");
        const comFilePath = path.join(folder, comFile);

        binaryTest(casFilePath, comFilePath, compiler);
    }
}

suite("binary test", () => {
    test("ds test", () => {
        dirTest("ds");
    });

    test("func test", () => {
        const compiler = new Casl2({
            enableLabelScope: true,
            allowNegativeValueForEffectiveAddress: true
        });

        dirTest("func", compiler);
    });

    test("in test", () => {
        dirTest("in");
    });

    test("mix test", () => {
        dirTest("mix");
    });

    test("other test", () => {
        dirTest("other");
    });

    test("out test", () => {
        dirTest("out");
    });

    test("rpop test", () => {
        dirTest("rpop");
    });

    test("rpush test", () => {
        dirTest("rpush");
    });

    test("start test", () => {
        dirTest("start");
    });

    test("programs test", () => {
        const compiler = new Casl2({
            useGR8: true,
            enableLabelScope: true,
            allowNegativeValueForEffectiveAddress: true
        });

        dirTest("programs", compiler);
    });
});
