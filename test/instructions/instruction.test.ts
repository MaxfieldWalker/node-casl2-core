"use strict";

import { Lexer } from "../../src/casl2/lexer";
import { LexerResult } from "../../src/casl2/lexerResult";
import { InstructionBase } from "../../src/instructions/instructionBase";
import { Instructions } from "../../src/instructions/instructions";
import { CompileError } from "../../src/errors/compileError";
import { LabelMap } from "../../src/data/labelMap";
import { Casl2 } from "../../src/casl2";
import * as assert from "assert";

suite("Instruction test", () => {

    // START命令
    test("START test", () => {
        let line = "CASL START";
        let result = Lexer.tokenize(line, 1) as LexerResult;

        let instruction = Instructions.create(result, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert(instruction.toHex().length == 0);

        line = "CASL START    BEGIN";
        result = Lexer.tokenize(line, 1) as LexerResult;

        instruction = Instructions.create(result, 1);
        if (instruction instanceof CompileError) throw new Error();

        // アドレス解決をする
        const map = new LabelMap([["BEGIN", 0x03]]);
        map.bindAdd("CASL", "BEGIN");
        instruction.resolveAddress(map);

        assert.equal(map.get("CASL") as number, 0x03);
    });

    // END命令
    test("END test", () => {
        // 引数なしパターン
        const line = "END"
        const instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert(instruction.toHex().length == 0);
    });

    // DS命令
    test("DS test", () => {
        // ラベル無し
        let line = "DS  3";
        let ds = Instructions.createDS(Lexer.tokenize(line, 1) as LexerResult, 1) as Array<InstructionBase>;
        assert(ds.length == 3);
        assert(ds[0].instructionName == "NOP" && ds[0].label == undefined);
        assert(ds[1].instructionName == "NOP" && ds[1].label == undefined);
        assert(ds[2].instructionName == "NOP" && ds[2].label == undefined);

        // ラベル有り
        line = "CONST DS 3";
        ds = Instructions.createDS(Lexer.tokenize(line, 1) as LexerResult, 1) as Array<InstructionBase>;
        assert(ds.length == 3);
        assert(ds[0].instructionName == "NOP" && ds[0].label == "CONST");
        assert(ds[1].instructionName == "NOP" && ds[1].label == undefined);
        assert(ds[2].instructionName == "NOP" && ds[2].label == undefined);

        // 語数0(ラベル無し)
        // 領域は確保されず何もしないのと同じ
        line = "DS 0";
        const olbl = Instructions.createDS(Lexer.tokenize(line, 1) as LexerResult, 1) as InstructionBase;
        assert(olbl.toHex().length == 0);

        // 語数0(ラベル有り)
        // 語数0でもラベルは有効である
        const lines = [
            "CASL    START",
            "        LAD     GR1, 2",
            "        ST      GR1, L1",  // L1とL2は同じ番地を指すはず
            "        LD      GR2, L2",
            "        ADDA    GR1, GR2",
            "        RET",
            "L1      DS      0",
            "L2      DS      1",
            "        END"
        ];

        const casl2 = new Casl2();
        const result = casl2.compile(lines);

        const st = result.instructions[2];
        const ld = result.instructions[3];
        assert(st.address as number == ld.address as number);
    });

    // DC命令
    test("DC test", () => {
        // 10進定数
        let line = "DC  3";
        let dc = Instructions.createDC(Lexer.tokenize(line, 1) as LexerResult, 1) as InstructionBase;
        assert.deepEqual(dc.toHex(), [0x0003]);

        // 16進定数
        line = "DC #00AB";
        dc = Instructions.createDC(Lexer.tokenize(line, 1) as LexerResult, 1) as InstructionBase;
        assert.deepEqual(dc.toHex(), [0x00AB]);

        // 文字列定数(1文字)
        line = "DC 'A'";
        let mdcs = Instructions.createDC(Lexer.tokenize(line, 1) as LexerResult, 1) as Array<InstructionBase>;
        assert(mdcs.length == 1);
        // 'A'のアスキーコードは0x41である
        assert.deepEqual(mdcs[0].toHex(), [0x0041]);

        // 文字列定数(2文字以上)
        line = "DC 'ABC'"
        mdcs = Instructions.createDC(Lexer.tokenize(line, 1) as LexerResult, 1) as Array<InstructionBase>;
        assert(mdcs.length == 3);
        assert.deepEqual(mdcs[0].toHex(), [0x0041]);
        assert.deepEqual(mdcs[1].toHex(), [0x0042]);
        assert.deepEqual(mdcs[2].toHex(), [0x0043]);

        // ラベル
        line = "DC L0";
        dc = Instructions.createDC(Lexer.tokenize(line, 1) as LexerResult, 1) as InstructionBase;
        // アドレス解決をする
        const map = new LabelMap([["L0", 0x0002]]);
        dc.resolveAddress(map);
        assert.deepEqual(dc.toHex(), [0x0002]);
    });

    test("IN test", () => {
        const line = "IN BUF, LEN";
        const instruction = Instructions.createIN(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        const labelMap = new LabelMap();
        labelMap.add("BUF", 0x0008);
        labelMap.add("LEN", 0x0050);
        instruction.resolveAddress(labelMap);

        assert.deepEqual(instruction.toHex(), [0x9000, 0x0008, 0x0050]);
    });

    test("OUT test", () => {
        const line = "OUT BUF, LEN";
        const instruction = Instructions.createOUT(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        const labelMap = new LabelMap();
        labelMap.add("BUF", 0x0008);
        labelMap.add("LEN", 0x0050);
        instruction.resolveAddress(labelMap);

        assert.deepEqual(instruction.toHex(), [0x9100, 0x0008, 0x0050]);
    });

    // RPUSH命令
    test("RPUSH test", () => {
        const line = "RPUSH";
        const instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0xA000]);
    })

    // RPOP命令
    test("RPOP test", () => {
        const line = "RPOP";
        const instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0xA100]);
    })

    // LD命令
    test("LD test", () => {
        // r1, r2パターン
        let line = "LD GR1, GR2";
        let instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error(instruction.message);

        assert.deepEqual(instruction.toHex(), [0x1412]);

        // r1, adrパターン
        line = "LD GR1, 5"
        instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error(instruction.message);

        assert.deepEqual(instruction.toHex(), [0x1010, 0x0005]);

        // r1, adr, xパターン
        line = "LD GR1, 5, GR2"
        instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x1012, 0x0005]);
    });

    // ST命令
    test("ST test", () => {
        // r1, adrパターン
        let line = "ST GR1, 5"
        let instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x1110, 0x0005]);

        // r1, adr, xパターン
        line = "ST GR1, 5, GR2"
        instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x1112, 0x0005]);
    });

    // LAD命令
    test("LAD test", () => {
        // r1, adrパターン
        let line = "LAD GR1, 5"
        let instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x1210, 0x0005]);

        // r1, adr, xパターン
        line = "LAD GR1, 5, GR2"
        instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x1212, 0x0005]);
    });

    // ADDA命令
    test("ADDA test", () => {
        // r1, r2パターン
        let line = "ADDA GR1, GR2";
        let instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x2412]);

        // r1, adrパターン
        line = "ADDA GR1, 5"
        instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x2010, 0x0005]);

        // r1, adr, xパターン
        line = "ADDA GR1, 5, GR2"
        instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x2012, 0x0005]);
    });

    // ADDL命令
    test("ADDL test", () => {
        // r1, r2パターン
        let line = "ADDL GR1, GR2";
        let instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x2612]);

        // r1, adrパターン
        line = "ADDL GR1, 5"
        instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x2210, 0x0005]);

        // r1, adr, xパターン
        line = "ADDL GR1, 5, GR2"
        instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x2212, 0x0005]);
    });

    // SUBA命令
    test("SUBA test", () => {
        // r1, r2パターン
        let line = "SUBA GR1, GR2";
        let instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x2512]);

        // r1, adrパターン
        line = "SUBA GR1, 5"
        instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x2110, 0x0005]);

        // r1, adr, xパターン
        line = "SUBA GR1, 5, GR2"
        instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x2112, 0x0005]);
    });

    // SUBL命令
    test("SUBL test", () => {
        // r1, r2パターン
        let line = "SUBL GR1, GR2";
        let instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x2712]);

        // r1, adrパターン
        line = "SUBL GR1, 5"
        instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x2310, 0x0005]);

        // r1, adr, xパターン
        line = "SUBL GR1, 5, GR2"
        instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x2312, 0x0005]);
    });

    // AND命令
    test("AND test", () => {
        // r1, r2パターン
        let line = "AND GR1, GR2";
        let instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x3412]);

        // r1, adrパターン
        line = "AND GR1, 5"
        instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x3010, 0x0005]);

        // r1, adr, xパターン
        line = "AND GR1, 5, GR2"
        instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x3012, 0x0005]);
    });

    // OR命令
    test("OR test", () => {
        // r1, r2パターン
        let line = "OR GR1, GR2";
        let instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x3512]);

        // r1, adrパターン
        line = "OR GR1, 5"
        instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x3110, 0x0005]);

        // r1, adr, xパターン
        line = "OR GR1, 5, GR2"
        instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x3112, 0x0005]);
    });

    // XOR命令
    test("XOR test", () => {
        // r1, r2パターン
        let line = "XOR GR1, GR2";
        let instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x3612]);

        // r1, adrパターン
        line = "XOR GR1, 5"
        instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x3210, 0x0005]);

        // r1, adr, xパターン
        line = "XOR GR1, 5, GR2"
        instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x3212, 0x0005]);
    });

    // CPA命令
    test("CPA test", () => {
        // r1, r2パターン
        let line = "CPA GR1, GR2";
        let instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x4412]);

        // r1, adrパターン
        line = "CPA GR1, 5"
        instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x4010, 0x0005]);

        // r1, adr, xパターン
        line = "CPA GR1, 5, GR2"
        instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x4012, 0x0005]);
    });

    // CPL命令
    test("CPL test", () => {
        // r1, r2パターン
        let line = "CPL GR1, GR2";
        let instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x4512]);

        // r1, adrパターン
        line = "CPL GR1, 5"
        instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x4110, 0x0005]);

        // r1, adr, xパターン
        line = "CPL GR1, 5, GR2"
        instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x4112, 0x0005]);
    });

    // SLA命令
    test("SLA test", () => {
        // r1, adrパターン
        let line = "SLA GR1, 5"
        let instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x5010, 0x0005]);

        // r1, adr, xパターン
        line = "SLA GR1, 5, GR2"
        instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x5012, 0x0005]);
    });

    // SRA命令
    test("SRA test", () => {
        // r1, adrパターン
        let line = "SRA GR1, 5"
        let instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x5110, 0x0005]);

        // r1, adr, xパターン
        line = "SRA GR1, 5, GR2"
        instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x5112, 0x0005]);
    });

    // SLL命令
    test("SLL test", () => {
        // r1, adrパターン
        let line = "SLL GR1, 5"
        let instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x5210, 0x0005]);

        // r1, adr, xパターン
        line = "SLL GR1, 5, GR2"
        instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x5212, 0x0005]);
    });

    // SRL命令
    test("SRL test", () => {
        // r1, adrパターン
        let line = "SRL GR1, 5"
        let instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x5310, 0x0005]);

        // r1, adr, xパターン
        line = "SRL GR1, 5, GR2"
        instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x5312, 0x0005]);
    });

    // JPL命令
    test("JPL test", () => {
        // adrパターン
        let line = "JPL 5"
        let instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x6500, 0x0005]);

        // adr, xパターン
        line = "JPL 5, GR2"
        instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x6502, 0x0005]);
    });

    // JMI命令
    test("JMI test", () => {
        // adrパターン
        let line = "JMI 5"
        let instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x6100, 0x0005]);

        // adr, xパターン
        line = "JMI 5, GR2"
        instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x6102, 0x0005]);
    });

    // JNZ命令
    test("JNZ test", () => {
        // adrパターン
        let line = "JNZ 5"
        let instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x6200, 0x0005]);

        // adr, xパターン
        line = "JNZ 5, GR2"
        instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x6202, 0x0005]);
    });

    // JZE命令
    test("JZE test", () => {
        // adrパターン
        let line = "JZE 5"
        let instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x6300, 0x0005]);

        // adr, xパターン
        line = "JZE 5, GR2"
        instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x6302, 0x0005]);
    });

    // JOV命令
    test("JOV test", () => {
        // adrパターン
        let line = "JOV 5"
        let instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x6600, 0x0005]);

        // adr, xパターン
        line = "JOV 5, GR2"
        instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x6602, 0x0005]);
    });

    // JUMP命令
    test("JUMP test", () => {
        // adrパターン
        let line = "JUMP 5"
        let instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x6400, 0x0005]);

        // adr, xパターン
        line = "JUMP 5, GR2"
        instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x6402, 0x0005]);
    });

    // PUSH命令
    test("PUSH test", () => {
        // adrパターン
        let line = "PUSH 5"
        let instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x7000, 0x0005]);

        // adr, xパターン
        line = "PUSH 5, GR2"
        instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x7002, 0x0005]);
    });

    // POP命令
    test("POP test", () => {
        // rパターン
        const line = "POP GR1"
        const instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x7110]);
    });

    // CALL命令
    test("CALL test", () => {
        // adrパターン
        let line = "CALL 5"
        let instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x8000, 0x0005]);

        // adr, xパターン
        line = "CALL 5, GR2"
        instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x8002, 0x0005]);
    });

    // RET命令
    test("RET test", () => {
        // 引数なしパターン
        const line = "RET"
        const instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x8100]);
    });

    // SVC命令
    test("SVC test", () => {
        // adrパターン
        let line = "SVC 5"
        let instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0xF000, 0x0005]);

        // adr, xパターン
        line = "SVC 5, GR2"
        instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0xF002, 0x0005]);
    });

    // NOP命令
    test("NOP test", () => {
        // 引数なしパターン
        const line = "NOP"
        const instruction = Instructions.create(Lexer.tokenize(line, 1) as LexerResult, 1);
        if (instruction instanceof CompileError) throw new Error();

        assert.deepEqual(instruction.toHex(), [0x0000]);
    });
});
