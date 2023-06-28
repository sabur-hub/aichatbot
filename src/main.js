import {session, Telegraf} from 'telegraf'
import { message } from 'telegraf/filters'
import {code, link} from 'telegraf/format'
import config from 'config'
import { ogg } from './ogg.js'
import { removeFile } from './utils.js'
import { initCommand, newChatKer, chatGen, transcription, generateIamge, INITIAL_SESSION } from './openai.js'
import path, {dirname, resolve} from "path";
import {fileURLToPath} from "url";
import request from "axios";
import fs, {createWriteStream} from "fs";
const __dirname = dirname(fileURLToPath(import.meta.url))
import postgres from 'postgres'

const client = ''


const bot = new Telegraf(config.get('TELEGRAM_TOKEN'))

// говорим боту, чтобы он использовал session
bot.use(session())

// при вызове команды new и start бот регистрирует новую беседу,
// новый контекст
bot.command('new', newChatKer)
bot.command('start', initCommand)
bot.command('pict', sendGenImage)

async function sendGenImage(ctx) {
    const tmp = ctx.message.text.substring(6, ctx.message.text.length);
    try {
        await ctx.reply(code('Сообщение принял. Жду ответ от сервера...'))
        const ker = await generateIamge(tmp)

        const mediaGroup = [
            {
                type: 'photo',
                media: ker[0],
                caption: tmp,
            },
            {
                type: 'photo',
                media: ker[1],
                caption: tmp,
            },
            {
                type: 'photo',
                media: ker[2],
                caption: tmp,
            },
            {
                type: 'photo',
                media: ker[3],
                caption: tmp,
            },
        ];

        await ctx.telegram.sendMediaGroup(ctx.message.chat.id, mediaGroup)
    } catch (e) {
        await ctx.reply(code("Повторите запрос позже!"))
        console.log(`Error while image message`, e.message)
    }
}

bot.on(message('voice'), async (ctx) => {
    // если сессия не определилась, создаем новую
    var text = ""
    try {
        await ctx.reply(code('Сообщение принял. Жду ответ от сервера...'))
        const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id)
        const userId = String(ctx.message.from.id)
        const oggPath = await ogg.create(link.href, userId)
        const mp3Path = await ogg.toMp3(oggPath, userId)
        await removeFile(oggPath)
        text = await transcription(mp3Path)
        await ctx.reply(code(`Ваш запрос: ${text}`))
    } catch (e) {
        await ctx.reply(code("Повторите запрос позже!"))
        console.log(`Error while voice message`, e.message)
    }

    var cnt = text.replaceAll(' ', '').length;
    cnt = cnt + parseInt((cnt * 0.2).toString())
    console.log(cnt)
    const msg_id = ctx.message.from.id;
    try {

        const data = await client`SELECT COUNT(*) FROM usersAiBot where user_id = ${msg_id}`
        if(data[0]["count"] == 1){
            const currentDate = new Date();
            const values_now = [currentDate]
            const data1 = await client`SELECT COUNT(*) FROM usersAiBot where user_id = ${msg_id} and ${values_now} <= date_ending`
            if(data1[0]["count"] == 1){
                const data2 = await client`SELECT COUNT(*) FROM usersAiBot where user_id = ${msg_id} and ${values_now} <= date_ending and ${cnt} <= count_tokens`
                if(data2[0]["count"] == 1) {
                    await client`UPDATE usersAiBot SET count_tokens = count_tokens - ${cnt} WHERE user_id = ${msg_id}`;

                    await ctx.reply(code('Сообщение принял. Жду ответ от сервера...'))
                    await chatGen(ctx, text)
                }else {
                    const data = await client`SELECT * FROM usersAiBot where user_id = ${ctx.from.id}`
                    await ctx.reply(code('У вас нет доступа!\nОформите подписку!'))
                    // Отправляем текст и кнопку в ответ на нажатие
                    await ctx.reply(`🔹 Ваша текущая подписка: ${data[0]["tarif_plan"]}\n` +
                        `🔹 Сегодня Токенов ChatGPT осталось: ${data[0]["count_tokens"]} \n` +
                        `🔹 Сегодня у вас осталось ${data[0]["count_queries"]} запроса Midjorney\n` +
                        `\n` +
                        `Окончание подписки — ${data[0]["date_ending"]}\n` +
                        '\n' +
                        'Реферальная программа: \n' +
                        'Ваша ссылка: 0\n' +
                        'Количество рефералов: 0', {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: 'Оформить/продлить подписку',
                                        url: "https://t.me/BotForHackatonbot"
                                    }
                                ]
                            ]
                        }
                    });
                }
            }
            else{
                const data = await client`SELECT * FROM usersAiBot where user_id = ${ctx.from.id}`
                await ctx.reply(code('У вас нет доступа!\nОформите подписку!'))
                // Отправляем текст и кнопку в ответ на нажатие
                await ctx.reply(`🔹 Ваша текущая подписка: ${data[0]["tarif_plan"]}\n` +
                    `🔹 Сегодня Токенов ChatGPT осталось: ${data[0]["count_tokens"]} \n` +
                    `🔹 Сегодня у вас осталось ${data[0]["count_queries"]} запроса Midjorney\n` +
                    `\n` +
                    `Окончание подписки — ${data[0]["date_ending"]}\n` +
                    '\n' +
                    'Реферальная программа: \n' +
                    'Ваша ссылка: 0\n' +
                    'Количество рефералов: 0', {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: 'Оформить/продлить подписку',
                                    url: "https://t.me/BotForHackatonbot"
                                }
                            ]
                        ]
                    }
                });

            }
        }
        await ctx.reply('Продолжайте обшаться если хотите создать новый разговор то нажмите на кнопку Новый Чат если хотите возврашаться в меня то нажмите на кнопку Вернутся в меню', {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: 'Вернутся в меню',
                            callback_data: 'menu'
                        }
                    ],
                    [
                        {
                            text: 'Новый Чат',
                            callback_data: 'newChat'
                        }
                    ]
                ]
            }
        });
    } catch (e){
        await ctx.reply(code("Повторите запрос позже!"))
        console.log(`Error while image message`, e.message)
    }

})

