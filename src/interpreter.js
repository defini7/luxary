import { error } from "./lexer.js";
import { Number, String, Boolean } from "./nodes.js";

export class Interpreter {

    visit(node, context) {
        const methodName = `visit${node.constructor.name}`;
        if (!this[methodName]) {
            error(node.loc, 'this operation is not implemented', context);
        }
        
        return this[methodName](node, context);
    }

    visitVarAccessNode(node, context) {
        const name = node.tok.value;
        const value = context.varTable.get(name);

        if (!value)
            error(node.tok.loc, `"${name}" is not defined`, context);

        return value;
    }

    visitVarAssignNode(node, context) {
        const name = node.name.value;
        const value = this.visit(node.value, context);

        context.varTable.set(name, value);
        return value;
    }

    visitBinOpNode(node, context) {
        const left = this.visit(node.left, context);
        const right = this.visit(node.right, context);

        switch (node.op.type) {
            case "plus": return new Number(left.loc, left.value + right.value, context);
            case "minus": return new Number(left.loc, left.value - right.value, context);
            case "asterisk": return new Number(left.loc, left.value * right.value, context);
            case "power": return new Number(left.loc, left.value ** right.value, context);
            case "isequal": return new Boolean(left.loc, left.value == right.value, context);
            case "notequal": return new Boolean(left.loc, left.value != right.value, context);
            case "modulo": return new Number(left.loc, left.value % right.value, context);
            case "shiftleft": return new Number(left.loc, left.value << right.value, context);
            case "shiftright": return new Number(left.loc, left.value >> right.value, context);
            case "xor": return new Number(left.loc, left.value ^ right.value, context);
            case "bor": return new Number(left.loc, left.value | right.value, context);
            case "band": return new Number(left.loc, left.value & right.value, context);
            case "less": return new Boolean(left.loc, left.value < right.value, context);
            case "greater": return new Boolean(left.loc, left.value > right.value, context);
            case "lessequal": return new Boolean(left.loc, left.value <= right.value, context);
            case "greaterequal": return new Boolean(left.loc, left.value >= right.value, context);
            case "mod": return new Number(left.loc, left.value % right.value, context);
            case "slash": {
                if (right.value == 0)
                    error(right.loc, "can't divide by zero", context);

                return new Number(left.loc, left.value / right.value, context);
            }
        }
    }

    visitUnaryOpNode(node, context) {
        let value = this.visit(node.node, context);

        switch (node.op.type) {
            case "minus": value = new Number(value.loc, -value.value, context); break;
            case "not": value = new Boolean(value.loc, !value.value, context); break;
            case "bnot": value = new Number(value.loc, ~value.value, context); break;
        }

        return value;
    }

    visitNumberNode(node, context) {
        return new Number(node.tok.loc, +node.tok.value, context);
    }

    visitStringNode(node, context) {
        return new String(node.tok.loc, node.tok.value, context);
    }
}