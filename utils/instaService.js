const axios = require('axios');
const cheerio = require('cheerio');

async function getInstagramFollower(profileUrlOrUserId) {
    try {
        const username = profileUrlOrUserId.split('/').filter(Boolean).pop() || profileUrlOrUserId;
        const url = profileUrlOrUserId.startsWith('http') ? profileUrlOrUserId : `https://www.instagram.com/${profileUrlOrUserId}/`;

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none'
        };

        const response = await axios.get(url, {
            headers,
            timeout: 10000,
            maxRedirects: 5
        });

        const $ = cheerio.load(response.data);

        // Initialize the instaDetails object with default values
        let instaDetails = {
            followersCount: 0,
            followingCount: 0,
            postsCount: 0
        };

        // Method 1: Try to extract from window._sharedData
        $('script').each((i, script) => {
            const content = $(script).html();
            if (content && content.includes('window._sharedData')) {
                try {
                    const match = content.match(/window\._sharedData\s*=\s*({.+?});/);
                    if (match) {
                        const data = JSON.parse(match[1]);
                        const userInfo = data?.entry_data?.ProfilePage?.[0]?.graphql?.user;

                        if (userInfo) {
                            if (userInfo.edge_followed_by?.count) {
                                instaDetails.followersCount = userInfo.edge_followed_by.count;
                            }
                            if (userInfo.edge_follow?.count) {
                                instaDetails.followingCount = userInfo.edge_follow.count;
                            }
                            if (userInfo.edge_owner_to_timeline_media?.count) {
                                instaDetails.postsCount = userInfo.edge_owner_to_timeline_media.count;
                            }
                        }
                    }
                } catch (e) { }
            }
        });

        // Method 2: Try to extract from JSON-LD structured data
        if (instaDetails.followersCount === 0) {
            $('script[type="application/ld+json"]').each((i, script) => {
                try {
                    const jsonData = JSON.parse($(script).html());
                    if (jsonData.mainEntityOfPage?.interactionStatistic) {
                        const stats = jsonData.mainEntityOfPage.interactionStatistic;

                        const followStat = stats.find(stat =>
                            stat.interactionType === 'http://schema.org/FollowAction'
                        );
                        if (followStat?.userInteractionCount) {
                            instaDetails.followersCount = parseInt(followStat.userInteractionCount);
                        }
                    }
                } catch (e) { }
            });
        }

        // Method 3: Try to extract from meta description
        if (instaDetails.followersCount === 0) {
            const metaContent = $('meta[property="og:description"]').attr('content');
            if (metaContent) {
                // Extract followers
                const followersMatch = metaContent.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*Followers/i);
                if (followersMatch) {
                    instaDetails.followersCount = parseCountString(followersMatch[1]);
                }

                // Extract following
                const followingMatch = metaContent.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*Following/i);
                if (followingMatch) {
                    instaDetails.followingCount = parseCountString(followingMatch[1]);
                }

                // Extract posts
                const postsMatch = metaContent.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*Posts/i);
                if (postsMatch) {
                    instaDetails.postsCount = parseCountString(postsMatch[1]);
                }
            }
        }

        // Method 4: Try to extract from any script containing edge data
        if (instaDetails.followersCount === 0) {
            $('script').each((i, script) => {
                const content = $(script).html();
                if (content && (content.includes('edge_followed_by') || content.includes('edge_follow') || content.includes('edge_owner_to_timeline_media'))) {
                    try {
                        // Look for JSON objects containing edge data
                        const jsonMatches = content.match(/{[^{}]*"edge_(?:followed_by|follow|owner_to_timeline_media)"[^{}]*}/g);
                        if (jsonMatches) {
                            for (const match of jsonMatches) {
                                try {
                                    const data = JSON.parse(match);

                                    if (data.edge_followed_by?.count && instaDetails.followersCount === 0) {
                                        instaDetails.followersCount = data.edge_followed_by.count;
                                    }
                                    if (data.edge_follow?.count && instaDetails.followingCount === 0) {
                                        instaDetails.followingCount = data.edge_follow.count;
                                    }
                                    if (data.edge_owner_to_timeline_media?.count && instaDetails.postsCount === 0) {
                                        instaDetails.postsCount = data.edge_owner_to_timeline_media.count;
                                    }
                                } catch (e) { }
                            }
                        }
                    } catch (e) { }
                }
            });
        }

        // Method 5: Try to extract from page text (fallback method)
        if (instaDetails.followersCount === 0 || instaDetails.followingCount === 0 || instaDetails.postsCount === 0) {
            const pageText = $('body').text();

            if (instaDetails.followersCount === 0) {
                const followersMatch = pageText.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*followers/i);
                if (followersMatch) {
                    instaDetails.followersCount = parseCountString(followersMatch[1]);
                    instaDetails.memberType =  getMemberType(parseCountString(followersMatch[1]));
                }
            }

            if (instaDetails.followingCount === 0) {
                const followingMatch = pageText.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*following/i);
                if (followingMatch) {
                    instaDetails.followingCount = parseCountString(followingMatch[1]);
                }
            }

            if (instaDetails.postsCount === 0) {
                const postsMatch = pageText.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)\s*posts/i);
                if (postsMatch) {
                    instaDetails.postsCount = parseCountString(postsMatch[1]);
                }
            }
        }

        console.log({
            followersCount: instaDetails.followersCount,
            followingCount: instaDetails.followingCount,
            postsCount: instaDetails.postsCount,
            memberType : getMemberType(instaDetails.followersCount),
        })

        return {
            followersCount: instaDetails.followersCount,
            followingCount: instaDetails.followingCount,
            postsCount: instaDetails.postsCount,
            memberType : getMemberType(instaDetails.followersCount),
        }

    } catch (error) {
        return {
            followersCount: 0,
            followingCount: 0,
            postsCount: 0,
            memberType : "Starter Member"
        }
    }
}

