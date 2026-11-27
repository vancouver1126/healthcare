// FecthAPI: HTTP 요청을 보내고 응답 받는 API



// JSON(= JavaScript Object Notation)
// != JS Object
fetch("https://jsonplaceholder.typicode.com/posts", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(
    {title: "Python", body: "Hello, Python"})
})

    .then(response => response.json())
    .then(data => console.log(data))