bot.on(message('text'), async (ctx) => {
    const pr = ctx.message.text.replaceAll(' ', '');
    const cnt = pr.length
    console.log(cnt)
    const msg_id = ctx.message.from.id;
    try {

        const data = await client`SELECT COUNT(*) FROM usersAiBot where user_id = ${msg_id}`
        if(data[0]["count"] == 1){
            const currentDate = new Date();
            const values_now = [currentDate]
            const data1 = await client`SELECT COUNT(*) FROM usersAiBot where user_id = ${msg_id} and ${values_now} <= date_ending`
            if(data1[0]["count"] == 1){
                const data2 = await client`SELECT COUNT(*) FROM usersAiBot where user_id = ${msg_id} and ${values_now} <= date_ending and ${cnt} <= count_tokens`
                if(data2[0]["count"] == 1) {
                    await client`UPDATE usersAiBot SET count_tokens = count_tokens - ${cnt} WHERE user_id = ${msg_id}`;

                    await ctx.reply(code('Сообщение принял. Жду ответ от сервера...'))
                    await chatGen(ctx, ctx.message.text)
                }else {
                    const data = await client`SELECT * FROM usersAiBot where user_id = ${ctx.from.id}`
                    await ctx.reply(code('У вас нет доступа!\nОформите подписку!'))
                    // Отправляем текст и кнопку в ответ на нажатие
                    await ctx.reply(`🔹 Ваша текущая подписка: ${data[0]["tarif_plan"]}\n` +
                        `🔹 Сегодня Токенов ChatGPT осталось: ${data[0]["count_tokens"]} \n` +
                        `🔹 Сегодня у вас осталось ${data[0]["count_queries"]} запроса Midjorney\n` +
                        `\n` +
                        `Окончание подписки — ${data[0]["date_ending"]}\n` +
                        '\n' +
                        'Реферальная программа: \n' +
                        'Ваша ссылка: 0\n' +
                        'Количество рефералов: 0', {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: 'Оформить/продлить подписку',
                                        url: "https://t.me/BotForHackatonbot"
                                    }
                                ]
                            ]
                        }
                    });
                }
            }
            else{
                const data = await client`SELECT * FROM usersAiBot where user_id = ${ctx.from.id}`
                await ctx.reply(code('У вас нет доступа!\nОформите подписку!'))
                // Отправляем текст и кнопку в ответ на нажатие
                await ctx.reply(`🔹 Ваша текущая подписка: ${data[0]["tarif_plan"]}\n` +
                    `🔹 Сегодня Токенов ChatGPT осталось: ${data[0]["count_tokens"]} \n` +
                    `🔹 Сегодня у вас осталось ${data[0]["count_queries"]} запроса Midjorney\n` +
                    `\n` +
                    `Окончание подписки — ${data[0]["date_ending"]}\n` +
                    '\n' +
                    'Реферальная программа: \n' +
                    'Ваша ссылка: 0\n' +
                    'Количество рефералов: 0', {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: 'Оформить/продлить подписку',
                                    url: "https://t.me/BotForHackatonbot"
                                }
                            ]
                        ]
                    }
                });

            }
        }
        await ctx.reply('Продолжайте обшаться если хотите создать новый разговор то нажмите на кнопку Новый Чат если хотите возврашаться в меня то нажмите на кнопку Вернутся в меню', {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: 'Вернутся в меню',
                            callback_data: 'menu'
                        }
                    ],
                    [
                        {
                            text: 'Новый Чат',
                            callback_data: 'newChat'
                        }
                    ]
                ]
            }
        });
    } catch (e){
            await ctx.reply(code("Повторите запрос позже!"))
            console.log(`Error while image message`, e.message)
        }
})

