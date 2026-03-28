import { ScraperStrategy } from './interface';
import { ScraperRequest } from '../request';
import { asRecordArray } from '../normalize-utils';
import { NormalizedProduct } from '../normalized-types';



export const UniversalStrategy: ScraperStrategy = {
    name: 'Universal',
    description: 'Uses LLM + Browser to extract data from any site',
    match: async () => {
        return {
            isMatch: true,
            data: {}
        };
    },
    scrape: async (req: ScraperRequest) => {
        const HtmlRequest = fetch(req.url);
        const HtmlText = (await HtmlRequest).json();
        console.log(HtmlText);
        const spawn = require("child_process").spawn;
        const pythonProcess = spawn('python',["src\\services\\python_rlm\\scripts.py", HtmlText]);
        const Output = new Promise<string>((resolve, reject)=>{
            pythonProcess.stdout.on('data', (data : string) => {
                console.log(data);
                resolve(data);
            });
        });
        const OutputText = await Output;
        console.log(OutputText);
        const Products = asRecordArray(OutputText);

        const normalized = Products.map((product) => JSON.parse(product as unknown as string) as NormalizedProduct);
        console.log({normalized});
        console.log('Universal strategy', req);
        return {
            products: normalized,
            platform: 'universal',
            source_url: req.url
        };
    },
    //TODO finish the universal scrapper
   
};


