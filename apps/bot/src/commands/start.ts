import { Telegraf, Markup, Context } from 'telegraf';

// Safe URL resolution with environment fallback
const getWebAppUrl = () => {
  const url = process.env.WEBAPP_URL;
  if (!url) {
    console.warn('[StartCommand] WEBAPP_URL not set, using fallback');
    return 'https://war-pigs-game.vercel.app';
  }
  return url;
};

export function setupStartCommand(bot: Telegraf) {
  bot.start(async (ctx) => {
    const welcomeText = `
🐷 *WELCOME TO WAR PIGS* 🐷

The Swine Corps needs you, soldier!

Humanoid battle pigs fighting for glory, bacon, and $PIGS tokens.

*What you can do:*
• Battle through 12 intense missions
• Fight legendary bosses
• Earn $PIGS tokens
• Unlock elite pig warriors
• Upgrade your arsenal

*Ready to deploy?*
    `.trim();

    try {
      await ctx.reply(welcomeText, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.webApp('🎮 PLAY NOW', getWebAppUrl())],
          // Optimized layout: 2 buttons per row for mobile
          [
            Markup.button.callback('📊 Profile', 'profile'),
            Markup.button.callback('ℹ️ Help', 'help')
          ]
        ])
      });
    } catch (error) {
      console.error('[StartCommand] Failed to send welcome message:', error);
      // Silently fail to avoid crashing the bot for a single user
    }
  });

  bot.command('help', async (ctx) => {
    const helpText = `
*WAR PIGS Commands:*
/start - Welcome message and game link
/play - Launch the game
/profile - View your stats
/help - Show this help

*In-Game Tips:*
• Complete missions to earn $PIGS
• Save up for legendary weapons
• Bosses appear every 4 levels
• Daily rewards coming soon!

Join the Swine Corps today! 🐷
    `.trim();

    try {
      await ctx.reply(helpText, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('[StartCommand] Failed to send help message:', error);
    }
  });

  // Handle 'help' callback query
  bot.action('help', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      await ctx.reply('Use /help for commands or click Play to start!', { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('[StartCommand] Failed to handle help callback:', error);
    }
  });

  // Handle 'profile' callback query - forward to profile logic or send inline hint
  bot.action('profile', async (ctx) => {
    try {
      await ctx.answerCbQuery();
      await ctx.reply('View your full stats in-game or use /profile in chat.', { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('[StartCommand] Failed to handle profile callback:', error);
    }
  });
}
