from rlm import RLM
from bs4 import BeautifulSoup


rlm = RLM(
    #backend="openai",
    #backend_kwargs={"model_name": "gemini-3-flash-preview"},#, "base_url": "https://api.groq.com/openai/v1/", "max_budget": "50000"},
    #backend_kwargs={"model_name": "meta-llama/llama-4-scout-17b-16e-instruct","base_url": "https://api.groq.com/openai/v1/", "max_budget": "50000"},
    backend="openrouter",
    backend_kwargs={"model_name": "xiaomi/mimo-v2-pro"},
    #other_backends=["openrouter"],
    #other_backend_kwargs=[{"model_name": "minimax/minimax-m2.7"}],
    #xiaomi/mimo-v2-flash
    verbose=True,  # For printing to console with rich, disabled by default.
)
Prompt ="""

Extract all product data from the provided HTML and return it as a JSON array of objects that strictly adhere to the provided TypeScript interfaces. 

INSTRUCTIONS:
1. Analyze the HTML to determine its structure and locate product and variant information.
2. Extract the relevant fields, adapting to any irregularities or missing data in the site's markup.
3. Map the extracted data to the exact keys and data types defined in the schema below.
4. Output ONLY valid JSON. If no products are found, return an empty array []. Assert the json is valid before returning it

SCHEMA (TypeScript Interfaces):

export interface NormalizedVariant {
  id?: string | number;
  title: string;
  sku?: string;
  price: string;
  compare_at_price?: string;
  currency?: string;
  available?: boolean;
  inventory_quantity?: number;
  inventory_policy?: string;
  options?: string[];
  image?: { src?: string; alt?: string; };
  product_url?: string;
  observed_at?: string;
  raw?: unknown;
}

export interface NormalizedProduct {
  source_product_id?: number;
  id?: string | number;
  title: string;
  handle?: string;
  vendor?: string;
  product_type?: string;
  description?: string;
  tags?: string[];
  product_url: string;
  price?: string;
  compare_at_price?: string;
  currency?: string;
  available?: boolean;
  inventory_quantity?: number;
  inventory_policy?: string;
  images?: Array<{ src?: string; alt?: string; }>;
  platform?: "shopify" | "woocommerce" | "universal" | string;
  source_url?: string;
  created_at?: string;
  source_updated_at?: string;
  last_updated_at?: string;
  variants: NormalizedVariant[];
  raw?: unknown;
}

HTML:


"""

0
with open('C:\\SyncedFolder\\dev\\nextjs\\group1-competitor-intelligence\\src\\services\\python_rlm\\tests\\test.html', 'r', encoding='UTF-8', errors='replace') as f:
  content = f.read()
  content = content.encode('ascii', 'ignore')
  content = content.decode("ascii")
  Soup = BeautifulSoup(content, "html.parser")
  # Find all <script> tags and remove them
  for script_tag in Soup.find_all('script'):
    script_tag.decompose()
  for link_tag in Soup.find_all('link'):
    link_tag.decompose()
  
  content = Soup.prettify()
  print(content)
  FinalAnswer = rlm.completion(Prompt + content).response


  print("The returned output is")
  print(FinalAnswer)