import { Telegraf } from 'telegraf';
import { setupStartCommand } from './commands/start';
import { setupPlayCommand } from './commands/play';
import { setupProfileCommand } from './commands/profile';
import { setupAdminCommand } from './commands/admin';

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN || '');

// Initialize Commands
setupStartCommand(bot);
setupPlayCommand(bot);
setupProfileCommand(bot);
setupAdminCommand(bot);

// Error handling
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  ctx.reply('❌ An error occurred. Please try again.');
});

console.log('Starting WAR PIGS bot...');
bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
