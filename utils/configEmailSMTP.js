const nodemailer = require('nodemailer');

let Transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_SMTP_USERNAME,
        pass: process.env.EMAIL_SMTP_PASSWORD
    },
    pool: true,
    maxConnections: 3,
    rateDelta: 1000,
    rateLimit: 5
});

function sendMail(mailOptions) {
    return new Promise((resolve, reject) => {
        Transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                reject({
                    error: error?.message,
                    status: false
                });
            } else {
                resolve({
                    status: true,
                    info: info
                });
            }
        });
    });
}

module.exports = {
    sendMail,
};