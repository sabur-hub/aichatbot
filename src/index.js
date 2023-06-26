// Import node packages
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Import methods from Tesseract
import {createWorker,} from 'tesseract.js';

const imagePath = "./img/e.jpg";

const image = path.resolve(
    imagePath || './img/e.jpg',
);

const hashedValue = crypto.createHash('md5')
    .update(image)
    .digest('hex');

console.log(`Recognizing ${image}`);

const worker = createWorker({
    logger: (m) => {
        console.log(m);
    },
});

(async () => {
    await (await worker).load(); // 1
    await (await worker).loadLanguage('eng' + 'rus'); // 2
    await (await worker).initialize('eng' + 'rus');

    const {
        data: {
            text,
        },
    } = await (await worker).recognize(image); // 3

    await fs.writeFile(`${image}-${hashedValue}.txt`, text, (err) => {}); // 4
    await (await worker).terminate(); // 5
})();


