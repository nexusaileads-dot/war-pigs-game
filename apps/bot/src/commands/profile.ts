import { Telegraf, Markup } from 'telegraf';
import { getWebAppUrl } from '../utils/webApp';

export function setupProfileCommand(bot: Telegraf) {
  bot.command('profile', async (ctx) => {
    try {
      ctx.reply('📊 View your full profile in the game:', 
        Markup.inlineKeyboard([
          [Markup.button.webApp('📊 Open Profile', getWebAppUrl())]
        ])
      );
    } catch (error) {
      ctx.reply('❌ Error fetching profile. Please try again.');
    }
  });

  bot.action('profile', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply('📊 View your stats in the game:', 
      Markup.inlineKeyboard([
        [Markup.button.webApp('📊 Open Profile', getWebAppUrl())]
      ])
    );
  });
}
