import ProductCard from "./ProductCard"
import { useState } from "react"
import { useSearchParams } from "react-router-dom";

function ProductList({ View = "horizontal", Products = [], modeRate = false }) {
    const getView = useMemo(() =>{
        switch (View.toLowerCase()) {
            case "horizontal":
                return 'h-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 justify-evenly';
            case "vertical":
                return 'h-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4 justify-evenly';
        }
    }, [View]);
    const [page, setPage] = useState(1);
    const itemQuantity = View === "horizontal" ? 4 : 15;

    const startIdx = (page - 1) * itemQuantity;
    const endIdx = startIdx + itemQuantity;
    const visibleProducts = Products.slice(startIdx, endIdx);
    const [searchParams] = useSearchParams();
    const searchQuery = searchParams.get("search") || "";
    const filteredProducts = visibleProducts.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

//   return (
//     <nav aria-label="Pagination" className="flex items-center justify-between mt-8">
//       <div className="hidden sm:block">
//         <button
//           onClick={() => onPageChange(currentPage - 1)}
//           disabled={currentPage === 1}
//           className="relative inline-flex items-center px-4 py-2 border border-zinc-300 dark:border-zinc-700 text-sm font-medium rounded-md text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50"
//         >
//           Previous
//         </button>
//       </div>
//       <div className="flex-1 flex justify-between sm:justify-end">
//         <div className="flex items-center space-x-1">
//           {pageNumbers.map((number) => (
//             <button
//               key={number}
//               onClick={() => onPageChange(number)}
//               className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
//                 currentPage === number
//                   ? 'z-10 bg-primary border-primary text-white'
//                   : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700'
//               }`}
//             >
//               {number}
//             </button>
//           ))}
//         </div>
//         <button
//           onClick={() => onPageChange(currentPage + 1)}
//           disabled={currentPage === totalPages}
//           className="ml-3 relative inline-flex items-center px-4 py-2 border border-zinc-300 dark:border-zinc-700 text-sm font-medium rounded-md text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50"
//         >
//           Next
//         </button>
//       </div>
//     </nav>
//   );
// };


// function ProductList({ products = [], pagination, onPageChange, onAddToCart, modeRate = false }) {
//     const view = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
    return (
        <>
            <div className={getView(View)}> 
                {filteredProducts.map((product, i) => (
                    <ProductCard key={startIdx + i} product={product} modeRate={modeRate} view={View}/>
                ))}
            </div>

            {products.length === 0 ? (
              <div className="py-12 text-center text-zinc-600 dark:text-zinc-400">
                No products found. Try adjusting filters or <button onClick={() => onPageChange(1)} className="text-primary underline">reload</button>.
              </div>
            ) : (
              <div className={`grid ${view} gap-6`}>
                  {products.map((product) => (
                      <ProductCard key={product.product_id || product.id} product={product} modeRate={modeRate} onAddToCart={onAddToCart} />
                  ))}
              </div>
            )}

            <Pagination
              currentPage={pagination?.currentPage || 1}
              totalPages={pagination?.totalPages || 1}
              onPageChange={onPageChange}
            />
        </>
    )
}
export default ProductList;