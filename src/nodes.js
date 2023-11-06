import { Interpreter } from "./interpreter.js";
import { Context, VarTable } from "./luxary.js";
import { error } from "./lexer.js";
import { question } from "readline-sync";

function isNumber(s) {
    return /^-?\d+\.?\d*$/.test(s);
}

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
export class ListNode extends BaseNode {}

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

    copy() {
        return new Value(this.loc, this.value, this.context);
    }

    toString() {
        return this.value.toString();
    }
}

export class Number extends Value {}
export class String extends Value {}
export class Boolean extends Value {}

export class List extends Value {
    constructor(loc, context, elements) {
        super(loc, elements, context);
    }

    copy() {
        return new List(this.loc, this.context, this.value);
    }

    toString() {
        return `[${this.value.join(", ")}]`;
    }
}

class BaseFunction extends Value {
    constructor(loc, context, name) {
        super(loc, name || "<lambda>", context);
    }

    createContext() {
        let ctx = new Context(this.value, this.context, this.loc);
        ctx.varTable = new VarTable(ctx.parent.varTable);
        return ctx;
    }

    checkArguments(names, values) {
        if (values.length > names.length) {
            error(this.loc, `${values.length - names.length} too many arguments pased into "${this.value}"`, this.context);
        }

        if (names.length > values.length) {
            error(this.loc, `${names.length - values.length} too few arguments pased into "${this.value}"`, this.context);
        }
    }

    populateArguments(names, values, context) {
        for (let i = 0; i < values.length; i++) {
            values[i].context = context;
            context.varTable.set(names[i], values[i]);
        }
    }

    checkAndPopulateArguments(names, values, context) {
        this.checkArguments(names, values);
        this.populateArguments(names, values, context);
    }
}

export class Function extends BaseFunction {
    constructor(loc, context, name, args, body) {
        super(loc, name || "<lambda>", context);
        this.args = args;
        this.body = body;
    }

    execute(args) {
        const interpreter = new Interpreter();

        let ctx = this.createContext();
        this.checkAndPopulateArguments(this.args, args, ctx);

        return interpreter.visit(this.body, ctx);
    }

    copy() {
        return new Function(this.context, this.loc, this.value, this.args, this.body);
    }

    toString() {
        return `<function ${this.value}>`;
    }
}

export class BuiltInFunction extends BaseFunction {
    constructor(loc, context, name) {
        super(loc, context, name);
    }

    execute(args) {
        let ctx = this.createContext();

        const method = BuiltInFunction["execute_" + this.value];
        this.checkAndPopulateArguments(method.names, args, ctx);

        return method(ctx);
    }

    copy() {
        return new BuiltInFunction(this.context, this.loc, this.value);
    }

    toString() {
        return `<function ${this.value}>`;
    }

    static execute_print(context) {
        console.log(context.varTable.get("value").toString());
    }
    
    static execute_input(context) {
        return new String(context.parentLoc, question(context.varTable.get("text")), context.parent);
    }
    
    static execute_number(context) {
        const data = context.varTable.get("data");
        if (isNumber(str)) {
            return new Number(context.parentLoc, +data, context.parent);
        }
    
        error(context.parentLoc, `can't convert ${data} to number`, context.parent);
    }

    static execute_string(context) {
        const data = context.varTable.get("data");

        if (data["toString"]) {
            return new String(context.parentLoc, data.toString(), context.parent);
        }

        error(context.parentLoc, `can't convert ${data} to string`, context.parent);
    }

    static execute_at(context) {
        const list = context.varTable.get("list").value;
        const index = context.varTable.get("index");

        if (index < list.length) {
            return list[index];
        }

        error(context.parentLoc, `index out of range: ${index}`, context.parent);
    }
    
    static execute_concat(context) {
        const lhs = context.varTable.get("left").value;
        const rhs = context.varTable.get("right").value;

        return new List(context.parentLoc, context.parent, lhs.concat(rhs));
    }

    static execute_push(context) {
        const lhs = context.varTable.get("list").value;
        const rhs = context.varTable.get("value").value;

        lhs.push(rhs);
    }
}

BuiltInFunction.execute_print.names = ["value"];
BuiltInFunction.execute_input.names = ["text"];
BuiltInFunction.execute_number.names = ["data"];
BuiltInFunction.execute_string.names = ["data"];
BuiltInFunction.execute_at.names = ["list", "index"];
BuiltInFunction.execute_concat.names = ["left", "right"];
BuiltInFunction.execute_push.names = ["list", "value"];

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
