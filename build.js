const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'providers');
const outDir = path.join(__dirname, 'providers');

const EXTERNAL_MODULES = [
    'cheerio-without-node-native',
    'react-native-cheerio',
    'cheerio',
    'crypto-js',
    'axios'
];

async function buildAll() {
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    if (!fs.existsSync(srcDir)) {
        console.error('❌ src/providers/ directory not found.');
        process.exit(1);
    }

    const files = fs.readdirSync(srcDir)
        .filter(file => file.endsWith('.js'));

    console.log(`Building ${files.length} providers...`);

    for (const file of files) {
        const entryPoint = path.join(srcDir, file);
        const outFile = path.join(outDir, file);
        const name = path.basename(file, '.js');

        try {
            await esbuild.build({
                entryPoints: [entryPoint],
                bundle: true,
                outfile: outFile,
                format: 'cjs',
                platform: 'neutral',
                target: 'es2016',
                external: EXTERNAL_MODULES,
                minify: false, // Keep it readable for debugging
                sourcemap: false
            });
            console.log(`  ✅ Built ${name} -> providers/${file}`);
        } catch (e) {
            console.error(`  ❌ Failed to build ${name}:`, e.message);
        }
    }
}

buildAll();
