import { Telegraf, Markup } from 'telegraf';
import { getWebAppUrl } from '../utils/webApp';

export function setupStartCommand(bot: Telegraf) {
  bot.start((ctx) => {
    const welcomeText = `
🐷 *WELCOME TO WAR PIGS* 🐷

The Swine Corps needs you, soldier!

Humanoid battle pigs fighting for glory, bacon, and $WPIGS tokens.

*What you can do:*
• Battle through 12 intense missions
• Fight legendary bosses
• Earn $WPIGS tokens
• Unlock elite pig warriors
• Upgrade your arsenal

*Ready to deploy?*
    `.trim();

    ctx.reply(welcomeText, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.webApp('🎮 PLAY NOW', getWebAppUrl())],
        [Markup.button.callback('📊 Profile', 'profile')],
        [Markup.button.callback('ℹ️ Help', 'help')]
      ])
    });
  });

  bot.command('help', (ctx) => {
    ctx.reply(`
*WAR PIGS Commands:*
/start - Welcome message and game link
/play - Launch the game
/profile - View your stats
/help - Show this help

*In-Game Tips:*
• Complete missions to earn $WPIGS
• Save up for legendary weapons
• Bosses appear every 4 levels
• Daily rewards coming soon!

Join the Swine Corps today! 🐷
    `, { parse_mode: 'Markdown' });
  });

  bot.action('help', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply('Use /help for commands or click Play to start!');
  });
}
