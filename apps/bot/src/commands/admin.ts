import { Telegraf } from 'telegraf';

const ADMIN_TELEGRAM_IDS = process.env.ADMIN_TELEGRAM_IDS?.split(',') || [];

export function setupAdminCommand(bot: Telegraf) {
  bot.command('admin', (ctx) => {
    const userId = ctx.from.id.toString();
    
    if (!ADMIN_TELEGRAM_IDS.includes(userId)) {
      return ctx.reply('⛔ Unauthorized access.');
    }

    ctx.reply('👑 *Admin Panel*\n\nAccess the web dashboard to manage the game economy and view system metrics.', {
      parse_mode: 'Markdown'
    });
  });
}
