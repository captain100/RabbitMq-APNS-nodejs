module.exports = {
    //db: 'mongodb://localhost:27017/wedate',
    db: 'mongodb://10.0.0.51:10002,10.0.0.52:10001,10.0.0.53:10003/wedate',
    rabbitmq:'localhost',
    rabbitmqPort:5672,
    rabbitmqUser:'guest',
    rabbitmqPassword:'guest',
    queue: 'APNS',
    exchange: 'router',
    routingKey: 'A'
};
