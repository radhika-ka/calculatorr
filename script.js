const expressionElement = document.querySelector("#expression");
const resultElement = document.querySelector("#result");
const keypad = document.querySelector(".keypad");

let expression = "";
let justCalculated = false;

const operatorPattern = /[+\-*/]/;

function prettify(value) {
    return value.replaceAll("*", "×").replaceAll("/", "÷").replaceAll("-", "−");
}

function formatNumber(value) {
    if (!Number.isFinite(value)) throw new Error("Invalid result");
    const rounded = Math.abs(value) < 1e-12 ? 0 : Number.parseFloat(value.toPrecision(12));
    return rounded.toLocaleString("en-US", { maximumFractionDigits: 10 });
}

function updateScreen(preview = null) {
    expressionElement.textContent = expression ? prettify(expression) : "0";
    resultElement.textContent = preview ?? (expression ? prettify(expression) : "0");
}

function clearCalculator() {
    expression = "";
    justCalculated = false;
    updateScreen();
}

function appendDigit(digit) {
    if (justCalculated) expression = "";
    justCalculated = false;

    const currentNumber = expression.split(/[+\-*/]/).pop();
    if (currentNumber === "0") expression = expression.slice(0, -1);
    expression += digit;
    updateScreen();
}

function appendDecimal() {
    if (justCalculated) expression = "";
    justCalculated = false;

    const currentNumber = expression.split(/[+\-*/]/).pop();
    if (currentNumber.includes(".")) return;
    expression += currentNumber ? "." : "0.";
    updateScreen();
}

function appendOperator(operator) {
    if (!expression) {
        if (operator === "-") expression = "-";
        updateScreen();
        return;
    }

    justCalculated = false;
    if (operatorPattern.test(expression.at(-1))) expression = expression.slice(0, -1) + operator;
    else expression += operator;
    updateScreen();
}

function deleteLast() {
    if (justCalculated) return clearCalculator();
    expression = expression.slice(0, -1);
    updateScreen();
}

function getLastNumber() {
    const match = expression.match(/\d+(?:\.\d*)?$/);
    if (!match) return null;

    let start = expression.length - match[0].length;
    let value = match[0];
    const previousCharacter = expression[start - 1];
    const characterBeforePrevious = expression[start - 2];

    if (previousCharacter === "-" && (start === 1 || operatorPattern.test(characterBeforePrevious))) {
        start -= 1;
        value = `-${value}`;
    }
    return { start, value };
}

function toggleSign() {
    if (!expression) return;
    if (justCalculated) {
        expression = expression.startsWith("-") ? expression.slice(1) : `-${expression}`;
        justCalculated = false;
        updateScreen();
        return;
    }

    const number = getLastNumber();
    if (!number) return;
    expression = `${expression.slice(0, number.start)}${number.value.startsWith("-") ? number.value.slice(1) : `-${number.value}`}`;
    updateScreen();
}

function applyPercent() {
    const number = getLastNumber();
    if (!number) return;
    expression = `${expression.slice(0, number.start)}${Number(number.value) / 100}`;
    justCalculated = false;
    updateScreen();
}

function evaluate(source) {
    let index = 0;

    function skipSpaces() {
        while (/\s/.test(source[index])) index += 1;
    }

    function factor() {
        skipSpaces();
        if (source[index] === "+") { index += 1; return factor(); }
        if (source[index] === "-") { index += 1; return -factor(); }

        const start = index;
        while (/[\d.]/.test(source[index])) index += 1;
        const token = source.slice(start, index);
        if (!token || (token.match(/\./g) || []).length > 1) throw new Error("Invalid number");
        const value = Number(token);
        if (!Number.isFinite(value)) throw new Error("Invalid number");
        return value;
    }

    function term() {
        let value = factor();
        while (true) {
            skipSpaces();
            const operator = source[index];
            if (operator !== "*" && operator !== "/") return value;
            index += 1;
            const right = factor();
            if (operator === "/" && right === 0) throw new Error("Cannot divide by zero");
            value = operator === "*" ? value * right : value / right;
        }
    }

    function parseExpression() {
        let value = term();
        while (true) {
            skipSpaces();
            const operator = source[index];
            if (operator !== "+" && operator !== "-") return value;
            index += 1;
            const right = term();
            value = operator === "+" ? value + right : value - right;
        }
    }

    const value = parseExpression();
    skipSpaces();
    if (index !== source.length) throw new Error("Invalid expression");
    return value;
}

function calculate() {
    if (!expression || operatorPattern.test(expression.at(-1))) return;
    try {
        const answer = formatNumber(evaluate(expression));
        expressionElement.textContent = `${prettify(expression)} =`;
        resultElement.textContent = answer;
        expression = answer.replaceAll(",", "");
        justCalculated = true;
    } catch {
        resultElement.textContent = "Error";
        justCalculated = true;
    }
}

function handleInput(value) {
    if (/^\d$/.test(value)) appendDigit(value);
    else if (operatorPattern.test(value)) appendOperator(value);
    else if (value === ".") appendDecimal();
}

keypad.addEventListener("click", (event) => {
    const key = event.target.closest("button");
    if (!key) return;

    const { action, value } = key.dataset;
    if (value) handleInput(value);
    else if (action === "clear") clearCalculator();
    else if (action === "delete") deleteLast();
    else if (action === "decimal") appendDecimal();
    else if (action === "sign") toggleSign();
    else if (action === "percent") applyPercent();
    else if (action === "calculate") calculate();
});

window.addEventListener("keydown", (event) => {
    const { key } = event;
    if (/^\d$/.test(key) || operatorPattern.test(key) || key === ".") {
        handleInput(key);
        event.preventDefault();
    } else if (key === "Enter" || key === "=") {
        calculate();
        event.preventDefault();
    } else if (key === "Backspace") {
        deleteLast();
        event.preventDefault();
    } else if (key === "Escape" || key.toLowerCase() === "c") {
        clearCalculator();
        event.preventDefault();
    } else if (key === "%") {
        applyPercent();
        event.preventDefault();
    }
});

updateScreen();
