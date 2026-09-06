import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests',fullyParallel:false,workers:1,timeout:45000,
  use:{baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000},headless:true,launchOptions:process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}},
  webServer:{command:'npm run dev -- --port 5173 --strictPort',url:'http://127.0.0.1:5173',reuseExistingServer:!process.env.CI},
});
