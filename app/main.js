const net = require("net");
const fs = require("fs")

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

const generateResponse = (val, contentType = 'text/plain', statuMsg = '200 OK') => {
    return {
        header: `HTTP/1.1 ${statuMsg}\r\nContent-Type: ${contentType}\r\nContent-Length: ${val.length}`,
        body: `\r\n\r\n${val}`
    }
}

// Uncomment this to pass the first stage
const server = net.createServer((socket) => {
    socket.on("data", (data) => {
        const request = data.toString().split("\r\n\r\n");
        const [requestLine, ...headers] = request[0].split('\r\n')
        const requestBody = request[1]
        const [method, endpoint, httpVersion] = requestLine.split(' ')
        const params = endpoint.split('/');
        const headersObj = headers.reduce((obj, header) => {
            const [key, value] = header.split(': ');
            obj[key.toLowerCase()] = value;
            return obj
        }, {});
        const closeConnection = headersObj["connection"] && headersObj["connection"].toLowerCase() === "close";
        let response = {
            header: "",
            body: ""
        }
        if (endpoint === '/') {
            response = {
                header: "HTTP/1.1 200 OK",
                body: "\r\n\r\n"
            }
        } else {
            switch (params[1]) {
                case 'echo': {
                    const val = params[params.length - 1];
                    response = {
                        header: `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${val.length}`,
                        body: `\r\n\r\n${val}`
                    }
                    break;
                }
                case 'user-agent': {
                    const userAgentValue = headersObj['user-agent'];
                    response = generateResponse(userAgentValue);
                    break;
                }
                case 'files': {
                    switch (method.toLowerCase()) {
                        case 'get': {
                            try {
                                const folder = process.argv[3]
                                const fileName = params[params.length - 1];
                                const fileContent = fs.readFileSync(`${folder}${fileName}`)
                                response = generateResponse(fileContent, 'application/octet-stream');
                                break;
                            } catch (err) {
                                response = {
                                    header: "HTTP/1.1 404 Not Found",
                                    body: "\r\n\r\n"
                                }
                            }
                            break;
                        }
                        case 'post': {
                            const folder = process.argv[3]
                            const fileName = params[params.length - 1];
                            fs.mkdirSync(folder, { recursive: true })
                            fs.writeFileSync(`${folder}${fileName}`, requestBody)
                            response = generateResponse('', 'application/octet-stream', '201 Created');
                            break;
                        }
                    }
                }
                default: {
                    response = {
                        header: "HTTP/1.1 404 Not Found",
                        body: "\r\n\r\n"
                    }
                }
            }
        }
        // socket.emit("close");
        if (closeConnection) {
            socket.write(response.header + "\r\nConnection: close" + response.body)
            socket.close();
        } else {
            socket.write(response.header + response.body)
        }
    })
    socket.on("close", () => {
        socket.end();
    });
});

server.listen(4221, "localhost");
