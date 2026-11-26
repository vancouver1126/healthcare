// Timer API

// 특정 시간 이후에 동작할 함수를 예약
setTimeout(
    // 함수
    () => console.log("3초 경과!"),
    // 시간 (ms)
    3000
);

// 특정 시간마다 동작하는 함수를 예약
setInterval(
    //함수
    () => console.log("1초 경과!"),
    //시간
    1000000000
);
