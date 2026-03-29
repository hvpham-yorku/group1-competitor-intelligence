import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const reqUrl = request.url;
    const { searchParams } = new URL(reqUrl);
    const Page = searchParams.get("page")
    if(Page != "1")
        return NextResponse.json([]);
    return NextResponse.json({
    "products": [
        {
        "id": 10026768236841,
        "title": "Vanilla Scent Collection",
        "handle": "tone-vanilla-scent-collection",
        "body_html": "<p>The TONE Vanilla Collection brings together 3 incredible products from our Vanilla family.</p>\n<p>Our signature Aluminum Free Deodorant lasts for up to 48 hours and is phthalate and paraben free. Our Hydrating Body Wash gently cleanses and removed dirt without stripping skin. Our On The Go Cologne &amp; Body Mist brings you incredible scents in a travel-safe format so you can smell your best all day.</p>\n<p>This collection brings together TONE tried and true classics and our incredible new additions to Vanilla family. Get yours before it's gone.<br></p>",
        "published_at": "2026-02-20T01:22:51-05:00",
        "created_at": "2026-02-20T01:22:50-05:00",
        "updated_at": "2026-03-28T21:28:15-04:00",
        "vendor": "TONE Exclusive",
        "product_type": "",
        "tags": [],
        "variants": [
            {
            "id": 52723563299113,
            "title": "Default Title",
            "option1": "Default Title",
            "option2": null,
            "option3": null,
            "sku": "VB0018-06",
            "requires_shipping": true,
            "taxable": true,
            "featured_image": null,
            "available": true,
            "price": "42.00",
            "grams": 652,
            "compare_at_price": null,
            "position": 1,
            "product_id": 10026768236841,
            "created_at": "2026-02-20T01:22:50-05:00",
            "updated_at": "2026-03-28T21:28:15-04:00"
            }
        ],
        "images": [
            {
            "id": 54685634363689,
            "created_at": "2026-02-20T01:22:28-05:00",
            "position": 1,
            "updated_at": "2026-02-20T01:22:30-05:00",
            "product_id": 10026768236841,
            "variant_ids": [],
            "src": "https://cdn.shopify.com/s/files/1/0902/2013/4697/files/VanillaEssentialsCollection.png?v=1771568550",
            "width": 1080,
            "height": 1080
            }
        ],
        "options": [
            {
            "name": "Title",
            "position": 1,
            "values": [
                "Default Title"
            ]
            }
        ]
        }
    ]
    });
}