import { exit } from 'process';

const TOKENS = {
    "(": "lparen",
    ")": "rparen",
    "+": "plus",
    "-": "minus",
    "*": "asterisk",
    "/": "slash",
    "%": "mod",
    "**": "power",
    "|": "bor",
    "||": "or",
    "&": "band",
    "&&": "and",
    "^": "xor",
    "~": "bnot",
    "<<": "shiftleft",
    ">>": "shiftright",
    "<": "less",
    ">": "greater",
    "<=": "lessequal",
    ">=": "greaterequal",
    "==": "isequal",
    "!=": "notequal",
    "!": "not",
    "=": "assign",
};

const KEYWORDS = [
    "var",
];

function isAlpha(c) { return /^[A-Z]$/i.test(c); };
function isAlnum(c) { return /^[A-Z0-9]$/i.test(c); };
function isDigit(c) { return /^[0-9]/.test(c); }

export function error(loc, msg, context) {
    let ctx = context;
    let location = loc;
    while (ctx) {
        if (location) console.error('%s ->', location);
        location = context.parentLoc;
        ctx = context.parent;
    }

    if (loc) {
        console.error('%s: ERROR: %s', loc, msg);
    } else {
        console.error('ERROR: %s', msg);
    }

    exit(1);
}

export class Location {

    constructor(filePath, row, col) {
        this.filePath = filePath;
        this.row = row;
        this.col = col;
    }

    toString() {
        return `${this.filePath}:${this.row+1}:${this.col+1}`;
    }
}

class Token {
    
    constructor(loc, type, value) {
        this.loc = loc;
        this.type = type;
        this.value = value;
    }

    matches(type, value) {
        return (this.type == type && this.value == value);
    }

    toString() {
        return `${this.loc.filePath}:${this.loc.row}:${this.loc.col} | ${this.type} ${this.value}`;
    }
}

export class Lexer {

    constructor(filePath, source, context) {
        this.filePath = filePath;
        this.source = source;
        this.row = 0;
        this.bol = 0;
        this.cur = 0;
        this.context = context;
    }

    eof() {
        return this.cur >= this.source.length;
    }

    current() {
        return this.source[this.cur];
    }

    chop() {
        if (!this.eof()) {
            const c = this.current();
            this.cur++;
            if (c == "\n") {
                this.bol = this.cur;
                this.row++;
            }
        }
    }

    trim_left() {
        while (!this.eof() && this.current() == " " && this.current() != "\n")
            this.chop();
    }

    drop_line() {
        while (!this.eof() && !["\n", "\r"].includes(this.current()))
            this.chop();

        if (!this.eof()) this.chop();
    }

    loc() {
        return new Location(this.filePath, this.row, this.cur - this.bol);
    }

    next_token() {
        // Skip all whitespaces
        this.trim_left();

        while (!this.eof()) {
            const s = this.source.substring(this.cur);
            if (!s.startsWith("#")) break; // skip comments
            this.drop_line();
            this.trim_left();
        }

        if (this.eof()) return undefined;

        if (["\n", "\r"].includes(this.current())) {
            this.drop_line();
            this.trim_left();
            this.chop();

            return new Token(this.loc(), "newline", "\n");
        }

        const loc = this.loc();
        const first = this.current();

        // Identifier | Keyword
        if (isAlpha(first)) {
            const i = this.cur;
            while (!this.eof() && isAlnum(this.current()))
                this.chop();

            const value = this.source.substring(i, this.cur);
            return new Token(loc, (KEYWORDS.indexOf(value) != -1) ? "keyword" : "identifier", value);
        }

        // Operator
        let i = this.cur;
        while (!isAlnum(this.source[i]) && this.source[i] != " " && i < this.source.length)
            i++;

        let op = this.source.substring(this.cur, i);
        while (!TOKENS[op] && op.length != 0) {
            op = op.slice(0, -1);
            i--;
        }
        
        if (op.length != 0) {
            for (let j = 0; j < i - this.cur + 1; j++) this.chop();
            return new Token(loc, TOKENS[op], op);
        }

        // String
        if (first == "\"") {
            this.chop();
            let literal = "";

            while (!this.eof()) {
                const c = this.current();
                switch (c) {
                    case '\"': {
                        if (!this.eof()) {
                            this.chop();
                            return new Token(loc, "string", literal);
                        }

                        error(loc, "unclosed string", this.context);
                    }

                    case '\\': {
                        this.chop();
                        if (this.eof())
                            error(this.loc(), "unfinished escape sequence", this.context);

                        const escape = this.current();
                        switch (escape) {
                            case 'n': {
                                literal += "\n";
                                this.chop();
                            }
                            break;

                            case '"': {
                                literal += "\"";
                                this.chop();
                            }
                            break;

                            case 'r': {
                                literal += "\r";
                                this.chop();
                            }
                            break;

                            default: {
                                error(this.loc(), `unknown escape character '${escape}'`, this.context);
                            }

                        }
                    }
                    break;

                    default: {
                        literal += c;
                        this.chop();
                    }

                }
            }
        }

        if (isDigit(first)) {
            const start = this.cur;
            while (!this.eof() && isDigit(this.current()))
                this.chop();

            return new Token(loc, "number", this.source.substring(start, this.cur));
        }

        error(loc, `unknown token starts with '${first}'`, this.context);
    }
}