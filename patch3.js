import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  '                />\n              </div>\n                </Suspense>',
  '                />\n                </Suspense>\n              </div>'
);

fs.writeFileSync('src/App.tsx', code);
