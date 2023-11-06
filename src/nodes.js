import { Interpreter } from "./interpreter.js";
import { Context, VarTable } from "./luxary.js";
import { error } from "./lexer.js";

class BaseNode {
    constructor(tok) {
        this.tok = tok;
    }

    toString() {
        return `${this.tok.type}: ${this.tok.value}`;
    }
}

export class NumberNode extends BaseNode {}
export class StringNode extends BaseNode {}

export class BinOpNode {
    constructor(left, op, right) {
        this.left = left;
        this.op = op;
        this.right = right;
    }

    toString() {
        return `(${this.left}, ${this.op.type}, ${this.right})`;
    }
}

export class UnaryOpNode {
    constructor(op, node) {
        this.op = op;
        this.node = node;
    }

    toString() {
        return `(${this.op.type}, ${this.node})`;
    }
}

class Value {
    constructor(loc, value, context = undefined) {
        this.loc = loc;
        this.value = value;
        this.context = context;
    }

    toString() {
        return this.value.toString();
    }
}

export class Number extends Value {}
export class String extends Value {}
export class Boolean extends Value {}

export class Function extends Value {
    constructor(loc, context, name, args, body) {
        super(loc, undefined, context);

        this.name = name || "<lambda>";
        this.args = args;
        this.body = body;
    }

    execute(args) {
        const interpreter = new Interpreter();

        let ctx = new Context(this.name, this.context, this.loc);
        ctx.varTable = new VarTable(ctx.parent ? ctx.parent.varTable : undefined);

        if (args.length > this.args.length) {
            error(this.loc, `${args.length - this.args.length} too many arguments pased into "${this.name}"`, this.context);
        }

        if (args.length < this.args.length) {
            error(this.loc, `${this.args.length - args.length} too few arguments pased into "${this.name}"`, this.context);
        }

        for (let i = 0; i < args.length; i++) {
            args[i].context = ctx;
            ctx.varTable.set(this.args[i], args[i]);
        }

        return interpreter.visit(this.body, ctx);
    }

    copy() {
        return new Function(this.context, this.loc, this.name, this.args, this.body);
    }

    toString() {
        return `<function ${this.name}>`;
    }
}

export class VarAssignNode {
    constructor(loc, name, value) {
        this.loc = loc;
        this.name = name;
        this.value = value;
    }
}

export class VarAccessNode {
    constructor(tok) {
        this.tok = tok;
    }
}

export class IfNode {
    constructor(cases, elseCase) {
        this.cases = cases;
        this.elseCase = elseCase;
    }
}

export class WhileNode {
    constructor(condition, body) {
        this.condition = condition;
        this.body = body;
    }
}

export class ForNode {
    constructor(varName, startValue, endValue, stepValue, body) {
        this.varName = varName;
        this.startValue = startValue;
        this.endValue = endValue;
        this.stepValue = stepValue;
        this.body = body;
    }
}

export class FuncDefNode {
    constructor(name, args, body) {
        this.name = name;
        this.args = args;
        this.body = body;
    }
}

export class FuncCallNode {
    constructor(node, args) {
        this.node = node;
        this.args = args;
    }
}
