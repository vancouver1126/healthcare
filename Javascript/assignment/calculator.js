// 더하기
function add(a, b) {
    return a + b;
}
// 빼기
function subtract(a, b) {
    return a - b;
}
// 곱하기
function multiply(a, b) {
    return a * b;
}
// 나누기
function divide(a, b) {
    return a / b;
}
// 제곱: a의 b제곱 (예: 2 ^ 3 = 8)
function power(a, b) {
    return a ** b;
}
// 루트: a의 제곱근 (예: sqrt 9 = 3)
function squareRoot(a) {
    return Math.sqrt(a);
}
// 시그마: start부터 end까지 정수의 합 (예: sigma 1 10 = 55)
function sigma(start, end) {
    let sum = 0;
    for (let k = start; k <= end; k++) {
        sum += k;
    }
    return sum;
}

function inputFormula() {
    return prompt("계산식을 입력하세요.(예: 1 + 2 ^ 3 * 4, sqrt 16 + 1, sigma 1 10 - 5)");
}

function calculate(formula) {
    // 숫자, 연산자, sqrt, sigma를 띄어쓰기 없이도 하나씩 잘라내기
    const pieces = formula.match(/\d+(\.\d+)?|sqrt|sigma|[+\-*/^√Σ]/g) || [];
    const rawTokens = [];
    for (const piece of pieces) {
        const prev = rawTokens[rawTokens.length - 1];
        const beforePrev = rawTokens[rawTokens.length - 2];
        // 맨 앞이나 연산자 뒤에 오는 "-"는 음수 부호로 숫자에 붙이기 (예: sqrt -4, 2 * -3)
        if (!isNaN(Number(piece)) && prev === "-" && isNaN(Number(beforePrev))) {
            rawTokens.pop();
            rawTokens.push("-" + piece);
        } else {
            rawTokens.push(piece);
        }
    }

    // 0단계: 루트와 시그마를 먼저 숫자로 바꾸기
    const tokens = [];
    let n = 0;
    while (n < rawTokens.length) {
        const token = rawTokens[n];
        if (token === "sqrt" || token === "√") {
            const value = Number(rawTokens[n + 1]);
            if (isNaN(value)) return "루트 뒤에 숫자를 입력하세요. (예: sqrt 9)";
            if (value < 0) return "음수의 제곱근은 계산할 수 없습니다.";
            tokens.push(squareRoot(value));
            n += 2; // sqrt와 숫자 건너뜀
        } else if (token === "sigma" || token === "Σ") {
            const start = Number(rawTokens[n + 1]);
            const end = Number(rawTokens[n + 2]);
            if (!Number.isInteger(start) || !Number.isInteger(end)) {
                return "시그마 뒤에 정수 2개를 입력하세요. (예: sigma 1 10)";
            }
            if (start > end) return "시그마의 시작값은 끝값보다 클 수 없습니다.";
            tokens.push(sigma(start, end));
            n += 3; // sigma와 숫자 2개 건너뜀
        } else {
            tokens.push(token);
            n++;
        }
    }

    // 숫자 연산자 숫자 ... 형태라 토큰 개수는 항상 홀수
    if (tokens.length % 2 === 0) {
        return "잘못된 계산식이 입력되었습니다.";
    }

    // 1단계: 제곱 먼저 처리 (오른쪽부터 계산: 2 ^ 3 ^ 2 = 2 ^ 9)
    const powerTokens = [];
    let p = tokens.length - 1;
    while (p >= 0) {
        const token = tokens[p];
        if (token === "^") {
            const right = Number(powerTokens.shift());
            const left = Number(tokens[p - 1]);
            if (isNaN(left) || isNaN(right)) return "잘못된 숫자가 입력되었습니다.";
            powerTokens.unshift(power(left, right));
            p -= 2; // 연산자와 왼쪽 피연산자 건너뜀
        } else {
            powerTokens.unshift(token);
            p--;
        }
    }

    // 2단계: 곱셈과 나눗셈 처리
    const intermediateTokens = [];
    let i = 0;
    while (i < powerTokens.length) {
        const token = powerTokens[i];
        if (token === "*" || token === "/") {
            const left = Number(intermediateTokens.pop());
            const operator = token;
            const right = Number(powerTokens[i + 1]);

            if (isNaN(left) || isNaN(right)) return "잘못된 숫자가 입력되었습니다.";

            let res;
            if (operator === "*") {
                res = multiply(left, right);
            } else {
                if (right === 0) return "0으로 나눌 수 없습니다.";
                res = divide(left, right);
            }
            intermediateTokens.push(res);
            i += 2; // 연산자와 오른쪽 피연산자 건너뜀
        } else {
            intermediateTokens.push(token);
            i++;
        }
    }

    // 3단계: 덧셈과 뺄셈 처리
    let result = Number(intermediateTokens[0]);
    if (isNaN(result)) return "잘못된 숫자가 입력되었습니다.";

    for (let j = 1; j < intermediateTokens.length; j += 2) {
        const operator = intermediateTokens[j];
        const nextValue = Number(intermediateTokens[j + 1]);

        if (isNaN(nextValue)) return "잘못된 숫자가 입력되었습니다.";

        if (operator === "+") {
            result = add(result, nextValue);
        } else if (operator === "-") {
            result = subtract(result, nextValue);
        } else {
            return `예외 발생: ${operator}`;
        }
    }
    return result;
}

function start(formula) {
    let input = formula;
    
    // 인자가 없으면 prompt로 물어봄
    if (!input) {
        input = inputFormula();
    }
    
    if (!input) {
        console.log("계산식을 입력해주세요.");
        return;
    }

    const result = calculate(input);
    if (typeof result === "string") {
        console.log(`에러 발생: ${result}`);
    } else {
        console.log(`결과: ${result}`);
    }
}