function parseCountString(str) {
    const cleanStr = str.replace(/,/g, '');
    const multipliers = { K: 1000, M: 1000000, B: 1000000000 };

    const match = cleanStr.match(/^(\d+(?:\.\d+)?)([KMB]?)$/i);
    if (match) {
        const num = parseFloat(match[1]);
        const multiplier = multipliers[match[2]?.toUpperCase()] || 1;
        return Math.round(num * multiplier);
    }
    return parseInt(cleanStr) || 0;
}

const getMemberType = (followersCount) => {

    if (followersCount <= 1000) {
        return "Starter Member"
    } else if (followersCount > 1000 && followersCount <= 5000 ) {
        return "Bronze Member"
    }
    else if (followersCount > 5000 && followersCount <= 10000) {
        return "Silver Member"
    } 
    else if (followersCount > 10000 && followersCount <= 18000) {
        return "Gold Member"
    }
    else if (followersCount > 18000) {
        return "Priority Member"
    } 
    else {
        return "Starter Member"
    }
}

const getInstagramFollowers = async (username) => {
    try {
        const options = {
            method: 'POST',
            url: 'https://instagram-scraper-stable-api.p.rapidapi.com/ig_get_fb_profile.php',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
                'X-RapidAPI-Host': 'instagram-scraper-stable-api.p.rapidapi.com'
            },
            data: `username_or_url=${username}`
        };

        const response = await axios.request(options);

        if (response.data) {
            const userData = response.data;
            
            // Extract the required fields from the response
            const followersCount = userData.follower_count || 0;
            const followingCount = userData.following_count || 0;
            const postsCount = userData.media_count || 0;
            const profilePicUrl = userData?.hd_profile_pic_url_info?.url || '';
            const fullName = userData.full_name || '';
            
            // Calculate member type
            const memberType = getMemberType(followersCount);

            return {
                followersCount: followersCount,
                followingCount: followingCount,
                postsCount: postsCount,
                profile_pic_url: profilePicUrl,
                full_name: fullName,
                memberType: memberType
            };
        } else {
            return {
                followersCount: 0,
                followingCount: 0,
                postsCount: 0,
                profile_pic_url: '',
                full_name: '',
                memberType: "Starter Member"
            };
        }
    } catch (error) {
        console.error('Error fetching Instagram data:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message
        });
        return {
            followersCount: 0,
            followingCount: 0,
            postsCount: 0,
            profile_pic_url: '',
            full_name: '',
            memberType: "Starter Member"
        };
    }
};

const getInstagramPostMetrics = async (reelUrl) => {
    try {

        let postUrl = reelUrl;
        if (reelUrl.includes('/reels/')) {
            postUrl = reelUrl.replace('/reels/', '/p/');
        }

        const options = {
            method: 'GET',
            url: 'https://instagram-scraper-stable-api.p.rapidapi.com/get_media_data.php',
            params: {
                reel_post_code_or_url: postUrl,
                type: 'post'
            },
            headers: {
                'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
                'X-RapidAPI-Host': 'instagram-scraper-stable-api.p.rapidapi.com'
            }
        };

        const response = await axios.request(options);

        if (response.data) {
            const mediaData = response.data;
            const viewsCount = mediaData.video_play_count || 0;
            const likesCount = mediaData.edge_media_preview_like?.count || 0;
            const commentsCount = mediaData.edge_media_preview_comment?.count || 0;
            const playCount = mediaData.video_view_count || 0;
            
            return {
                viewsCount: viewsCount,
                likesCount: likesCount,
                commentsCount: commentsCount,
                playCount: playCount
            };
        } else {
             throw new Error('No data received from Instagram API');
        }
    } catch (error) {
        console.error('Error fetching Instagram Reel data:', error.message);
        throw error; 
    }
};

module.exports = {
    getInstagramFollowers, getMemberType, getInstagramPostMetrics
};