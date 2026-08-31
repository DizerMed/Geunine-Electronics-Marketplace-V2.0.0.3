const fs = require('fs');

let adminPortal = fs.readFileSync('src/components/AdminPortal.tsx', 'utf8');

// 1. Remove showConfirm={showConfirm} from AdminOffersTab, AdminAnalyticsTab, etc. that don't need it.
adminPortal = adminPortal.replace(/<AdminOffersTab([\s\S]*?)showConfirm={showConfirm}([\s\S]*?)\/>/, '<AdminOffersTab$1$2/>');
adminPortal = adminPortal.replace(/<AdminInventoryTab([\s\S]*?)showConfirm={showConfirm}([\s\S]*?)\/>/, '<AdminInventoryTab$1$2/>');
adminPortal = adminPortal.replace(/<AdminSettingsTab([\s\S]*?)showConfirm={showConfirm}([\s\S]*?)\/>/, '<AdminSettingsTab$1$2/>');

// 2. Fix await in non-async function
adminPortal = adminPortal.replace(
  /onClick=\{\(\) => \{\s*if \(await customConfirm\('Remove all gallery images\? The main front image will be preserved\.', 'Remove Images'\)\) \{/,
  "onClick={async () => {\n                                    if (await customConfirm('Remove all gallery images? The main front image will be preserved.', 'Remove Images')) {"
);

fs.writeFileSync('src/components/AdminPortal.tsx', adminPortal);
console.log('Fixed errors');
