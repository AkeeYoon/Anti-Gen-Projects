const fs = require('fs');
const path = require('path');

const bDir = 'c:/Users/D30/.gemini/PJArea/ProjectionMappingTool';
const outFile = 'c:/Users/D30/.gemini/PJArea/Portable_ProjectionMappingTool.html';

// 1. Read Base HTML (Assuming it's already copied)
let htmlSrc = fs.readFileSync(outFile, 'utf8');

// 2. Read Assets
const cssContent = fs.readFileSync(path.join(bDir, 'css/styles.css'), 'utf8');
const jsCalc = fs.readFileSync(path.join(bDir, 'js/calculator.js'), 'utf8');
const jsCanvas = fs.readFileSync(path.join(bDir, 'js/canvasEngine.js'), 'utf8');
const jsExport = fs.readFileSync(path.join(bDir, 'js/exporter.js'), 'utf8');
const jsMain = fs.readFileSync(path.join(bDir, 'js/main.js'), 'utf8');

// 3. Replace CSS
htmlSrc = htmlSrc.replace(
    '<link rel="stylesheet" href="css/styles.css">',
    '<style>\n' + cssContent + '\n    </style>'
);

// 4. Replace JS
const jsAll = jsCalc + '\n\n' + jsCanvas + '\n\n' + jsExport + '\n\n' + jsMain;
const jsRegex = /<script src="js\/calculator\.js"><\/script>[\s\S]*?<script src="js\/main\.js"><\/script>/m;
htmlSrc = htmlSrc.replace(
    jsRegex,
    '<script>\n' + jsAll + '\n    </script>'
);

// 5. Save back
fs.writeFileSync(outFile, htmlSrc, { encoding: 'utf8' });
console.log('✅ Node based merge complete.');
