const net = require("net");

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

const generateResponse = (val, socket) => {
    socket.write(`HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${val.length}\r\n\r\n${val}`)
    return;
}

// Uncomment this to pass the first stage
const server = net.createServer((socket) => {
    socket.on("data", (data) => {
        const request = data.toString().split("\r\n\r\n");
        const [requestLine, ...headers] = request[0].split('\r\n')
        const [method, endpoint, httpVersion] = requestLine.split(' ')
        const params = endpoint.split('/');
        const headersObj = headers.reduce((obj, header) => {
            const [key, value] = header.split(': ');
            obj[key.toLowerCase()] = value;
            return obj
        }, {});
        if (endpoint === '/') {
            socket.write("HTTP/1.1 200 OK\r\n\r\n")
        } else {
            switch (params[1]) {
                case 'echo': {
                    const val = params[params.length - 1];
                    socket.write(`HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${val.length}\r\n\r\n${val}`)
                }
                case 'user-agent': {
                    const userAgentValue = headersObj['user-agent'];
                    generateResponse(userAgentValue, socket)
                }
                default: {
                    socket.write("HTTP/1.1 404 Not Found\r\n\r\n")
                }
            }
        }
        socket.emit("close");
    })
    socket.on("close", () => {
        socket.end();
    });
});

server.listen(4221, "localhost");
