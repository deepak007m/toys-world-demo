const fs = require('fs');
let content = fs.readFileSync('src/js/data.js', 'utf8');

content = content.replace(/price:\s*\d+,.*?(\r?\n)/g, "price: 'Price on request',$1");
content = content.replace(/availability:\s*\".*?\",/g, "availability: 'Confirm on WhatsApp',");

fs.writeFileSync('src/js/data.js', content);
console.log('Script completed.');
