// --- Begin Configuration ---

var edsUrl = 'http://172.16.32.64/details.xml';
var cubeSvr = '127.0.0.1';
var extractions = [{
        exp: /<Counter_A>([0-9.]+)/,
        name: 'impulses',
        type: 'counter'
    }, {
        exp: /<PrimaryValue>(-?[0-9]+\.[0-9])[0-9]* Deg C/,
        name: 'temperature',
        type: 'gauge'
}];

// --- End of Configuration ---

var dgram = require('dgram');
var fs = require('fs');
var http = require('http');
var iso8601 = require('iso8601');
var path = require('path');

var udp = dgram.createSocket('udp4');
var stateFile = path.normalize(path.join(process.env.HOME || '/var/tmp', 'counterstate.json'))

function get(cb) {
    var req = http.get(edsUrl, function (res) {
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

function poll() {
    var stamp = new Date();
    get(function (data) {
        var result = { type: 'reading', time: stamp, data: { } };
        extractions.forEach(function (ex) {
            var m = data.match(ex.exp);
            if (m) {
                var value = +m[1];
                if (ex.type == 'counter') {
                    result.data[ex.name] = counterDiff(ex.name, value);
                } else {
                    result.data[ex.name] = value;
                }
            }
        });

        if (result.data) {
            send(result);
        }

        setTimeout(poll, next(60000));
    });
}

state = loadState();
stateDirty = false;
saveState();
poll();

