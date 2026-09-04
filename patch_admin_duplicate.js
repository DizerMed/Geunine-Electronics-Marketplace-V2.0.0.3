import fs from 'fs';
let code = fs.readFileSync('src/components/AdminPortal.tsx', 'utf8');

code = code.replace(
  /isLocalOnly: Boolean\(formIsLocalOnly\),\s*isLocalOnly: Boolean\(formIsLocalOnly\),/g,
  "isLocalOnly: Boolean(formIsLocalOnly),"
);

fs.writeFileSync('src/components/AdminPortal.tsx', code);
