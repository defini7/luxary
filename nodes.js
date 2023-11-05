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

class Base {
    constructor(loc, value, context = undefined) {
        this.loc = loc;
        this.value = value;
        this.context = context;
    }

    setContext(context = undefined) {
        this.context = context;
        return this;
    }

    toString() {
        return this.value.toString();
    }
}

export class Number extends Base {}
export class String extends Base {}

export class Boolean {
    constructor(loc, value, context = undefined) {
        this.loc = loc;
        this.value = value;
        this.context = context;
    }

    setContext(context = undefined) {
        this.context = context;
        return this;
    }

    toString() {
        return this.value.toString();
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
