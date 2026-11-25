// 조건문

// truthy -> 1, 2, -1, " ", "0", []
// falsy (6개)-> false, 0, "", null, undefined, NaN

let age = 7;

if (age <= 8) {
    console.log("어린이입니다");
} 

if (age <= 19) {
    console.log("학생입니다.")

} else {
    console.log("어른입니다.")
}