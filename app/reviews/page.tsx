"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FaArrowLeft, FaStar, FaRegStar, FaCommentAlt } from "react-icons/fa";
import { medicApi, Review } from "@/lib/api";

function Stars({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) =>
        i <= rating
          ? <FaStar key={i} size={14} color="#eab308" />
          : <FaRegStar key={i} size={14} color="#d1d5db" />
      )}
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
}

export default function ReviewsPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [medicId, setMedicId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("medic_token");
    if (!token) { router.push("/auth"); return; }
    try {
      const medic = JSON.parse(localStorage.getItem("medic") ?? "{}");
      if (medic?.id) setMedicId(medic.id);
    } catch {}
  }, [router]);

  const fetchReviews = useCallback(async (p: number, append: boolean, id: string) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const res = await medicApi.reviews.getByMedic(id, p);
      setReviews((prev) => append ? [...prev, ...res.data] : res.data);
      setTotal(res.total);
      setPage(res.page);
      setTotalPages(res.totalPages);
      if (!append && res.data.length > 0) {
        const avg = res.data.reduce((sum, r) => sum + r.rating, 0) / res.data.length;
        setAvgRating(Math.round(avg * 10) / 10);
      }
    } catch {}
    finally { setLoading(false); setLoadingMore(false); }
  }, []);

  useEffect(() => {
    if (medicId) fetchReviews(1, false, medicId);
  }, [medicId, fetchReviews]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#0d9488", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 20px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button
              onClick={() => router.push("/profile")}
              style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#fff" }}
            >
              <FaArrowLeft size={15} />
            </button>
            <p style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>Мои отзывы</p>
            <div style={{ width: 36 }} />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: "-20px auto 0", padding: "0 16px 80px" }}>

        {/* Summary card */}
        {total > 0 && (
          <div style={{ background: "#fff", borderRadius: 16, padding: "20px", marginBottom: 12, boxShadow: "0 1px 6px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ textAlign: "center", flex: 1 }}>
              <p style={{ fontSize: 36, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{avgRating ?? "—"}</p>
              <div style={{ display: "flex", justifyContent: "center", gap: 3, margin: "6px 0" }}>
                {[1,2,3,4,5].map((i) => (
                  <FaStar key={i} size={16} color={avgRating && i <= Math.round(avgRating) ? "#eab308" : "#e2e8f0"} />
                ))}
              </div>
              <p style={{ fontSize: 12, color: "#64748b" }}>{total} отзывов</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {reviews.length === 0 && !loading && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <FaCommentAlt size={48} color="#cbd5e1" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 15, color: "#94a3b8" }}>Отзывов пока нет</p>
            <p style={{ fontSize: 13, color: "#cbd5e1", marginTop: 6 }}>Они появятся после завершения заказов</p>
          </div>
        )}

        {/* Review cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {reviews.map((review) => (
            <div key={review.id} style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 1px 6px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Stars rating={review.rating} />
                <span style={{ fontSize: 12, color: "#94a3b8" }}>{formatDate(review.createdAt)}</span>
              </div>
              {review.comment ? (
                <p style={{ fontSize: 14, color: "#334155", lineHeight: 1.6 }}>{review.comment}</p>
              ) : (
                <p style={{ fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>Без комментария</p>
              )}
            </div>
          ))}
        </div>

        {/* Load more */}
        {page < totalPages && (
          <button
            onClick={() => medicId && fetchReviews(page + 1, true, medicId)}
            disabled={loadingMore}
            style={{ width: "100%", marginTop: 10, background: "transparent", border: "1.5px solid #e2e8f0", borderRadius: 12, padding: 13, fontSize: 14, color: "#0d9488", fontWeight: 600, cursor: "pointer" }}
          >
            {loadingMore ? "Загружаем..." : "Загрузить ещё"}
          </button>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
