const cryptoLib = require('cryptlib');

const encryption = {
    encrypt: (data, key, iv) => {
        try {
            return cryptoLib.encrypt(data, key, iv);
        } catch (error) {
            throw new Error('Encryption failed');
        }
    },

    decrypt: (encryptedData, key, iv) => {
        try {
            return cryptoLib.decrypt(encryptedData, key, iv);
        } catch (error) {
            throw new Error('Decryption failed');
        }
    },

    getHashSha256: (data, length) => {
        try {
            return cryptoLib.getHashSha256(data, length);
        } catch (error) {
            throw new Error('Hash generation failed');
        }
    }
};

module.exports = encryption;