bot.on(message('photo'), async (ctx) => {
    var text = ""
    try {
        await ctx.reply(code('принял. Жду ответ от сервера...'));
        const d = ctx.message.photo;
        const url = await ctx.telegram.getFileLink(d[d.length - 1].file_id);
        console.log(url.href)
        text = await ogg.kerSuka(url.href)
        await ctx.reply(code(text))
    } catch (error) {
        await ctx.reply(code("Повторите запрос позже!"))
        // Обработка ошибок
        console.error(error);
    }


    var cnt = text.replaceAll(' ', '').length;
    cnt = cnt + parseInt((cnt * 0.2).toString())
    console.log(cnt)
    const msg_id = ctx.message.from.id;
    try {

        const data = await client`SELECT COUNT(*) FROM usersAiBot where user_id = ${msg_id}`
        if(data[0]["count"] == 1){
            const currentDate = new Date();
            const values_now = [currentDate]
            const data1 = await client`SELECT COUNT(*) FROM usersAiBot where user_id = ${msg_id} and ${values_now} <= date_ending`
            if(data1[0]["count"] == 1){
                const data2 = await client`SELECT COUNT(*) FROM usersAiBot where user_id = ${msg_id} and ${values_now} <= date_ending and ${cnt} <= count_tokens`
                if(data2[0]["count"] == 1) {
                    await client`UPDATE usersAiBot SET count_tokens = count_tokens - ${cnt} WHERE user_id = ${msg_id}`;

                    await ctx.reply(code('Сообщение принял. Жду ответ от сервера...'))
                    await chatGen(ctx, text)
                }else {
                    const data = await client`SELECT * FROM usersAiBot where user_id = ${ctx.from.id}`
                    await ctx.reply(code('У вас нет доступа!\nОформите подписку!'))
                    // Отправляем текст и кнопку в ответ на нажатие
                    await ctx.reply(`🔹 Ваша текущая подписка: ${data[0]["tarif_plan"]}\n` +
                        `🔹 Сегодня Токенов ChatGPT осталось: ${data[0]["count_tokens"]} \n` +
                        `🔹 Сегодня у вас осталось ${data[0]["count_queries"]} запроса Midjorney\n` +
                        `\n` +
                        `Окончание подписки — ${data[0]["date_ending"]}\n` +
                        '\n' +
                        'Реферальная программа: \n' +
                        'Ваша ссылка: 0\n' +
                        'Количество рефералов: 0', {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: 'Оформить/продлить подписку',
                                        url: "https://t.me/BotForHackatonbot"
                                    }
                                ]
                            ]
                        }
                    });
                }
            }
            else{
                const data = await client`SELECT * FROM usersAiBot where user_id = ${ctx.from.id}`
                await ctx.reply(code('У вас нет доступа!\nОформите подписку!'))
                // Отправляем текст и кнопку в ответ на нажатие
                await ctx.reply(`🔹 Ваша текущая подписка: ${data[0]["tarif_plan"]}\n` +
                    `🔹 Сегодня Токенов ChatGPT осталось: ${data[0]["count_tokens"]} \n` +
                    `🔹 Сегодня у вас осталось ${data[0]["count_queries"]} запроса Midjorney\n` +
                    `\n` +
                    `Окончание подписки — ${data[0]["date_ending"]}\n` +
                    '\n' +
                    'Реферальная программа: \n' +
                    'Ваша ссылка: 0\n' +
                    'Количество рефералов: 0', {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: 'Оформить/продлить подписку',
                                    url: "https://t.me/BotForHackatonbot"
                                }
                            ]
                        ]
                    }
                });

            }
        }
        await ctx.reply('Продолжайте обшаться если хотите создать новый разговор то нажмите на кнопку Новый Чат если хотите возврашаться в меня то нажмите на кнопку Вернутся в меню', {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: 'Вернутся в меню',
                            callback_data: 'menu'
                        }
                    ],
                    [
                        {
                            text: 'Новый Чат',
                            callback_data: 'newChat'
                        }
                    ]
                ]
            }
        });
    } catch (e){
        await ctx.reply(code("Повторите запрос позже!"))
        console.log(`Error while image message`, e.message)
    }
});
bot.action(["gpt", "profile", "gpt-photo"], async (ctx) => {
    const callbackData = ctx.callbackQuery.data;
    // Проверяем значение callback_data
    if (callbackData === 'gpt') {
        // Отправляем текст и кнопку в ответ на нажатие
        await ctx.reply('напишите сообщение и получаете ответ сообщение может бить в виде текста аудио или картинка(пример в картинке должен быть прочитаемый текст)', {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: 'Вернутся в меню',
                            callback_data: 'menu'
                        }
                    ]
                ]
            }
        });
    }
    if (callbackData === 'gpt-photo') {
        // Отправляем текст и кнопку в ответ на нажатие
        await ctx.reply('напишите сообщение и получаете ответ сообщение может бить в виде текста аудио или картинка(пример в картинке должен быть прочитаемый текст) you can send your exam ticet', {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: 'Вернутся в меню',
                            callback_data: 'menuPhoto'
                        }
                    ]
                ]
            }
        });
    }
    if (callbackData === 'profile') {
        const data = await client`SELECT * FROM usersAiBot where user_id = ${ctx.from.id}`

        try {
            // Отправляем текст и кнопку в ответ на нажатие
            await ctx.reply(`🔹 Ваша текущая подписка: ${data[0]["tarif_plan"]}\n` +
                `🔹 Сегодня Токенов ChatGPT осталось: ${data[0]["count_tokens"]} \n` +
                `🔹 Сегодня у вас осталось ${data[0]["count_queries"]} запроса Midjorney\n` +
                `\n` +
                `Окончание подписки — ${data[0]["date_ending"]}\n` +
                '\n' +
                'Реферальная программа: \n' +
                'Ваша ссылка: 0\n' +
                'Количество рефералов: 0', {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: 'Оформить/продлить подписку',
                                url: "https://t.me/BotForHackatonbot"
                            }
                        ]
                    ]
                }
            });
        }catch(e){
            console.log("oi")
        }
    }
});

bot.action(["menu"], async (ctx) => {
    const callbackData = ctx.callbackQuery.data;
    console.log(callbackData)
    if (callbackData == 'menu') {
        await initCommand(ctx)
    }
})

bot.action(["menuPhoto"], async (ctx) => {
    const callbackData = ctx.callbackQuery.data;
    console.log(callbackData)
    if (callbackData == 'menuPhoto') {
        await initCommand(ctx)
    }
})

bot.action(["newChat"], async (ctx) => {
    const callbackData = ctx.callbackQuery.data;
    console.log(callbackData)
    if (callbackData == 'newChat') {
        await newChatKer(ctx)
    }
})
bot.launch()

