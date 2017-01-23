'use strict';

import { Lexer, LexerResult } from '../../src/casl2/lexer';
import { CompileError } from '../../src/errors/compileError';
import { GR } from '../../src/comet2/gr';
import * as assert from 'assert';

suite('Lexer test', () => {
    test('tokenize test: label + instruction no args', () => {
        let line = "CASL2 START";
        let result = Lexer.tokenize(line, 3);
        if (result instanceof CompileError) throw new Error();

        assert.equal(result.label, "CASL2");
        assert.equal(result.instruction, "START");
        assert.equal(result.r1, undefined);
        assert.equal(result.r2, undefined);
        assert.equal(result.address, undefined);
        assert.equal(result.comment, undefined);
    });

    test('tokenize test: instruction (no args)', () => {
        let line = "NOP";
        let result = Lexer.tokenize(line, 3);
        if (result instanceof CompileError) throw new Error();

        assert.equal(result.label, undefined);
        assert.equal(result.instruction, "NOP");
        assert.equal(result.r1, undefined);
        assert.equal(result.r2, undefined);
        assert.equal(result.address, undefined);
        assert.equal(result.comment, undefined);
    });

    test('tokenize test: label + instruction r1, r2', () => {
        let line = "ADD    ADDA GR0, GR1";
        let result = Lexer.tokenize(line, 3);
        if (result instanceof CompileError) throw new Error();

        assert.equal(result.label, "ADD");
        assert.equal(result.instruction, "ADDA");
        assert.equal(result.r1, GR.GR0);
        assert.equal(result.r2, GR.GR1);
        assert.equal(result.address, undefined);
        assert.equal(result.comment, undefined);
    });

    test('tokenize test: instruction + r1, r2 + comment', () => {
        let line = "ADDA GR0, GR1 ;windows";
        let result = Lexer.tokenize(line, 3);
        if (result instanceof CompileError) throw new Error();

        assert.equal(result.label, undefined);
        assert.equal(result.instruction, "ADDA");
        assert.equal(result.r1, GR.GR0);
        assert.equal(result.r2, GR.GR1);
        assert.equal(result.address, undefined);
        assert.equal(result.comment, ";windows");
    });

    test('tokenize test: label + instruction + r, adr(number), x', () => {
        let line = "L1   LAD GR0, 3, GR1";
        let result = Lexer.tokenize(line, 3);
        if (result instanceof CompileError) throw new Error();

        assert.equal(result.label, "L1");
        assert.equal(result.instruction, "LAD");
        assert.equal(result.r1, GR.GR0);
        assert.equal(result.r2, GR.GR1);
        assert.equal(result.address, 3);
        assert.equal(result.comment, undefined);
    });

    test('tokenize test: instruction + r, adr(label), x', () => {
        let line = "LAD GR0, ONE, GR1";
        let result = Lexer.tokenize(line, 3);
        if (result instanceof CompileError) throw new Error();

        assert.equal(result.label, undefined);
        assert.equal(result.instruction, "LAD");
        assert.equal(result.r1, GR.GR0);
        assert.equal(result.r2, GR.GR1);
        assert.equal(result.address, "ONE");
        assert.equal(result.comment, undefined);
    });

    test('tokenize test: comment', () => {
        let line = "; THIS IS COMMENT";
        let result = Lexer.tokenize(line, 3);
        if (result instanceof CompileError) throw new Error();

        assert.equal(result.label, undefined);
        assert.equal(result.instruction, undefined);
        assert.equal(result.r1, undefined);
        assert.equal(result.r2, undefined);
        assert.equal(result.address, undefined);
        assert.equal(result.comment, "; THIS IS COMMENT");
    });

    // 空行はエラー
    test('tokenize error test: empty line', () => {
        let line = "";
        let result = Lexer.tokenize(line, 3);
        assert(result instanceof CompileError);
    });
    
    // 不明な命令はエラー
    test('tokenize error test: invalid instruction', () => {
        // この場合はラベル名と解釈される
        let line = "MUL     GR1, GR2";
        let result = Lexer.tokenize(line, 3);
        assert(result instanceof CompileError);

        // MUL命令は存在しない
        line = "L1   MUL GR1, GR2";
        result = Lexer.tokenize(line, 3);
        assert(result instanceof CompileError);
    });

    // ラベル名に不正な文字を含んでいる
    test('tokenize error test: invalid character used for label', () => {
        // 小文字を使っている
        let line = "l1  ADDA    GR1, GR2";
        let result = Lexer.tokenize(line, 3);
        assert(result instanceof CompileError);

        // ラベル名の一文字目が数字である
        line = "1L  ADDA GR1, GR2";
        result = Lexer.tokenize(line, 3);
        assert(result instanceof CompileError);
    });

    // ラベル名は8文字まで有効
    test('tokenize test: label name can be up to 8 characters', () => {
        let line = "ABCDEFGH  ADDA    GR1, GR2";
        let result = Lexer.tokenize(line, 3);
        assert(!(result instanceof CompileError));
    });

    // ラベル名が長すぎる(9文字以上)
    test('tokenize error test: too long label name', () => {
        let line = "ABCDEFGHI  ADDA    GR1, GR2";
        let result = Lexer.tokenize(line, 3);
        assert(result instanceof CompileError);
    });
});