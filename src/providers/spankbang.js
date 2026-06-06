const cheerio = require('cheerio-without-node-native');

const TMDB_API_KEY = '439c478a771f35c05022f9feabcca01c';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const BASE_URL = "https://spankbang.com";

function getTMDBDetails(tmdbId, mediaType) {
    if (tmdbId && typeof tmdbId === 'string' && tmdbId.startsWith('cxxx:')) {
        try { return Promise.resolve({ title: decodeURIComponent(tmdbId.substring(5)) }); }
        catch(e) { return Promise.resolve({ title: tmdbId.substring(5) }); }
    }
    const endpoint = mediaType === 'tv' ? 'tv' : 'movie';
    const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    return fetch(url)
        .then(res => {
            if (!res.ok) throw new Error(`TMDB HTTP ${res.status}`);
            return res.json();
        })
        .then(data => {
            return {
                title: mediaType === 'tv' ? data.name : data.title
            };
        });
}

function getStreams(tmdbId, mediaType = 'movie', season = null, episode = null) {
    return getTMDBDetails(tmdbId, mediaType)
        .then(mediaInfo => {
            const query = mediaInfo.title;
            const searchUrl = `${BASE_URL}/s/${encodeURIComponent(query)}/1/?o=all`;
            
            return fetch(searchUrl, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
            })
            .then(res => {
                if (!res.ok) throw new Error(`Spankbang search HTTP ${res.status}`);
                return res.text();
            })
            .then(html => {
                const $ = cheerio.load(html);
                const results = [];
                
                $('div.video-item').each((i, el) => {
                    const imgElement = $(el).find('a.thumb > picture > img');
                    const title = imgElement.attr('alt') || "No Title";
                    const href = $(el).find('a.thumb').attr('href');
                    
                    if (href) {
                        const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
                        results.push({ title: title.trim(), url: fullUrl });
                    }
                });
                
                return results;
            })
            .then(results => {
                if (results.length === 0) return [];
                
                const matched = results[0];
                console.log(`[Spankbang] Matched search result: ${matched.title} -> ${matched.url}`);
                
                return fetch(matched.url, {
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                        "Referer": BASE_URL
                    }
                })
                .then(res => {
                    if (!res.ok) throw new Error(`Spankbang page HTTP ${res.status}`);
                    return res.text();
                })
                .then(pageHtml => {
                    const $ = cheerio.load(pageHtml);
                    const sourceUrl = $('div#video_container video > source').attr('src');
                    
                    if (!sourceUrl) return [];
                    
                    const fullUrl = sourceUrl.startsWith('http') ? sourceUrl : `${BASE_URL}${sourceUrl}`;
                    
                    return [{
                        name: "Spankbang (HLS)",
                        title: matched.title,
                        url: fullUrl,
                        quality: "1080p",
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                            "Referer": matched.url
                        }
                    }];
                });
            });
        })
        .catch(err => {
            console.error("[Spankbang Scraper Error]", err.message);
            return [];
        });
}

async function search(query) { return []; }
async function getMediaInfo(url) { return {}; }

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { search, getMediaInfo, getStreams };
} else {
    global.getStreams = getStreams;
}
