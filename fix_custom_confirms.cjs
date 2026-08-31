const fs = require('fs');

let staffTab = fs.readFileSync('src/components/admin/tabs/AdminStaffTab.tsx', 'utf8');

// There are three syntax errors indicated before in AdminStaffTab:
// 1139,48: error TS1128: Declaration or statement expected.
// 2338,5: error TS1128: Declaration or statement expected.
