var dgram = require('dgram');
var fs = require('fs');
var http = require('http');
var iso8601 = require('iso8601');
var path = require('path');

var udp = dgram.createSocket('udp4');

var stateFile = path.normalize(path.join(process.env.HOME || '/var/tmp', '.counterstate.json'))
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
    var wait = next - now - 500;
    if (wait < 0.25 * ms) {
        wait += ms;
    }
    return wait;
}

function send(result) {
    var buffer = new Buffer(JSON.stringify(result));
    udp.send(buffer, 0, buffer.length, 1180, cubeSvr);
    console.log(result);
}

state = loadState();
stateDirty = false;
saveState();

function saveState() {
    if (stateDirty) {
        fs.writeFileSync(stateFile, JSON.stringify(state), 'utf-8');
        stateDirty = false;
    }

    setTimeout(saveState, 1000);
}

function loadState() {
    try {
        return JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    } catch (e) {
        return {}
    }
}

function counterDiff(name, curValue) {
    var diff;
    if (state[name] !== undefined) {
        diff = curValue - state[name];
    }

    state[name] = curValue;
    stateDirty = true;

    return diff;
}

var prevCounter;
function poll() {
    var stamp = new Date();
    get(function (data) {
        var result = { type: 'reading', time: stamp, data: { } };

        var m = data.match(/<Counter_A>([0-9.]+)/);
        if (m) {
            var counter = parseInt(m[1], 10);
            result.data.impulses = counterDiff('impulses', counter);
        }

        var m = data.match(/<PrimaryValue>(-?[0-9.]+) Deg C/);
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

