"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Star, MessageSquare } from "lucide-react";
import { medicApi, Review } from "@/lib/api";
import DashboardLayout from "@/components/DashboardLayout";

function Stars({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          color={i <= rating ? "#eab308" : "#d1d5db"}
          fill={i <= rating ? "#eab308" : "none"}
        />
      ))}
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" });
}

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60 }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#0d9488", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
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

  return (
    <DashboardLayout>
      {loading ? <Spinner /> : (
        <div>
          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>Статистика</p>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a" }}>Мои отзывы</h1>
          </div>

          {/* Summary card */}
          {total > 0 && (
            <div style={{
              background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
              borderRadius: 16, padding: "24px", marginBottom: 20, color: "#fff",
              display: "flex", alignItems: "center", gap: 24,
            }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 48, fontWeight: 800, lineHeight: 1 }}>{avgRating ?? "—"}</p>
                <div style={{ display: "flex", justifyContent: "center", gap: 4, margin: "8px 0" }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      size={18}
                      color="#fff"
                      fill={avgRating && i <= Math.round(avgRating) ? "#fff" : "transparent"}
                    />
                  ))}
                </div>
                <p style={{ fontSize: 13, opacity: 0.8 }}>{total} отзывов</p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {reviews.length === 0 && !loading && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <MessageSquare size={48} color="#cbd5e1" style={{ margin: "0 auto 12px", display: "block" }} />
              <p style={{ fontSize: 15, color: "#94a3b8" }}>Отзывов пока нет</p>
              <p style={{ fontSize: 13, color: "#cbd5e1", marginTop: 6 }}>Они появятся после завершения заказов</p>
            </div>
          )}

          {/* Review cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {reviews.map((review) => (
              <div key={review.id} style={{
                background: "#fff", borderRadius: 14, padding: 16,
                border: "1px solid #e2e8f0",
              }}>
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
              style={{
                width: "100%", marginTop: 12, background: "transparent",
                border: "1.5px solid #e2e8f0", borderRadius: 12, padding: 13,
                fontSize: 14, color: "#0d9488", fontWeight: 600, cursor: "pointer",
              }}
            >
              {loadingMore ? "Загружаем..." : "Загрузить ещё"}
            </button>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
