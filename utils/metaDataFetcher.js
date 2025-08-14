const request = require('request');
const Bill = require('../models/v1/Bill');

const fetchInstagramMetadata = async (instaContentUrl, billId, fetchDate) => {
    try {
        const options = {
            method: 'GET',
            url: 'https://instagram-statistics-api.p.rapidapi.com/posts/one',
            qs: {
                postUrl: instaContentUrl
            },
            headers: {
                'x-rapidapi-key': process.env.RAPIDAPI_KEY,
                'x-rapidapi-host': 'instagram-statistics-api.p.rapidapi.com'
            }
        };

        return new Promise((resolve, reject) => {
            request(options, async function (error, response, body) {
                if (error) {
                    console.error("Error fetching metadata:", error);
                    return reject(new Error("metadata_fetch_error"));
                }
                try {
                    const result = JSON.parse(body);
                    console.log("Metadata result:", result);
                    
                    if (result && result.meta && result.meta.code == 200) {
                        await Bill.findByIdAndUpdate(billId, {
                            likes: result.data.likes || 0,
                            comments: result.data.comments || 0,
                            views: result.data.views || 0,
                            metaFetch: fetchDate
                        });
                    }
                    resolve(result);
                } catch (parseError) {
                    console.error("Error parsing metadata response:", parseError);
                    reject(new Error("metadata_parse_error"));
                }
            });
        });
    } catch (error) {
        console.error("Error fetching metadata:", error);
        throw new Error("metadata_fetch_error");
    }
};

const fetchInstagramUserData = async (username) => {
    try {
        const options = {
            method: 'GET',
            url: 'https://instagram-statistics-api.p.rapidapi.com/user',
            qs: {
                username: username
            },
            headers: {
                'x-rapidapi-key': process.env.RAPIDAPI_KEY,
                'x-rapidapi-host': 'instagram-statistics-api.p.rapidapi.com'
            }
        };

        return new Promise((resolve, reject) => {
            request(options, function (error, response, body) {
                if (error) {
                    console.error("Error fetching user data:", error);
                    return reject(new Error("user_data_fetch_error"));
                }
                try {
                    const result = JSON.parse(body);
                    resolve(result);
                } catch (parseError) {
                    console.error("Error parsing user data response:", parseError);
                    reject(new Error("user_data_parse_error"));
                }
            });
        });
    } catch (error) {
        console.error("Error fetching user data:", error);
        throw new Error("user_data_fetch_error");
    }
};

module.exports = {
    fetchInstagramMetadata,
    fetchInstagramUserData
};