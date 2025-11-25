import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiPlus, FiEdit, FiTrash2, FiEye } from 'react-icons/fi';
import { LuChevronDown } from "react-icons/lu";
import sellerProductService from '../../services/sellerProductService';

// Notes:
// - This component now fetches seller products from `/api/seller/products` using the
//   `sellerProductService` wrapper. The backend expects the seller to be authenticated
//   (cookie-based JWT). The product id used in routes is the BarCode from Product_SKU.
// - We keep the original layout and most existing markup; only data is dynamic.
// - The code includes loading, error handling, debounced search, and pagination.

const StatusBadge = ({ status }) => {
  let colorClasses = '';
  switch (status) {
    case 'Active':
      colorClasses = 'bg-green-100 text-green-800';
      break;
    case 'Low Stock':
      colorClasses = 'bg-yellow-100 text-yellow-800';
      break;
    case 'Out of Stock':
      colorClasses = 'bg-red-100 text-red-800';
      break;
    default:
      colorClasses = 'bg-gray-100 text-gray-800';
  }
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${colorClasses}`}>
      <span className="w-2 h-2 inline-block rounded-full mr-1" style={{ backgroundColor: 'currentColor' }}></span>
      {status}
    </span>
  );
};

const SellerDashboardPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [limit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [page, setPage] = useState(1);
  const mountedRef = useRef(true);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    mountedRef.current = true;
    // Initial load
    fetchProducts();
    return () => { mountedRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search: wait 400ms after typing stops
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      setOffset(0);
      setPage(1);
      fetchProducts({ search, offset: 0 });
    }, 400);
    return () => { if (searchRef.current) clearTimeout(searchRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Fetch products with abortable requests and robust mapping against DB column variants
  async function fetchProducts(opts = {}) {
    setLoading(true);
    setError(null);
    // Abort previous fetch if any (avoid race conditions on fast typing/pagination)
    const controller = new AbortController();
    const signal = controller.signal;
    // attach controller to ref so callers can cancel if needed
    if (searchRef.current && searchRef.current.abortController) {
      try { searchRef.current.abortController.abort(); } catch(e) {}
    }
    searchRef.current = { abortController: controller, timer: searchRef.current?.timer };

    try {
      const resp = await sellerProductService.listSellerProducts({
        limit,
        offset: opts.offset ?? offset,
        search: opts.search ?? search,
        signal, // service should pass this to fetch if implemented
      });

      // Backend may return { success: true, products: [...], total } or an array
      const list = Array.isArray(resp.products) ? resp.products : (Array.isArray(resp) ? resp : (resp.products || []));
      if (!mountedRef.current) return;

      // Map DB column variants to view model robustly. DB schema (DB_As2.sql) uses
      // Product_SKU with columns: Bar_code, Name, Manufacturing_date, Expired_date, Description, sellerID
      // But API could return different naming conventions (BarCode, Bar_code, Barcode, etc.).
      const mapped = list.map(p => {
        // Prefer explicit DB column keys first
        const id = p.Bar_code || p.BarCode || p.Barcode || p.id || p.Id || '';
        const name = p.Name || p.name || p["Name"] || '';
        // Image sources might come from IMAGES table (IMAGE_URL) or an API alias
        const image = p.IMAGE_URL || p.ImageUrl || p.image || p.imageUrl || 'https://via.placeholder.com/40';
        const desc = p.Description || p.description || p.desc || '';
        // Date fields: normalize safely — handle strings (YYYY-MM-DD), Date objects, or null
        const parseDate = (v) => {
          if (!v) return '';
          try {
            const d = new Date(v);
            if (isNaN(d.getTime())) return String(v).split('T')[0] || '';
            return d.toLocaleDateString();
          } catch (e) { return String(v).split('T')[0] || ''; }
        };
        const manufacturingDate = parseDate(p.Manufacturing_date || p.Manufacture_Date || p.manufacturingDate || p.manufacturing_date);
        const expiredDate = parseDate(p.Expired_date || p.expiredDate || p.expired_date || p.ExpiredDate);

        return {
          id,
          name,
          image,
          category: p.Category || p.category || 'Uncategorized',
          description: desc,
          manufacturingDate,
          expiredDate,
        };
      });

      setProducts(mapped);
    } catch (err) {
      if (!mountedRef.current) return;
      // Handle aborts silently — user likely typed again
      if (err.name === 'AbortError') return;
      setError(err.message || 'Failed to load products');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  // Pagination helpers
  const handleNext = () => {
    setOffset(prev => {
      const next = prev + limit;
      setPage(p => p + 1);
      fetchProducts({ offset: next });
      return next;
    });
  };

  const handlePrev = () => {
    setOffset(prev => {
      const next = Math.max(0, prev - limit);
      setPage(p => Math.max(1, p - 1));
      fetchProducts({ offset: next });
      return next;
    });
  };

  // Actions (edit/delete) — placeholders calling API and refreshing list
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product? This action cannot be undone.')) return;
    try {
      setLoading(true);
      await sellerProductService.deleteSellerProduct(id);
      // Optimistic update: remove from UI
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      setError(err.message || 'Delete failed');
    } finally {
      setLoading(false);
    }
  };

  // Fetch full product and navigate to Edit page (re-uses AddProductPage in edit mode)
  const handleEdit = async (id) => {
    setError(null);
    try {
      setLoading(true);
      const resp = await sellerProductService.getSellerProduct(id);
      // API returns { success: true, product } or product directly depending on server
      const product = resp?.product || resp;
      if (!product) throw new Error('Product not found');
      // Navigate to AddProductPage with product in location state for edit
      navigate('/add-product', { state: { product } });
    } catch (err) {
      setError(err.message || 'Failed to load product for editing');
    } finally {
      setLoading(false);
    }
  };

  // View product details in read-only mode by re-using AddProductPage with viewOnly flag
  const handleView = async (id) => {
    setError(null);
    try {
      setLoading(true);
      const resp = await sellerProductService.getSellerProduct(id);
      const product = resp?.product || resp;
      if (!product) throw new Error('Product not found');
      navigate('/add-product', { state: { product, viewOnly: true } });
    } catch (err) {
      setError(err.message || 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  // Render
  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r">
        <div className="p-4 border-b">
          <div className="flex items-center">
            <img src="https://via.placeholder.com/40" alt="Seller" className="w-10 h-10 rounded-full" />
            <div className="ml-3">
              <p className="font-semibold">BKBAY Seller</p>
              <p className="text-sm text-gray-500">seller@bkay.com</p>
            </div>
          </div>
        </div>
        <nav className="p-4">
          <ul>
            <li className="mb-2"><a href="#" className="flex items-center p-2 text-gray-600 hover:bg-gray-100 rounded">Dashboard</a></li>
            <li className="mb-2"><a href="#" className="flex items-center p-2 text-blue-600 bg-blue-50 rounded">Products</a></li>
            <li className="mb-2"><a href="#" className="flex items-center p-2 text-gray-600 hover:bg-gray-100 rounded">Orders</a></li>
            <li className="mb-2"><a href="#" className="flex items-center p-2 text-gray-600 hover:bg-gray-100 rounded">Analytics</a></li>
            <li className="mb-2"><a href="#" className="flex items-center p-2 text-gray-600 hover:bg-gray-100 rounded">Settings</a></li>
          </ul>
        </nav>
        <div className="absolute bottom-0 w-64 p-4 border-t">
            <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">View Storefront</button>
            <div className="text-center mt-4">
                <a href="#" className="text-sm text-gray-600 hover:underline">Help & Support</a>
            </div>
        </div>
      </aside>

      <main className="flex-1 p-8">
          <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Products</h1>
            <p className="text-gray-600 mt-1">Manage your product inventory and view sales performance.</p>
          </div>
          <button onClick={()=>navigate('/add-product')} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700">
            <FiPlus className="mr-2" /> Add New Product
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="relative w-1/3">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by Product Name or Barcode"
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <select className="pl-4 pr-10 py-2 border rounded-lg appearance-none">
                  <option>Category</option>
                </select>
                <LuChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              <div className="relative">
                <select className="pl-4 pr-10 py-2 border rounded-lg appearance-none">
                  <option>Status</option>
                </select>
                <LuChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              <div className="relative">
                <select className="pl-4 pr-10 py-2 border rounded-lg appearance-none">
                  <option>Stock</option>
                </select>
                <LuChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="p-4 text-left"><input type="checkbox" /></th>
                <th className="p-4 text-left font-medium text-gray-600">Product Name</th>
                <th className="p-4 text-left font-medium text-gray-600">Category</th>
                <th className="p-4 text-left font-medium text-gray-600">Description</th>
                <th className="p-4 text-left font-medium text-gray-600">Manufacturing Date</th>
                <th className="p-4 text-left font-medium text-gray-600">Expired Date</th>
                <th className="p-4 text-left font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan="9" className="p-6 text-center text-gray-500">Loading products...</td>
                </tr>
              )}
              {!loading && products.length === 0 && (
                <tr>
                  <td colSpan="9" className="p-6 text-center text-gray-500">No products found.</td>
                </tr>
              )}
              {!loading && products.map((product) => (
                <tr key={product.id} className="border-b">
                  <td className="p-4"><input type="checkbox" /></td>
                  <td className="p-4">
                    <div className="flex items-center">
                      <img src={product.image} alt={product.name} className="w-10 h-10 rounded-md mr-4" />
                      <div>
                        <p className="font-semibold text-gray-900">{product.name || 'Unnamed product'}</p>
                        <p className="text-sm text-gray-500">{product.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600">{product.category}</td>
                  <td className="p-4 text-gray-600 truncate max-w-xl">{product.description}</td>
                  <td className="p-4 text-gray-600">{product.manufacturingDate}</td>
                  <td className="p-4 text-gray-600">{product.expiredDate}</td>
                  <td className="p-4">
                    <div className="flex space-x-2">
                      <button onClick={() => handleEdit(product.id)} className="text-gray-500 hover:text-blue-600" title="Edit"><FiEdit size={18} /></button>
                      <button onClick={() => handleView(product.id)} className="text-gray-500 hover:text-blue-600" title="View"><FiEye size={18} /></button>
                      <button onClick={() => handleDelete(product.id)} className="text-gray-500 hover:text-red-600" title="Delete"><FiTrash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 flex justify-between items-center">
            <p className="text-sm text-gray-600">Showing {offset + 1} to {offset + products.length} results</p>
            <div className="flex space-x-2">
              <button onClick={handlePrev} disabled={offset === 0} className="px-4 py-2 border rounded-lg hover:bg-gray-100 disabled:opacity-50">&lt; Previous</button>
              <button onClick={handleNext} className="px-4 py-2 border rounded-lg hover:bg-gray-100">Next &gt;</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SellerDashboardPage;
