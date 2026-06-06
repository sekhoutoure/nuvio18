const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');

const manifest = {
    id: 'com.nuvio.adultcatalog',
    version: '1.0.0',
    name: 'Nuvio CXXX Catalog',
    description: 'Adult Catalog for Nuvio CXXX Plugins',
    catalogs: [
        {
            type: 'movie',
            id: 'adult_top',
            name: 'Top Adult Videos'
        },
        {
            type: 'movie',
            id: 'adult_new',
            name: 'Newest Adult Videos'
        }
    ],
    resources: ['catalog', 'meta'],
    types: ['movie'],
    idPrefixes: ['cxxx:'],
    logo: 'https://i.imgur.com/4zB0e11.png',
    background: 'https://i.imgur.com/GzB1s2C.jpg'
};

const builder = new addonBuilder(manifest);

async function fetchEporner(type, page = 1) {
    const order = type === 'adult_top' ? 'top-weekly' : 'latest';
    const url = `https://www.eporner.com/api/v2/video/search/?query=&per_page=30&page=${page}&thumbsize=big&order=${order}&format=json`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data.videos || [];
    } catch (e) {
        console.error('Error fetching Eporner API:', e);
        return [];
    }
}

builder.defineCatalogHandler(async (args) => {
    if (args.type === 'movie' && (args.id === 'adult_top' || args.id === 'adult_new')) {
        const page = args.extra.skip ? Math.floor(args.extra.skip / 30) + 1 : 1;
        const videos = await fetchEporner(args.id, page);
        
        const metas = videos.map(v => ({
            id: `cxxx:${encodeURIComponent(v.title)}`, // Encode title in ID
            type: 'movie',
            name: v.title,
            poster: v.default_thumb.src,
            background: v.default_thumb.src,
            description: `Duration: ${v.length_min} min | Views: ${v.views}`
        }));
        
        return { metas };
    }
    return { metas: [] };
});

builder.defineMetaHandler(async (args) => {
    if (args.type === 'movie' && args.id.startsWith('cxxx:')) {
        const title = decodeURIComponent(args.id.substring(5));
        
        // Return a basic meta object so Nuvio can show the title and ask scrapers for streams
        return {
            meta: {
                id: args.id,
                type: 'movie',
                name: title,
                poster: 'https://i.imgur.com/4zB0e11.png',
                description: title
            }
        };
    }
    return { meta: {} };
});

serveHTTP(builder.getInterface(), { port: process.env.PORT || 7000 });
console.log('Nuvio Adult Catalog Addon running on http://localhost:7000');
