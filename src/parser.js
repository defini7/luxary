import { NumberNode, StringNode, BinOpNode, UnaryOpNode, VarAccessNode, VarAssignNode } from './nodes.js';
import { error } from './lexer.js';

export class Parser {

    constructor(tokens, context) {
        this.term = this.term.bind(this);
        this.expr = this.expr.bind(this);
        this.factor = this.factor.bind(this);

        this.tokens = tokens;
        this.tokIdx = -1;
        this.advance();
        
        this.context = context;
    }

    advance() {
        this.tokIdx++;
        if (this.tokIdx < this.tokens.length) {
            this.cur = this.tokens[this.tokIdx];
        }
    }

    parse() {
        if (this.tokIdx >= this.tokens.length) {
            return null;
        }

        return this.expr();
    }

    factor() {
        let tok = this.cur;

        if (!tok)
            error(undefined, 'expected something, but EOF', this.context);

        if (tok.type == "newline") {
            this.advance();
            return this.factor();
        }
        
        if (tok.type == "identifier") {
            this.advance();
            return new VarAccessNode(tok);
        }

        if (["plus", "minus", "not"].includes(tok.type)) {
            this.advance();
            return new UnaryOpNode(tok, this.factor());
        }
        
        if (tok.type == "number") {
            this.advance();
            return new NumberNode(tok);
        }

        if (tok.type == "string") {
            this.advance();
            return new StringNode(tok);
        }
        
        if (tok.type == "lparen") {
            this.advance();
            const expr = this.expr();

            if (this.cur.type == "rparen") {
                this.advance();
                return expr;
            }
            
            error(this.cur.loc, "Expected ')'");
        }

        error(tok.loc, `expected number, but found ${tok.type}: ${tok.value}`);
    }

    binOp(func, ops) {
        let left = func();

        while (ops.includes(this.cur.type)) {
            let op = this.cur;
            this.advance();
            let right = func();
            left = new BinOpNode(left, op, right);
        }

        return left;
    }

    term() {
        return this.binOp(this.factor, ["asterisk", "slash", "power"]);
    }

    expr() {
        if (this.cur.matches("keyword", "var")) {
            this.advance();

            if (this.cur.type != "identifier") {
                error(this.cur.loc, `expected identifier, but got ${this.cur}`);
            }

            const name = this.cur;
            this.advance();

            if (this.cur.type != "equal")
                error(this.cur.loc, `expected '=', but got ${this.cur}`);

            const assignLoc = this.cur.loc;
            this.advance();

            return new VarAssignNode(assignLoc, name, this.expr());
        }

        let node = this.binOp(this.term, ["plus", "minus", "isequal", "notequal"]);

        return node;
    }

}