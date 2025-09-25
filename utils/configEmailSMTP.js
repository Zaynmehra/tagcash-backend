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
    rateLimit: 5,
    connectionTimeout: 60000,
    greetingTimeout: 30000,
    socketTimeout: 60000,
    tls: {
        rejectUnauthorized: false
    },
    debug: process.env.NODE_ENV !== 'production'
});

Transporter.verify((error, success) => {
    if (error) {
        console.error('SMTP connection verification failed:', error);
    } else {
        console.log('SMTP server is ready to take messages');
    }
});

function sendMail(mailOptions) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject({
                error: 'Email sending timeout',
                status: false
            });
        }, 90000);

        Transporter.sendMail(mailOptions, (error, info) => {
            clearTimeout(timeout);
            
            if (error) {
                console.error('Email sending failed:', {
                    message: error.message,
                    code: error.code,
                    command: error.command
                });
                
                reject({
                    error: error?.message || 'Connection timeout',
                    status: false,
                    code: error?.code
                });
            } else {
                console.log('Email sent successfully:', info.messageId);
                resolve({
                    status: true,
                    info: info,
                    messageId: info.messageId
                });
            }
        });
    });
}

const sendMailWithRetry = async (mailOptions, maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await sendMail(mailOptions);
            return result;
        } catch (error) {
            console.log(`Email attempt ${attempt} failed:`, error.error);
            
            if (attempt === maxRetries) {
                throw error;
            }
            
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        }
    }
};

module.exports = {
    sendMail,
    sendMailWithRetry
};