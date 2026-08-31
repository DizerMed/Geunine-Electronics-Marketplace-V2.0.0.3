const fs = require('fs');
let adminPortal = fs.readFileSync('src/components/AdminPortal.tsx', 'utf8');

adminPortal = adminPortal.replace(/            showConfirm={showConfirm}\n/g, "");
fs.writeFileSync('src/components/AdminPortal.tsx', adminPortal);
console.log('cleaned showConfirm props from AdminPortal');
