export default async function Test(){
    try{
        const Reponse = await fetch("https://sarugbyshop.co.za/wp-json/wc/store/v1/products");
        
        console.log(JSON.stringify((await Reponse.json())));
    } catch (error: any) {

    }
    
}