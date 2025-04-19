const net = require("net");
const fs = require("fs");
const zlib = require("zlib");

const supportedEncodings = new Set(['gzip'])
// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

const generateResponse = (val, contentType = 'text/plain', statuMsg = '200 OK') => {
    return {
        header: `HTTP/1.1 ${statuMsg}\r\nContent-Type: ${contentType}\r\nContent-Length: ${val.length}`,
        body: `${val}`
    }
}

// Uncomment this to pass the first stage
const server = net.createServer((socket) => {
    socket.on("data", async (data) => {
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
                body: ""
            }
        } else {
            switch (params[1]) {
                case 'echo': {
                    const val = params[params.length - 1];
                    response = {
                        header: `HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${val.length}`,
                        body: `${val}`
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
                                    body: ""
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
                    break;
                }
                default: {
                    response = {
                        header: "HTTP/1.1 404 Not Found",
                        body: ""
                    }
                }
            }
        }
        if (headersObj['accept-encoding']) {
            const compatibleEncoding = headersObj['accept-encoding'].split(', ');
            const availableEncoding = compatibleEncoding.find((encoding) => supportedEncodings.has(encoding))
            if (availableEncoding) {
                // preform encoding
                response.header += `\r\nContent-Encoding: ${availableEncoding}`
                switch (availableEncoding) {
                    case 'gzip': {
                        const compressedBody = zlib.gzipSync(response.body);
                        response.body = compressedBody
                        response.header += `\r\nContent-Length: ${response.body.length}`
                        break;
                    }
                }
            }
        }
        // socket.emit("close");
        if (closeConnection) {
            socket.write(response.header + "\r\nConnection: close" + "\r\n\r\n");
            socket.write(response.body)
            socket.emit("close");
        } else {
            socket.write(response.header + "\r\n\r\n");
            socket.write(response.body)
        }
    })
    socket.on("close", () => {
        socket.end();
    });
});

server.listen(4221, "localhost");
