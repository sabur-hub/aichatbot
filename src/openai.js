import { Configuration, OpenAIApi } from 'openai'
import config from 'config'
import fs, { createReadStream } from 'fs'
import postgres from 'postgres'

import axios from 'axios'
import { code } from "telegraf/format";
import { Markup, Telegraf } from "telegraf";
import { message } from "telegraf/filters";
const bot = new Telegraf(config.get('TELEGRAM_TOKEN'))

const client = postgres('postgres://ksepissj:M8KoCbUXeX5NRLIJqvJ-WTJssfWVZvVH@mahmud.db.elephantsql.com/ksepissj',{
    host: "mahmud.db.elephantsql.com",
    port: 5432,
    database: "ksepissj",
    user: "ksepissj",
    password: "M8KoCbUXeX5NRLIJqvJ-WTJssfWVZvVH",
})

await client`
          CREATE TABLE IF NOT EXISTS usersAiBot(
          id serial PRIMARY KEY,
          user_id bigint,
          date_buy TIMESTAMP,
          date_ending TIMESTAMP,
          count_tokens int,
          count_queries int,
          tarif_plan text
          )
        `

export let UserDialogues = {};
export async function chatGen(ctx, textt) {
    try {
        const userId = ctx.from.id;
        const userMessage = textt;

        const userDialogue = UserDialogues[userId] || [];

        const messages = userDialogue.concat([{ role: "user", content: userMessage }]);

        const response = await openaii.createChatCompletion({
            model: 'gpt-3.5-turbo',
            messages: messages,
        });

        const modelReply = response.data.choices[0].message.content;
        ctx.reply(modelReply);
        UserDialogues[userId] = messages.concat([{ role: 'assistant', content: modelReply }]);
    } catch (e) {
        console.log('Error while gpt chat', e.message)
    }
}

export async function transcription(filepath) {
    try {

        const response = await openaii.createTranscription(
            createReadStream(filepath),
            'whisper-1'
        )
        return response.data.text
    } catch (e) {
        console.log('Error while transcription', e.message)
    }
}

export async function generateIamge(message) {
    try {
        const prompt = message
        const configuration = new Configuration({
            apiKey: config.get('OPENAI_KEY')
        });

        const openai = new OpenAIApi(configuration);

        const response = await openai.createImage({
            prompt: prompt,
            n: 4,
            size: "1024x1024",
        });
        return response.data.data;
    } catch (e) {
        console.log("error!")
    }
}

export const INITIAL_SESSION = {
    messages: [],
}
export async function initCommand(ctx) {
    const photoPath = './main.png';

    ///add to db
    try {
        const data = await client`SELECT COUNT(*) FROM usersAiBot where user_id = ${ctx.message.from.id}`
        if(data[0]["count"] == 0){
            const currentDate = new Date(); // Текущая дата
            const endingDate = new Date(currentDate.getTime() + (2 * 24 * 60 * 60 * 1000)); // Текущая дата + 30 дней
            const formattedEndingDate = endingDate;
            const values_now = [currentDate]
            const values_end = [formattedEndingDate]

            await client`INSERT INTO usersAiBot ${ client([{ user_id: ctx.message.from.id, date_buy: values_now, date_ending: values_end, count_tokens: 25000, count_queries: 3, tarif_plan: "DEMO"}]) }`
        }
    }catch (e){
        console.log("Error DB!")
    }

    try {
        await ctx.replyWithPhoto({ source: fs.createReadStream(photoPath) });
        await ctx.reply('Добро пожаловать в бот!\n' +
            'NeuroBot - ваш умный помощник который поможет сэкономить ваше время и решить кучу повседневных задач:\n' +
            '— Придумает за вас продающий текст или составит контент план для соц сетей.\n' +
            '— Ответит на любой вопрос даже на ваше голосовое сообщение быстрее и качественее чем Google\n' +
            '— Проверит ваш текст на ошибки и внесёт правки\n' +
            '— Даст ответ на фотографию вашего тестово билета или задачки в учебнике\n' +
            '— Создаст качественное изображение или логотип по вашему описанию\n' +
            '\n' +
            'И ещё сотни полезных функций с которыми бот справится всего за минуту🤖', {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: 'Задать вопрос GPT Turbo', callback_data: 'gpt'
                        }
                    ]
                    ,
                    [
                        {
                            text: 'Для Студентов / Школьников', callback_data: 'gpt-photo'
                        }
                    ]
                    ,
                    [
                        {
                            text: 'Создать Изображение в Midjourney', url: 'https://t.me/YourAiChatbot'
                        }
                    ]
                    ,
                    [
                        {
                            text: 'Техподдержка', url: 'https://t.me/Outic_03'
                        }
                    ]
                    ,
                    [
                        {
                            text: 'Мой профиль', callback_data: 'profile'
                        }
                    ]

                ]
            }
        });

        const userId = ctx.from.id;
        if (!UserDialogues[userId]) {
            UserDialogues[userId] = [];
        }
    } catch (e) {
        console.log('Error while sending photo:', e.message);
    }
}

// Настройка обработчика событий callback_query


export async function newChatKer(ctx) {
    const userId = ctx.from.id;
    UserDialogues[userId] = [];
    await ctx.reply('Начиналось новый диалог!')
}

export const configuration = new Configuration({
    apiKey: config.get('OPENAI_KEY')
});

export const openaii = new OpenAIApi(configuration);
