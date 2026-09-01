import fs from 'fs';
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  '<InternetConnectionBanner />',
  '<Suspense fallback={null}><InternetConnectionBanner /></Suspense>'
);

code = code.replace(
  '<InstallPwaBanner theme={activeTheme} />',
  '<Suspense fallback={null}><InstallPwaBanner theme={activeTheme} /></Suspense>'
);

code = code.replace(
  '<ClientApp',
  '<Suspense fallback={<div className="flex-1 flex items-center justify-center p-12"><div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div></div>}>\n                <ClientApp'
);

code = code.replace(
  '<Footer categoriesList={categories} storeSettings={storeSettings} />',
  '  </Suspense>\n              <Suspense fallback={null}>\n                <Footer categoriesList={categories} storeSettings={storeSettings} />\n              </Suspense>'
);

code = code.replace(
  '<ClientProfileModal',
  '<Suspense fallback={null}>\n              <ClientProfileModal'
);

code = code.replace(
  'isDark={effectiveClientTheme === \'dark\'}\n              />',
  'isDark={effectiveClientTheme === \'dark\'}\n              />\n              </Suspense>'
);

code = code.replace(
  '<AIChatWidget',
  '<Suspense fallback={null}>\n            <AIChatWidget'
);

code = code.replace(
  'onSelectProduct={handleSelectProductFromAI}\n            />',
  'onSelectProduct={handleSelectProductFromAI}\n            />\n          </Suspense>'
);

code = code.replace(
  '<WhatsAppFloatingButton',
  '<Suspense fallback={null}>\n              <WhatsAppFloatingButton'
);

code = code.replace(
  'phoneNumber={storeSettings?.whatsappNumber || \'\'}\n              />',
  'phoneNumber={storeSettings?.whatsappNumber || \'\'}\n              />\n            </Suspense>'
);

code = code.replace(
  '<CookieConsentBanner />',
  '<Suspense fallback={null}>\n              <CookieConsentBanner />\n            </Suspense>'
);

fs.writeFileSync('src/App.tsx', code);
