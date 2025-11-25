// ...existing code...
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  FaStar,
  FaThumbsUp,
  FaRegCommentDots,
  FaImage,
  FaEllipsisV,
} from "react-icons/fa";
import Header from '../../components/header/Header';
import Footer from '../../components/footer/Footer';

/*
  ProductReviews
  - reads productId from route param: /product/:productId/reviews
  - fetches reviews from GET /api/reviews?productId=...
  - posts new review to POST /api/reviews (credentials: 'include')
  - marks helpful via POST /api/reviews/:id/helpful (credentials: 'include')
  - simple filters: all / with media / by star rating
  - pagination (client-side fallback)
*/

export default function ProductReviews() {
  const { productId: pid } = useParams();
  const productId = Number(pid || 1);

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newReview, setNewReview] = useState({ rating: 5, content: "" });
  const [submitting, setSubmitting] = useState(false);

  // UI state
  const [filter, setFilter] = useState({ type: "all", star: 0 }); // type: all | media
  const [page, setPage] = useState(1);
  const perPage = 6;
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line
  }, [productId]);

  const fetchReviews = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/reviews?productId=${productId}`, {
        credentials: "include",
        cache: "no-cache",
      });
      if (!res.ok) throw new Error(`Failed to load reviews (${res.status})`);
      const data = await res.json();
      // backend might return array or { reviews: [...] }
      const list = Array.isArray(data) ? data : data.reviews || [];
      // normalize items: ensure id, rating, content, createdAt/date, helpfulCount, author, media/images
      const norm = list.map((r) => ({
        id: r.id ?? r._id ?? r.ID,
        rating: r.rating ?? r.stars ?? r.rate ?? 5,
        content: r.content ?? r.text ?? r.comment ?? "",
        date: r.date ?? r.createdAt ?? r.Time ?? null,
        username: r.username ?? r.author ?? r.user ?? "Người dùng",
        helpfulCount: r.helpfulCount ?? r.helpful ?? r.reactionsCount ?? 0,
        media: r.media ?? r.images ?? r.photos ?? [],
        raw: r,
      }));
      setReviews(norm);
    } catch (err) {
      console.error("fetchReviews:", err);
      setError(err.message || "Error loading reviews");
    } finally {
      setLoading(false);
      setPage(1);
    }
  };

  const submitReview = async (e) => {
    e?.preventDefault?.();
    if (!newReview.content.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          rating: newReview.rating,
          content: newReview.content,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Submit failed (${res.status})`);
      }
      const created = await res.json();
      // Normalize created review shape to match state items
      const item = {
        id: created.id ?? created._id ?? created.ID,
        rating: created.rating ?? newReview.rating,
        content: created.content ?? newReview.content,
        date: created.date ?? created.createdAt ?? new Date().toISOString(),
        username: created.username ?? created.author ?? "Bạn",
        helpfulCount: created.helpfulCount ?? 0,
        media: created.media ?? [],
        raw: created,
      };
      setReviews((p) => [item, ...p]);
      setNewReview({ rating: 5, content: "" });
    } catch (err) {
      console.error("submitReview:", err);
      setError(err.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const markHelpful = async (reviewId) => {
    try {
      const res = await fetch(`/api/reviews/${reviewId}/helpful`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed to mark helpful (${res.status})`);
      const updated = await res.json();
      // backend may return updated review or minimal info
      setReviews((prev) =>
        prev.map((r) =>
          (r.id === reviewId)
            ? {
                ...r,
                helpfulCount:
                  updated.helpfulCount ??
                  updated.helpful ??
                  (r.helpfulCount ? r.helpfulCount + 1 : 1),
                raw: updated,
              }
            : r
        )
      );
    } catch (err) {
      console.error("markHelpful:", err);
      // non-blocking UX: we don't surface error except console
    }
  };

  // derived stats
  const stats = useMemo(() => {
    const total = reviews.length;
    const avg = total ? reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / total : 0;
    const counts = [0, 0, 0, 0, 0].map((_, i) => reviews.filter((r) => Math.round(r.rating) === 5 - i).length);
    const withMedia = reviews.filter((r) => Array.isArray(r.media) && r.media.length > 0).length;
    return { total, avg: Number(avg.toFixed(1)), counts, withMedia };
  }, [reviews]);

  // filtering + pagination
  const filtered = useMemo(() => {
    let out = reviews;
    if (filter.type === "media") out = out.filter((r) => Array.isArray(r.media) && r.media.length > 0);
    if (filter.star > 0) out = out.filter((r) => Math.round(r.rating) === filter.star);
    return out;
  }, [reviews, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);

  // helpers
  const renderStars = (rating) =>
    [...Array(5)].map((_, i) => (
      <FaStar key={i} className={i < rating ? "text-yellow-400" : "text-gray-300"} />
    ));

  return (
    <div className="bg-white p-6 rounded-md shadow-sm min-h-screen">
      <Header />

      <div className="max-w-4xl mx-auto">
        {/* Summary */}
        <section className="border rounded-lg p-4 mb-6 bg-white">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-rose-600">{stats.avg || 0}</div>
              <div className="flex justify-center mt-1">{renderStars(Math.round(stats.avg || 0))}</div>
              <div className="text-sm text-gray-500 mt-1">{stats.total} đánh giá</div>
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  onClick={() => { setFilter({ type: "all", star: 0 }); setPage(1); }}
                  className={`px-3 py-1 border rounded ${filter.type === "all" && filter.star === 0 ? "bg-rose-50 border-rose-300" : "bg-white"}`}
                >
                  Tất cả ({stats.total})
                </button>
                <button
                  onClick={() => { setFilter({ type: "all", star: 5 }); setPage(1); }}
                  className={`px-3 py-1 border rounded ${filter.star === 5 ? "bg-rose-50 border-rose-300" : "bg-white"}`}
                >
                  5 Sao ({stats.counts[0]})
                </button>
                <button
                  onClick={() => { setFilter({ type: "all", star: 4 }); setPage(1); }}
                  className={`px-3 py-1 border rounded ${filter.star === 4 ? "bg-rose-50 border-rose-300" : "bg-white"}`}
                >
                  4 Sao ({stats.counts[1]})
                </button>
                <button
                  onClick={() => { setFilter({ type: "all", star: 3 }); setPage(1); }}
                  className={`px-3 py-1 border rounded ${filter.star === 3 ? "bg-rose-50 border-rose-300" : "bg-white"}`}
                >
                  3 Sao ({stats.counts[2]})
                </button>
                <button
                  onClick={() => { setFilter({ type: "all", star: 2 }); setPage(1); }}
                  className={`px-3 py-1 border rounded ${filter.star === 2 ? "bg-rose-50 border-rose-300" : "bg-white"}`}
                >
                  2 Sao ({stats.counts[3]})
                </button>
                <button
                  onClick={() => { setFilter({ type: "all", star: 1 }); setPage(1); }}
                  className={`px-3 py-1 border rounded ${filter.star === 1 ? "bg-rose-50 border-rose-300" : "bg-white"}`}
                >
                  1 Sao ({stats.counts[4]})
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setFilter((s) => ({ ...s, type: s.type === "media" ? "all" : "media" })); setPage(1); }}
                  className={`px-3 py-1 border rounded ${filter.type === "media" ? "bg-rose-50 border-rose-300" : "bg-white"}`}
                >
                  Có hình ảnh / video ({stats.withMedia})
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Write review form */}
        <section className="mb-6 bg-white border rounded-lg p-4">
          <form onSubmit={submitReview}>
            <div className="flex items-center gap-3 mb-3">
              <label className="text-sm">Đánh giá:</label>
              <select
                value={newReview.rating}
                onChange={(e) => setNewReview((s) => ({ ...s, rating: Number(e.target.value) }))}
                className="border px-2 py-1 rounded"
              >
                {[5, 4, 3, 2, 1].map((v) => (
                  <option key={v} value={v}>{v} sao</option>
                ))}
              </select>
            </div>
            <textarea
              value={newReview.content}
              onChange={(e) => setNewReview((s) => ({ ...s, content: e.target.value }))}
              rows={3}
              className="w-full border rounded p-2 mb-3"
              placeholder="Viết nhận xét của bạn..."
            />

            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">Bạn phải đăng nhập để gửi đánh giá</div>
              <div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-rose-600 text-white rounded"
                >
                  {submitting ? "Đang gửi..." : "Gửi đánh giá"}
                </button>
              </div>
            </div>
            {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
          </form>
        </section>

        {/* Reviews list */}
        <section className="bg-white border rounded-lg p-4">
          {loading ? (
            <div className="text-center py-8">Đang tải đánh giá...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Chưa có đánh giá nào.</div>
          ) : (
            <>
              <div className="space-y-4">
                {pageItems.map((review) => (
                  <article key={review.id} className="py-4 border-b last:border-0 flex gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-sm text-gray-700">
                      {String(review.username || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-sm">{review.username}</div>
                          <div className="flex items-center gap-2 text-xs text-yellow-400 mt-1">{renderStars(Math.round(review.rating))}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            {review.date ? new Date(review.date).toLocaleString() : ""}
                          </div>
                        </div>
                        <div className="text-gray-400">
                          <FaEllipsisV />
                        </div>
                      </div>

                      <p className="text-sm text-gray-700 mt-2 whitespace-pre-line">{review.content}</p>

                      {/* media thumbnails */}
                      {review.media && review.media.length > 0 && (
                        <div className="flex gap-2 mt-3">
                          {review.media.slice(0, 5).map((m, idx) => {
                            // m might be string url or object { url }
                            const url = typeof m === "string" ? m : m.url ?? m.path ?? "";
                            return (
                              <button key={idx} onClick={() => setSelectedImage(url)} className="w-16 h-16 rounded overflow-hidden border">
                                {url ? (
                                  <img src={url} alt="media" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400"><FaImage /></div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                        <button onClick={() => markHelpful(review.id)} className="flex items-center gap-2 hover:text-rose-600">
                          <FaThumbsUp /> <span>Hữu ích</span> <span className="text-gray-400">({review.helpfulCount ?? 0})</span>
                        </button>
                        <button className="flex items-center gap-2 hover:text-gray-800">
                          <FaRegCommentDots /> Bình luận
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-500">Hiển thị { (page-1)*perPage + 1 } - { Math.min(page*perPage, filtered.length) } trên {filtered.length}</div>
                <div className="flex items-center gap-2">
                  <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 border rounded disabled:opacity-50">Prev</button>
                  <div className="px-3 py-1 border rounded bg-white">{page}/{totalPages}</div>
                  <button disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
                </div>
              </div>
            </>
          )}
        </section>

        {/* image modal */}
        {selectedImage && (
          <div onClick={() => setSelectedImage(null)} className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="max-w-3xl max-h-full overflow-auto">
              <img src={selectedImage} alt="preview" className="max-w-full max-h-[80vh] rounded" />
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
// ...existing code...