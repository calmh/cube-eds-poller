var snmp = require('snmp-native');
var iso8601 = require('iso8601');
var dgram = require("dgram");
var udp = dgram.createSocket("udp4");

var host = '172.16.32.64';
var community = 'public';
var impulsesOid = [1, 3, 6, 1, 4, 1, 31440, 10, 7, 1, 1, 1];
var tempOid = [1, 3, 6, 1, 4, 1, 31440, 10, 5, 1, 1, 0];
var session = new snmp.Session({ host: host, community: community });

var options = {
    host: '172.16.32.13',
    port: 1080,
    path: '/1.0/event/put',
    method: 'POST'
};

function wait(ms) {
    var now = Date.now();
    var next = (Math.floor(now / ms) + 1) * ms;
    return next - now;
}

function send(result) {
    var buffer = new Buffer(JSON.stringify(result));
    udp.send(buffer, 0, buffer.length, 1180, '127.0.0.1');
    console.log(result);
}

var prevCounter;
var results = [];
function poll() {
    session.get({ oid: impulsesOid }, function (err, varbinds) {
        if (!err) {
            var counter = varbinds[0].value;
            if (!prevCounter) {
                prevCounter = counter;
            } else {
                if (counter !== prevCounter) {
                    var stamp = iso8601.fromDate(new Date(varbinds[0].receiveStamp));
                    var result = { type: 'reading', time: stamp, data: { impulses: counter - prevCounter } };
                    send(result);
                    prevCounter = counter;
                }
            }
        }

        setTimeout(poll, wait(10000));
    });
}

function pollTemperature() {
    session.get({ oid: tempOid }, function (err, varbinds) {
        if (!err) {
            var temp = (+varbinds[0].value).toFixed(1);
            var stamp = iso8601.fromDate(new Date(varbinds[0].receiveStamp));
            var result = { type: 'reading', time: stamp, data: { temperature: +temp } };
            send(result);
        }

        setTimeout(pollTemperature, wait(60000));
    });
}

poll();
pollTemperature();

