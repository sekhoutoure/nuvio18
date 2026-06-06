const cheerio = require('cheerio-without-node-native');

const TMDB_API_KEY = '439c478a771f35c05022f9feabcca01c';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const BASE_URL = "https://ixiporn.org";

function getTMDBDetails(tmdbId, mediaType) {
    if (tmdbId.startsWith('cxxx:')) {
        return Promise.resolve({ title: decodeURIComponent(tmdbId.substring(5)) });
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
            const query = mediaInfo.title.replace(/\s+/g, '-');
            const searchUrl = `${mainUrl}/page/$i?s=${encodeURIComponent(query)}`;
            
            return fetch(searchUrl, {
                headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
            })
            .then(res => res.text())
            .then(html => {
                const $ = cheerio.load(html);
                const results = [];
                
                $('div.col-12.col-md-4.col-lg-3.col-xl-3 > div.video-block').each((i, el) => {
                    const href = $(el).find('a').attr('href');
                    const title = $(el).find('a').text() || "No Title";
                    
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
                
                return fetch(matched.url, {
                    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Referer": BASE_URL }
                })
                .then(res => res.text())
                .then(pageHtml => {
                    // Try to blindly extract mp4 or m3u8
                    const videoRegex = /(https?:\/\/[^\s'"]+\.(?:mp4|m3u8)[^\s'"]*)/;
                    const match = pageHtml.match(videoRegex);
                    
                    if (match && match[1]) {
                        return [{
                            name: "ixiporn (Auto)",
                            title: matched.title,
                            url: match[1],
                            quality: "Unknown",
                            headers: { "User-Agent": "Mozilla/5.0", "Referer": matched.url }
                        }];
                    }
                    return [];
                });
            });
        })
        .catch(err => {
            console.error("[ixiporn Scraper Error]", err.message);
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
