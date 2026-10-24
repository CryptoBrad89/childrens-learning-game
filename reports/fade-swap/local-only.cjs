// Prevent existing browser suites from sending any request outside localhost.
const pw=require('/usr/local/lib/pnpm/5/.pnpm/node_modules/playwright');
const launch=pw.chromium.launch.bind(pw.chromium);
pw.chromium.launch=async options=>{
 const browser=await launch({...options,args:[...(options?.args||[]),'--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
 const newContext=browser.newContext.bind(browser);
 browser.newContext=async options=>{
  const context=await newContext(options);
  await context.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(['file:','data:','blob:'].includes(url.protocol)||['localhost','127.0.0.1','[::1]'].includes(url.hostname))return route.continue();
   if(url.pathname==='/rest/v1/game_settings')return route.fulfill({json:[]});
   return route.abort();
  });
  return context;
 };
 return browser;
};
