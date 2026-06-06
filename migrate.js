const fs = require('fs');
const path = require('path');

const repoPath = path.join(__dirname, 'scratch', 'CXXX');
const srcDir = path.join(__dirname, 'src', 'providers');
const manifestPath = path.join(__dirname, 'manifest.json');

// Ensure providers directory exists
if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir, { recursive: true });
}

// Load existing manifest
let manifest;
try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
} catch (e) {
    manifest = {
        name: "CXXX Nuvio Providers",
        version: "1.0.0",
        scrapers: []
    };
}

if (!manifest.scrapers) manifest.scrapers = [];

// Helper to get existing scraper by ID
function getScraperById(id) {
    return manifest.scrapers.find(s => s.id === id);
}

// Helper to extract regex match
function extractMatch(content, regex, fallback = '') {
    const match = content.match(regex);
    return match ? match[1] : fallback;
}

const folders = fs.readdirSync(repoPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
    .map(dirent => dirent.name);

console.log(`Found ${folders.length} possible provider folders...`);

let addedCount = 0;

for (const folder of folders) {
    let files = [];
    try {
        const glob = require('fs').readdirSync(path.join(repoPath, folder, 'src', 'main', 'kotlin'), { recursive: true });
        files = glob.filter(f => f.endsWith('.kt')).map(f => path.join(repoPath, folder, 'src', 'main', 'kotlin', f));
    } catch (e) {
        continue;
    }

    let pluginName = folder;
    let mainUrl = '';
    let lang = 'en';

    for (const filePath of files) {
        const content = fs.readFileSync(filePath, 'utf-8');
        if (content.includes('class') && (content.includes('MainAPI') || content.includes('ParsedHttpSource'))) {
            const extractedName = extractMatch(content, /override\s+var\s+name\s*=\s*"([^"]+)"/);
            if (extractedName) pluginName = extractedName;

            const extractedUrl = extractMatch(content, /override\s+var\s+mainUrl\s*=\s*"([^"]+)"/);
            if (extractedUrl) mainUrl = extractedUrl;

            const extractedLang = extractMatch(content, /override\s+var\s+lang\s*=\s*"([^"]+)"/);
            if (extractedLang) lang = extractedLang;
        }
    }

    const id = pluginName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const filename = `providers/${id}.js`;

    // Skip if already in manifest (e.g. hanime, xvideos, xnxx)
    if (getScraperById(id)) {
        console.log(`Skipping ${id}, already exists in manifest.`);
        continue;
    }

    console.log(`Porting: ${pluginName} (${id})`);

    // Add to manifest
    manifest.scrapers.push({
        id: id,
        name: pluginName,
        description: `${pluginName} adult streaming provider ported from CXXX`,
        version: "1.0.0",
        author: "CXXX Port Automation",
        supportedTypes: ["movie"],
        filename: filename,
        enabled: true,
        formats: ["m3u8", "mp4"],
        logo: mainUrl ? `https://www.google.com/s2/favicons?domain=${new URL(mainUrl).hostname}&sz=128` : "https://via.placeholder.com/128",
        contentLanguage: [lang]
    });

    // Create stub JS file for the provider
    const jsContent = `const cheerio = require('cheerio');

const BASE_URL = "${mainUrl}";

async function search(query) {
    // TODO: Implement search logic translated from Kotlin
    return [];
}

async function getMediaInfo(url) {
    // TODO: Implement info extraction logic translated from Kotlin
    return {
        id: url,
        title: "Unknown",
        episodes: []
    };
}

async function getStreams(url) {
    // TODO: Implement stream extraction logic translated from Kotlin
    return [];
}

module.exports = {
    search,
    getMediaInfo,
    getStreams
};
`;

    fs.writeFileSync(path.join(srcDir, `${id}.js`), jsContent);
    addedCount++;
}

// Save manifest
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log(`\nMigration completed! Added ${addedCount} new providers.`);
