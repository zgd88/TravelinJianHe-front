const fs = require('fs');
const path = require('path');
const glob = require('glob');

// No glob available, use manual list
const files = [
  'pages/admin-verify/admin-verify.ts',
  'pages/carpool-list/carpool-list.ts',
  'pages/carpool-publish/carpool-publish.ts',
  'pages/choose-role/choose-role.ts',
  'pages/driver-detail/driver-detail.ts',
  'pages/driver-verify/driver-verify.ts',
  'pages/finish/finish.ts',
  'pages/index/index.ts',
  'pages/login/login.ts',
  'pages/mine/mine.ts',
  'pages/order/order.ts',
  'pages/order-list/order-list.ts',
  'pages/register/register.ts',
  'pages/reset-password/reset-password.ts',
  'pages/riding/riding.ts',
  'pages/route-plan/route-plan.ts',
  'pages/search/search.ts',
  'pages/share-ride/share-ride.ts',
];

const BASE = 'miniprogram';

for (const file of files) {
  const filePath = path.join(BASE, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // 1. Replace wx.cloud.callContainer block header
  content = content.replace(
    /wx\.cloud\.callContainer\(\{[\s\n]*config:\s*\{\s*env:\s*'prod-d9gwk85xd3e015347'\s*\},/g,
    'wx.request({'
  );
  
  // 2. Replace path: with url: BASE_URL + 
  content = content.replace(/path:\s*(['"`])(\/api\/[^'"]+)\1/g, (match, q, p) => {
    return `url: 'http://localhost:3000' + '${p}'`;
  });
  
  // 3. Remove X-WX-SERVICE header entries
  content = content.replace(/'X-WX-SERVICE':\s*'travel-service',?\s*/g, '');
  
  // 4. Fix header: { } with only comma issue
  content = content.replace(/header:\s*\{\s*,/g, 'header: {');
  content = content.replace(/header:\s*\{\s*'Authorization'/g, "header: { 'Authorization'");
  
  // 5. Replace awx.cloud.connectContainer with wx.connectSocket
  content = content.replace(
    /await\s+wx\.cloud\.connectContainer\(\{[\s\S]*?service:\s*'travel-service',[\s\S]*?path:\s*(['"`])(\/ws[^'"]*)\1[\s\S]*?\}\)/g,
    (match, q, wsPath) => {
      return `wx.connectSocket({ url: 'ws://localhost:3000' + '${wsPath}' })`;
    }
  );
  
  fs.writeFileSync(filePath, content);
  console.log('Processed:', file);
}

console.log('Done!');
