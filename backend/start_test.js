process.chdir('/root/courtia/backend');
require('dotenv').config();
const pool = require('./src/db');
console.log('DB connected');
const app = require('./server');
console.log('Server module loaded');
setTimeout(() => process.exit(0), 1000);
