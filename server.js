var iso8601 = require('iso8601');
var dgram = require("dgram");
var http = require('http');
var udp = dgram.createSocket("udp4");

var envUrl = 'http://172.16.32.64/details.xml';
var cubeSvr = '127.0.0.1';

function get(cb) {
    var req = http.get(envUrl, function (res) {
        var data = '';
        res.on('data', function (chunk) { data += chunk; });
        res.on('end', function () { cb(data); });
        res.on('error', function () { });
    });

    req.on('error', function () { });
}

function next(ms) {
    var now = Date.now();
    var next = Math.ceil(now / ms) * ms;
    return next - now;
}

function send(result) {
    var buffer = new Buffer(JSON.stringify(result));
    udp.send(buffer, 0, buffer.length, 1180, cubeSvr);
    console.log(result);
}

var prevCounter;
function poll() {
    get(function (data) {
        var stamp = new Date();
        var result = { type: 'reading', time: stamp, data: { } };

        var m = data.match(/<Counter_A>([0-9.]+)/);
        if (m) {
            var counter = parseInt(m[1], 10);
            if (!prevCounter) {
                prevCounter = counter;
            } else {
                if (counter !== prevCounter) {
                    result.data.impulses = counter - prevCounter;
                    prevCounter = counter;
                }
            }
        }

        var m = data.match(/<PrimaryValue>([0-9.]+) Deg C/);
        if (m) {
            var temp = parseFloat(m[1]).toFixed(1);
            result.data.temperature = +temp;
        }

        if (result.data) {
            send(result);
        }

        setTimeout(poll, next(60000));
    });
}

poll();

