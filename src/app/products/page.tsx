import { ProductsClient } from "./products-client"

export default function ProductsPage() {
    return (
        <div className="flex flex-col gap-6 p-4">
            <h1 className="text-3xl font-bold tracking-tight">Products Catalog</h1>

            <ProductsClient />
        </div>
    )
}
