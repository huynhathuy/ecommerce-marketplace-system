// ...existing code...
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from '../../components/header/Header';
import Footer from '../../components/footer/Footer';

export default function WriteReview() {
  const { productId: pid } = useParams();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(pid ? String(pid) : "");
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (pid) setSelectedProduct(String(pid));
  }, [pid]);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch("/api/products", { credentials: "include", cache: "no-cache" });
      if (!res.ok) throw new Error("Không lấy được danh sách sản phẩm");
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.products || [];
      setProducts(list);
      if (!selectedProduct && list.length) setSelectedProduct(String(list[0].id ?? list[0].product_id ?? list[0]._id ?? list[0].ID));
    } catch (err) {
      console.warn("fetchProducts fallback:", err);
      // fallback: minimal mock so UI không vỡ
      const mock = [{ id: 1, name: "Product #1" }, { id: 2, name: "Product #2" }, { id: 3, name: "Product #3" }];
      setProducts(mock);
      if (!selectedProduct) setSelectedProduct(String(mock[0].id));
    } finally {
      setLoadingProducts(false);
    }
  };

  const goToReviews = () => {
    if (!selectedProduct) return;
    navigate(`/product/${selectedProduct}/reviews`);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!selectedProduct) { setError("Chọn product trước"); return; }
    if (!content.trim()) { setError("Viết nội dung đánh giá"); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct,
          rating,
          content,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Submit failed (${res.status})`);
      }
      // success -> chuyển tới trang review của product
      navigate(`/product/${selectedProduct}/reviews`);
    } catch (err) {
      console.error("submit review:", err);
      setError(err.message || "Gửi thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Viết đánh giá</h1>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Chọn sản phẩm</label>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            disabled={loadingProducts}
          >
            {products.map((p) => (
              <option key={p.id ?? p.product_id ?? p._id ?? p.ID} value={p.id ?? p.product_id ?? p._id ?? p.ID}>
                {p.name ?? p.title ?? `Product ${p.id ?? p.product_id ?? p._id ?? p.ID}`}
              </option>
            ))}
          </select>
          <div className="mt-2 text-xs text-gray-500">Nếu không có sản phẩm trong danh sách, backend /api/products có thể chưa sẵn sàng.</div>
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={goToReviews} className="px-4 py-2 bg-gray-100 border rounded">See review</button>
          <button onClick={() => navigate("/product/1/reviews")} className="px-4 py-2 bg-white border rounded text-sm">Quick demo (product 1)</button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border rounded p-4">
          <div className="mb-3">
            <label className="block text-sm mb-1">Rating</label>
            <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="border px-2 py-1 rounded">
              {[5,4,3,2,1].map(v => <option key={v} value={v}>{v} sao</option>)}
            </select>
          </div>

          <div className="mb-3">
            <label className="block text-sm mb-1">Nội dung</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} className="w-full border rounded p-2" />
          </div>

          {error && <div className="text-red-500 mb-2 text-sm">{error}</div>}

          <div className="flex justify-end">
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-rose-600 text-white rounded">
              {submitting ? "Đang gửi..." : "Gửi đánh giá"}
            </button>
          </div>
        </form>
      </main>
      <Footer />
    </div>
  );
}
// ...existing code...h