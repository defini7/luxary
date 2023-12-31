import { NumberNode, StringNode, BinOpNode, UnaryOpNode, VarAccessNode, VarAssignNode, IfNode, ForNode, WhileNode, FuncDefNode, FuncCallNode, ListNode } from './nodes.js';
import { error } from './lexer.js';

export class Parser {

    constructor(tokens, context) {
        this.term = this.term.bind(this);
        this.expr = this.expr.bind(this);
        this.factor = this.factor.bind(this);
        this.call = this.call.bind(this);

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

        if (!tok) {
            error(undefined, "expected something, but EOF", this.context);
        }

        if (tok.type == "eof") {
            return null;
        }

        if (tok.type == "newline") {
            this.advance();
            return this.parse();
        }
        
        if (tok.type == "identifier") {
            this.advance();
            return new VarAccessNode(tok);
        }

        if (["plus", "minus", "not", "bnot"].includes(tok.type)) {
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
            
            error(this.cur.loc, "Expected ')'", this.context);
        }

        if (tok.type == "lbracket") {
            this.advance();

            let elements = [];

            if (this.cur.type == "rbracket") {
                this.advance();
            } else {
                elements.push(this.expr());

                while (this.cur.type == "comma") {
                    this.advance();
                    elements.push(this.expr());
                }

                if (this.cur.type != "rbracket") {
                    error(this.cur.loc, `expected "," or "]", but got ${this.cur}`);
                }

                this.advance();
            }

            return new ListNode(elements);
        }

        error(tok.loc, `expected literal, but found ${tok.type}: ${tok.value}`, this.context);
    }

    binOp(func, ops) {
        let left = func();

        while (ops.includes(this.cur.type)) {
            let op = this.cur;
            this.advance();
            left = new BinOpNode(left, op, func());
        }

        return left;
    }

    term() {
        return this.binOp(this.call, ["asterisk", "slash", "power", "percent", "shiftleft", "shiftright", "mod"]);
    }

    call() {
        const factor = this.factor();
        
        if (this.cur.type == "lparen") {
            this.advance();
            let args = [];

            if (this.cur.type == "rparen") {
                this.advance();
            } else {
                args.push(this.expr());

                while (this.cur.type == "comma") {
                    this.advance();
                    args.push(this.expr());
                }

                if (this.cur.type != "rparen") {
                    error(this.cur.loc, `expected "," or ")", but got ${this.cur}`, context);
                }

                this.advance();
            }

            return new FuncCallNode(factor, args);
        }

        return factor;
    }

    expr() {
        const keywordTable = {
            "var": () => {
                this.advance();

                if (this.cur.type != "identifier") {
                    error(this.cur.loc, `expected identifier, but got ${this.cur}`, this.context);
                }
    
                const name = this.cur;
                this.advance();
    
                if (this.cur.type != "assign") {
                    error(this.cur.loc, `expected "=", but got ${this.cur}`, this.context);
                }
    
                const assignLoc = this.cur.loc;
                this.advance();
    
                return new VarAssignNode(assignLoc, name, this.expr());
            },

            "if": () => {
                this.advance();

                let condition = this.expr();
                
                if (!this.cur.matches("keyword", "then")) {
                    error(this.cur.loc, `expected "then", but got ${this.cur}`, this.context);
                }
                
                this.advance();
                
                let cases = [], elseCase;
                cases.push([condition, this.expr()]);

                while (this.cur.matches("keyword", "elif")) {
                    this.advance();
                    condition = this.expr();

                    if (!this.cur.matches("keyword", "then")) {
                        error(this.cur.loc, `expected "then", but got ${this.cur}`, this.context);
                    }

                    this.advance();
                    cases.push([condition, this.expr()]);
                }

                if (this.cur.matches("keyword", "else")) {
                    this.advance();
                    elseCase = this.expr();
                }

                if (!this.cur.matches("keyword", "end")) {
                    error(this.cur.loc, `expected "end", but got ${this.cur}`, this.context);
                }

                this.advance();

                return new IfNode(cases, elseCase);
            },

            "while": () => {
                this.advance();

                const condition = this.expr();

                if (!this.cur.matches("keyword", "do")) {
                    error(this.cur.loc, `expected "do", but got ${this.cur}`, this.context);
                }

                this.advance();
                const body = this.expr();

                if (!this.cur.matches("keyword", "end")) {
                    error(this.cur.loc, `expected "end", but got ${this.cur}`, this.context);
                }

                this.advance();

                return new WhileNode(condition, body);
            },

            "for": () => {
                this.advance();

                if (this.cur.type != "identifier") {
                    error(this.cur.loc, `expected identifier, but got ${this.cur}`, this.context);
                }

                const varName = this.cur;
                this.advance();

                if (this.cur.type != "assign") {
                    error(this.cur.loc, `expected "=", but got ${this.cur}`, this.context);
                }

                this.advance();
                const startValue = this.expr();

                if (this.cur.type != "comma") {
                    error(this.cur.loc, `expected ",", but got ${this.cur}`, this.context);
                }

                this.advance();
                const endValue = this.expr();

                let stepValue;
                if (this.cur.type == "comma") {
                    this.advance();
                    stepValue = this.expr();
                }

                if (!this.cur.matches("keyword", "do")) {
                    error(this.cur.loc, `expected "do", but got ${this.cur}`, this.context);
                }

                this.advance();
                const body = this.expr();

                if (!this.cur.matches("keyword", "end")) {
                    error(this.cur.loc, `expected "end", but got ${this.cur}`, this.context);
                }

                this.advance();
                
                return new ForNode(varName, startValue, endValue, stepValue, body);
            },

            "function": () => {
                this.advance();

                let name;
                if (this.cur.type == "identifier") {
                    name = this.cur;
                    this.advance();                
                }

                if (this.cur.type != "lparen") {
                    error(this.cur.loc, `expected "(", but got ${this.cur}`, this.context);
                }

                this.advance();
                let args = [];

                if (this.cur.type == "identifier") {
                    args.push(this.cur);
                    this.advance();

                    while (this.cur.type == "comma") {
                        this.advance();

                        if (this.cur.type != "identifier") {
                            error(this.cur.loc, `expected "identifier", but got ${this.cur}`, this.context);
                        }

                        args.push(this.cur);
                        this.advance();
                    }

                    if (this.cur.type != "rparen") {
                        error(this.cur.loc, `expected ")", but got ${this.cur}`, this.context);
                    }
                } else {
                    if (this.cur.type != "rparen") {
                        error(this.cur.loc, `expected ")", but got ${this.cur}`, this.context);
                    }
                }

                this.advance();
                const body = this.expr();

                if (!this.cur.matches("keyword", "end")) {
                    error(this.cur.loc, `expected "end", but got ${this.cur}`, this.context);
                }

                this.advance();
                return new FuncDefNode(name, args, body);
            }

        };

        if (this.cur.value in keywordTable) {
            return keywordTable[this.cur.value]();
        }

        return this.binOp(this.term, ["plus", "minus", "isequal", "notequal", "bor", "xor", "band", "or", "and", "less", "greater", "lessequal", "greaterequal"]);
    }

}