/**
 * RONIGUARD Standalone 24/7 VPS Bot Host Runner
 * Usage: node bot-vps.js OR pm2 start ecosystem.config.cjs
 */
import { discordBotService } from './discordBotService.ts';
import { db } from './db.ts';

process.on('uncaughtException', (err) => {
  console.error('[RONIGUARD-VPS-CRASH-SHIELD] Uncaught Exception trapped:', err);
});

process.on('unhandledRejection', (reason) => {
  console.warn('[RONIGUARD-VPS-CRASH-SHIELD] Unhandled Rejection trapped:', reason);
});

console.log('====================================================');
console.log('🤖 RONIGUARD DISCORD BOT - 24/7 VPS HOST DAEMON');
console.log('====================================================');

async function runVpsBot() {
  const token = db.get().botConfig.botToken || process.env.DISCORD_BOT_TOKEN;
  console.log('[VPS-BOT] Initializing Discord Gateway connection...');
  
  const started = await discordBotService.start(token);
  if (started) {
    console.log('[VPS-BOT] ✅ Bot startup sequence dispatched.');
  } else {
    console.warn('[VPS-BOT] ⚠️ Bot start reported non-ready; watchdog will retry...');
  }

  // Periodic heartbeat log & watchdog verification every 30 seconds
  setInterval(() => {
    const status = discordBotService.getStatus();
    const isConn = discordBotService.isConnected();
    const uptimeMinutes = Math.floor(process.uptime() / 60);
    console.log(`[VPS-BOT-PULSE] Uptime: ${uptimeMinutes}m | Connected: ${isConn} | Running: ${status.isRunning} | Step: ${status.lastStep}`);
    
    if (!isConn && !status.isRunning) {
      console.log('[VPS-BOT] Re-triggering connection loop...');
      discordBotService.start().catch((e) => console.error('[VPS-BOT] Retry failed:', e));
    }
  }, 30000);
}

runVpsBot().catch((err) => {
  console.error('[VPS-BOT] Fatal startup error:', err);
});
