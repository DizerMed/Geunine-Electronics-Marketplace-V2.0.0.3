const fs = require('fs');
const file = 'src/components/AdminPortal.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/showAlert={showAlert}\n            ensureOnline={ensureOnline}/g, "showAlert={showAlert}\n            showConfirm={showConfirm}\n            ensureOnline={ensureOnline}");

code = code.replace(/showAlert={showAlert}\n            resetCustomerPassword={resetCustomerPassword}/g, "showAlert={showAlert}\n            showConfirm={showConfirm}\n            resetCustomerPassword={resetCustomerPassword}");

fs.writeFileSync(file, code);
