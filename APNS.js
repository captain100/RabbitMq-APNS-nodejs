var apns = require("apn");
var Subscriber = require("./models/subscriber.js");
var settings = require("./settings.js");
var fs = require('fs');
var pushLogfile = fs.createWriteStream('push.log',{flags:'a'});

var _log = function(msg) {
    console.log(msg);
};

var amqp = require('amqp');

var connection = amqp.createConnection({ host: settings.rabbitmq,
					 port: settings.rabbitmqPort,
					 login: settings.rabbitmqUser,
					 passsword: settings.rabbitmqPassword });

connection.on('ready',function(){
    console.log('connect to the APNS Queue');
    connection.exchange(settings.exchange, {type: 'direct',autoDelete: false,confirm: true}, function(exchange){
        connection.queue(settings.queue, {exclusive: false}, function(queue){
            queue.bind(settings.exchange, settings.routingKey);
            queue.subscribe(function(msg){
                var encoded_payload = unescape(msg.data);
                var payload = JSON.parse(encoded_payload); //JSON dict
                var starId = payload.starId;
                var message = payload.message;
	        var noticeType = payload.noticeType;
                var badge = parseInt(payload.badge,10) || 0;
                doPushMessage(starId, message, noticeType, badge, function(err) {
                    if (err) {
                        var meta = '['+ new Date() +']' + starId + '\n';  
                        pushLogfile.write(meta + err +'\n');
                    }
                });
            });
        });
    });
});

var doPushMessage = function(starId, message, noticeType, badge, callback){
    getSubscribersbystarId(starId, function(err,devices){
        if(err){
            return callback(err);
        }
        if(devices){
            var connectionOptions = {
            "cert": "certs/cert.pem",
            "key": "certs/key.pem",
            "gateway": "gateway.sandbox.push.apple.com"
            /* legacy: true */
            };
            var apnsConnection = new apns.Connection(connectionOptions);
            /*
            apnsConnection.on("connected", function(openSockets) {
                          _log("connected to apns!");
                        });

            apnsConnection.on("disconnected", function(openSockets) {
                          _log("disconnected from apns!");
                        });

            apnsConnection.on("transmitted", function(note, device) {
                          _log("sent note to device: " + device);
                        });
            */
            apnsConnection.on("error", function(err) {
                          pushLogfile.write("apns connection error: " + err + '\n');
                        });

            apnsConnection.on("socketError", function(err) {
                          pushLogfile.write("socket error: " + err + '\n');
                        });
            var tokenHashTable = {};
            for (var i in devices) {
                var device = devices[i];
                var deviceToken = device.deviceToken;

                if (!validateDeviceToken(deviceToken,tokenHashTable)) {
                    continue;
                }

                var apnsDevice = new apns.Device(deviceToken);

                var note = new apns.Notification();
                note.badge = badge;
                note.alert = message;
                note.sound = "ping.aiff";
		        note.payload = {'type':noticeType};

                apnsConnection.pushNotification(note, apnsDevice);

                pushLogfile.write("sending note to deviceToken: " + deviceToken + '\n');
            }

            apnsConnection.shutdown();
            callback(null);
        }else{
            callback(null);
        }
    });
};

var validateDeviceToken = function(token,tokenHashTable) {
    if (token.length < 64) {
        return false;
    }
    if(tokenHashTable[token] === undefined){
        tokenHashTable[token] = 1;
        return true;
    }else{
        return false;
    }
};

var getSubscribersbystarId = function(starId, callback) {

    Subscriber.getSubscriberbyStarId(starId,function(err,devices){
        if(err){
            return callback(err);
        }else if(devices){
            return callback(null,devices);
        }else{
            return callback(null,null);
        }
    });
};
