import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', workers: 1, timeout: 45000,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:5173', headless: true, launchOptions:{args:['--disable-gpu','--in-process-gpu']}, screenshot: 'only-on-failure', trace: 'off' },
  projects: [{name:'desktop-1366',use:{viewport:{width:1366,height:900}}},{name:'desktop',use:{viewport:{width:1440,height:900}}},{name:'desktop-1920',use:{viewport:{width:1920,height:1080}}},{name:'mobile',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}}],
  webServer: { command: 'npm run build -- --mode qa && npm run preview -- --host 127.0.0.1 --port 5173', url:'http://127.0.0.1:5173', reuseExistingServer: false, timeout:30000 },
});
