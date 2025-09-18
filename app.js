require('dotenv').config();
const connectDB = require('./config/database');
const express = require('express');
let app = express();
app.disable("x-powered-by");

var path = require('path');

const moment = require('moment');
moment.locale('en');

app.use(express.text());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const cors = require('cors');
app.use(cors());
require('aws-sdk/lib/maintenance_mode_message').suppress = true;



app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
        uptime: Math.floor(process.uptime()),
        memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
    });
});



const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    
    const requestData = {
        method: req.method,
        url: req.originalUrl || req.url,
        body: req.body
    };

    const originalJson = res.json;
    const originalSend = res.send;
    let responseBody = null;

    res.json = function(data) {
        responseBody = data;
        return originalJson.call(this, data);
    };

    res.send = function(data) {
        responseBody = data;
        return originalSend.call(this, data);
    };

    const logResponse = () => {
        const responseTime = Date.now() - startTime;
        console.log(`[${timestamp}] ${req.method} ${req.originalUrl || req.url} - ${res.statusCode} - ${responseTime}ms`);
        console.log('REQ:', requestData);
        console.log('RES:', responseBody);
        console.log('-'.repeat(50));
    };

    res.on('finish', logResponse);
    next();
};

app.use(requestLogger);

let auth_route = require('./routes/v1/auth.route');
let customer_route = require('./routes/v1/customer.route');
let brand_route = require('./routes/v1/brand.route');
let billing_route = require('./routes/v1/billing.route');
let category_route = require('./routes/v1/category.route');
let challenge_route = require('./routes/v1/challenge.route');
let admin_route = require('./routes/v1/admin.route');
let open_route = require('./routes/v1/open.route');
let communication_route = require('./routes/v1/communication.route');
let rate_route = require('./routes/v1/rateClassification.route');




app.use('/api/v1/auth', auth_route);
app.use('/api/v1/customer', customer_route);
app.use('/api/v1/brand', brand_route);
app.use('/api/v1/billing', billing_route);
app.use('/api/v1/category', category_route);
app.use('/api/v1/challenge', challenge_route);
app.use('/api/v1/admin', admin_route);
app.use('/api/v1/open', open_route);
app.use('/api/v1/communication', communication_route);
app.use('/api/v1/rate', rate_route);



app.use("*", (req, res) => {
    res.status(404);
    res.send('404 Not Found');
});

const os = require('os');

const getIPv4Address = () => {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const interface of interfaces[name]) {
            if (interface.family === 'IPv4' && !interface.internal) {
                return interface.address;
            }
        }
    }
    return '127.0.0.1';
};

connectDB();

const port = process.env.PORT || 6660;
const ipv4 = getIPv4Address();
let server = app.listen(port, () => {
    console.log(`Server running on ${ipv4}:${port}`);
});
server.setTimeout(50000);