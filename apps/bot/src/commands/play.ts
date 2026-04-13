import { Telegraf, Markup } from 'telegraf';
import { getWebAppUrl } from '../utils/webApp';

export function setupPlayCommand(bot: Telegraf) {
  bot.command('play', (ctx) => {
    ctx.reply('🎮 Launch WAR PIGS:', 
      Markup.inlineKeyboard([
        [Markup.button.webApp('▶️ START GAME', getWebAppUrl())]
      ])
    );
  });
}
