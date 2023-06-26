// import {INITIAL_SESSION, processTextToChat, initCommand} from "./openai.js";
// import bot from "nodemon";
// import {message} from "telegraf/filters";
// import {code} from "telegraf/format";
//
// bot.on(message('text'), async (ctx) => {
//     ctx.session ??= INITIAL_SESSION
//     try {
//         await ctx.reply(code('Сообщение принял. Жду ответ от сервера...'))
//         await processTextToChat(ctx, ctx.message.text)
//     } catch (e) {
//         console.log(`Error while voice message`, e.message)
//     }
// })
//
