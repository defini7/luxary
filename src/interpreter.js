import { error } from "./lexer.js";
import { Number, String, Boolean, Function, List } from "./nodes.js";

export class Interpreter {

    visit(node, context) {
        const methodName = `visit${node.constructor.name}`;
        if (!this[methodName]) {
            error(node.loc, `operation "${methodName}" is not implemented`, context);
        }
        
        return this[methodName](node, context);
    }

    visitVarAccessNode(node, context) {
        const name = node.tok.value;
        let value = context.varTable.get(name);

        if (!value) {
            error(node.tok.loc, `"${name}" is not defined`, context);
        }

        value = value.copy();
        value.context = context;
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

    visitIfNode(node, context) {
        for (const ifCase of node.cases) {
            const conditionVal = this.visit(ifCase[0], context);

            if (conditionVal.value != 0) {
                return this.visit(ifCase[1], context);
            }
        }

        if (node.elseCase) {
            return this.visit(node.elseCase, context);
        }
    }

    visitWhileNode(node, context) {
        let elements = [];
        while (1) {
            const condition = this.visit(node.condition, context);

            if (condition.value == 0) {
                break;
            }

            elements.push(this.visit(node.body, context));
        }

        return new List(node.loc, context, elements);
    }

    visitForNode(node, context) {
        const startValue = this.visit(node.startValue, context);
        const endValue = this.visit(node.endValue, context);
        const stepValue = node.stepValue ? this.visit(node.stepValue, context).value : 1;

        let i = startValue.value;
        const condition = (stepValue >= 0) ? () => { return i <= endValue.value } : () => { return i >= endValue.value };
        
        let elements = [];
        while (condition()) {
            context.varTable.set(node.varName.value, new Number(node.varName.loc, i, context));
            i += stepValue;

            elements.push(this.visit(node.body, context));
        }
        
        return new List(node.loc, context, elements);
    }

    visitFuncDefNode(node, context) {
        let args = [];
        for (const arg of node.args) { args.push(arg.value); }

        const func = new Function(node.loc, context, node.value ? node.value.value : undefined, args, node.body);

        if (node.value) {
            context.varTable.set(node.value.value, func);
        }

        return func;
    }

    visitFuncCallNode(node, context) {
        let call = this.visit(node.node, context);
        call = call.copy();
        call.loc = node.node.tok.loc;

        let args = [];
        for (const arg of node.args) {
            args.push(this.visit(arg, context));
        }

        return call.execute(args);
    }

    visitListNode(node, context) {
        let elements = [];

        for (const elem of node.tok) {
            elements.push(this.visit(elem, context));
        }

        return new List(node.loc, context, elements);
    }
}