import ffmpeg from 'fluent-ffmpeg'
import installer from '@ffmpeg-installer/ffmpeg'
import axios from 'axios'
import { createWriteStream } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import crypto from "crypto";
import {createWorker} from "tesseract.js";


const __dirname = dirname(fileURLToPath(import.meta.url))

class OggConverter {
    constructor() {
        ffmpeg.setFfmpegPath(installer.path)
    }
    toMp3(input, output) {
        try {
            const outputPath = resolve(dirname(input), `${output}.mp3`)
            return new Promise((resolve, reject) => {
                ffmpeg(input)
                    .inputOption('-t 30')
                    .output(outputPath)
                    .on('end', () => resolve(outputPath))
                    .on('error', (err) => reject(err.message))
                    .run()
            })
        } catch (e) {
            console.log('Error while creating mp3', e.message)
        }
    }
    async create(url, filename) {
        try {
            const oggPath = resolve(__dirname, '../voices', `${filename}.ogg`)
            const response = await axios({
                method: 'get',
                url,
                responseType: 'stream',
            })
            return new Promise((resolve) => {
                const stream = createWriteStream(oggPath)
                response.data.pipe(stream)
                stream.on('finish', () => resolve(oggPath))
            })
        } catch (e) {
            console.log('Error while creating ogg', e.message)
        }
    }


    async kerSuka(imageLink) {
//const image = path.resolve(imagePath);
        const image = imageLink;

        const hashedValue = crypto.createHash('md5')
            .update(image)
            .digest('hex');

//console.log(`Recognizing ${image}`);

        const worker = createWorker({
            logger: (m) => {
                //console.log(m);
            },
        });

        await (await worker).load(); // 1
        await (await worker).loadLanguage('rus'); // 2
        await (await worker).initialize('rus');

        const {
            data: {
                text,
            },
        } = await (await worker).recognize(image); // 3
        console.log(text)
        return text;
    }
}
export const ogg = new OggConverter()