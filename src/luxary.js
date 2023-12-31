import { readFileSync } from 'fs';
import { argv } from 'process';
import { Parser } from './parser.js';
import { Lexer } from './lexer.js';
import { Interpreter } from './interpreter.js';
import { BuiltInFunction } from './nodes.js';

export class VarTable {
    
    constructor(parent=undefined) {
        this.vars = {};
        this.parent = parent;
    }

    get(name) {
        const val = this.vars[name];
        if (!val && this.parent)
            return this.parent.get(name);

        return val;
    }

    set(name, value) {
        this.vars[name] = value;
    }

    del(name) {
        delete this.vars[name];
    }
}

export class Context {

    constructor(name, parent=undefined, parentLoc=undefined) {
        this.name = name;
        this.parent = parent;
        this.parentLoc = parentLoc;
        this.varTable = undefined;
    }
}

const globalVars = new VarTable();
globalVars.set("null", new Number(0));
globalVars.set("true", new Boolean(true));
globalVars.set("false", new Boolean(false));

const registerBuiltIn = (name) => {
    globalVars.set(name, new BuiltInFunction(undefined, globalVars, name));
}

registerBuiltIn("print");
registerBuiltIn("input");
registerBuiltIn("number");
registerBuiltIn("string");
registerBuiltIn("at");
registerBuiltIn("concat");
registerBuiltIn("push");

const filePath = argv[2];
const source = readFileSync(filePath).toString();

const lexer = new Lexer(filePath, source);

let tokens = [];
while (!lexer.eof()) {
    tokens.push(lexer.next_token());
}

const context = new Context(filePath);
context.varTable = globalVars;

const parser = new Parser(tokens);
const interpreter = new Interpreter();

let ast = parser.parse();

while (ast) {
    const res = interpreter.visit(ast, context);
    ast = parser.parse();
    
    if (res != undefined) {
        
    }
}
