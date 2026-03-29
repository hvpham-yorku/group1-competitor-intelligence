import { ScraperStrategy } from './interface';
import { ScraperRequest } from '../request';
import { NormalizedProduct } from '../normalized-types';
import { spawn } from "child_process";



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
        const HtmlPromise = (await HtmlRequest).text();
        const HtmlText = await HtmlPromise; 
        //console.log(HtmlText);
        const pythonProcess = spawn('python',["src\\services\\python_rlm\\scripts.py"]);
        pythonProcess.stdin.write(HtmlText);
        pythonProcess.stdin.end();

        let OutputText = "";
        const Output = new Promise<JSON>((resolve, reject)=>{
            let ErrorMessage = ""
            pythonProcess.stdout.on('data', (data : string) => {
                OutputText += data.toString();
                //console.log(data.toString());
            });
            pythonProcess.stderr.on('data', (data : string) => {
                ErrorMessage += data.toString();
                //console.log(data.toString());
            });
           pythonProcess.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Python process exited with code ${code} Error ${ErrorMessage}`));
                return;
            }
            try {
                // Parse the JSON output from Python
                const finalOutput = JSON.parse(OutputText);
                resolve(finalOutput);
            } catch {
                reject(new Error(`Failed to parse the child process JSON output: ${OutputText}`));
            }
    
            });
        });
        const OutputJson = await Output;
        //console.log(OutputJson);
        const Products = OutputJson as unknown as NormalizedProduct[];

        //console.log({Products});
        console.log('Universal strategy', req);
        return {
            products: Products,
            platform: 'universal',
            source_url: req.url
        };
    },
    //TODO finish the universal scrapper
   
};


