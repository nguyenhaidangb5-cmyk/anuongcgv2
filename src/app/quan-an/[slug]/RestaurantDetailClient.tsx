"use client";
import React, { useEffect, useRef, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import Image from 'next/image';
import Link from 'next/link';
import { Restaurant, BADGE_LABELS } from '@/types/wordpress';
import { useRouter } from 'next/navigation';
import { ImageGallery } from '@/components/ImageGallery';
import { ReportModal } from '@/components/ReportModal';
import FacebookComments from '@/components/FacebookComments';
import { ref, onValue, runTransaction, get, set } from 'firebase/database';
import { db } from '@/lib/firebase';
import fpPromise from '@fingerprintjs/fingerprintjs';

// ─── Badge helpers ─────────────────────────────────────────────────────────────
const getBadgeStyle = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('máy lạnh') || l.includes('view sông') || l.includes('view')) {
        return { class: 'bg-blue-50 text-blue-700 border-blue-200', icon: l.includes('máy lạnh') ? '❄️' : '🌊' };
    }
    if (l.includes('ngon, bổ, rẻ')) {
        return { class: 'bg-green-50 text-green-700 border-green-200', icon: '💰' };
    }
    if (l.includes('admin đề xuất') || l.includes('xác thực')) {
        return { class: 'bg-red-600 text-white border-red-700', icon: '👑' };
    }
    if (l.includes('địa phương') || l.includes('chuẩn vị')) {
        return { class: 'bg-orange-50 text-orange-700 border-orange-200', icon: l.includes('địa phương') ? '🏠' : '⭐' };
    }
    if (l.includes('hot') || l.includes('trending')) {
        return { class: 'bg-red-50 text-red-700 border-red-200', icon: '🔥' };
    }
    if (l.includes('gia đình')) {
        return { class: 'bg-purple-50 text-purple-700 border-purple-200', icon: '👨‍👩‍👧‍👦' };
    }
    return { class: 'bg-gray-50 text-gray-600 border-gray-200', icon: '📍' };
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface RestaurantDetailClientProps {
    data: Restaurant;
    slug: string;
}

// Firebase aggregation node: ratings/{restaurantId}
interface RatingStats {
    count: number;
    totalTaste: number;
    totalPrice: number;
    totalService: number;
    totalSpace: number;
    totalOverall: number;
}

// Firebase per-user node: reviews/{restaurantId}/{visitorId}
interface UserReview {
    taste: number;
    price: number;
    service: number;
    space: number;
    overall: number;
    timestamp: number;
    ip: string;
    visitorId: string;
}

// Form state for 4 criteria
interface CriteriaRatings {
    taste: number;    // 0 = not set
    price: number;
    service: number;
    space: number;
}

// Criteria config
const CRITERIA = [
    { key: 'taste' as const, label: 'Hương vị', icon: '🍽️' },
    { key: 'price' as const, label: 'Giá cả', icon: '💵' },
    { key: 'service' as const, label: 'Phục vụ', icon: '👨‍🍳' },
    { key: 'space' as const, label: 'Không gian', icon: '🏪' },
];

// Round to 1 decimal to avoid floating-point garbage
const r1 = (v: number) => Math.round(v * 10) / 10;

// ─── Star Row Component ────────────────────────────────────────────────────────
interface StarRowProps {
    label: string;
    icon: string;
    value: number;       // selected value (0 = none)
    hoverValue: number;  // hovered value (0 = none)
    readOnly?: boolean;
    onChange?: (v: number) => void;
    onHover?: (v: number) => void;
    onLeave?: () => void;
}
function StarRow({ label, icon, value, hoverValue, readOnly, onChange, onHover, onLeave }: StarRowProps) {
    const active = hoverValue || value;
    return (
        <div className="flex items-center gap-3">
            <div className="w-28 flex items-center gap-1.5 flex-shrink-0">
                <span className="text-base">{icon}</span>
                <span className="text-xs font-semibold text-gray-700">{label}</span>
            </div>
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                    <button
                        key={star}
                        type="button"
                        disabled={readOnly}
                        onClick={() => onChange?.(star)}
                        onMouseEnter={() => onHover?.(star)}
                        onMouseLeave={() => onLeave?.()}
                        className={`text-2xl transition-all duration-100 select-none
                            ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110 active:scale-95'}
                            ${star <= active ? 'text-yellow-400' : 'text-gray-200'}`}
                        aria-label={`${label} ${star} sao`}
                    >
                        ★
                    </button>
                ))}
            </div>
            {value > 0 && (
                <span className="text-xs font-bold text-orange-600 ml-1">{value}/5</span>
            )}
        </div>
    );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function RestaurantDetailClient({ data, slug }: RestaurantDetailClientProps) {
    const router = useRouter();
    const ratingFormRef = useRef<HTMLDivElement>(null);

    // ── UI state
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxImages, setLightboxImages] = useState<string[]>([]);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [touchStartX, setTouchStartX] = useState<number | null>(null);

    // ── Identity
    const [fingerprint, setFingerprint] = useState<string | null>(null);

    // ── Firebase aggregated stats
    const [ratingStats, setRatingStats] = useState<RatingStats | null>(null);

    // ── Form: rating criteria state
    const [criteria, setCriteria] = useState<CriteriaRatings>({ taste: 0, price: 0, service: 0, space: 0 });
    const [hoverCriteria, setHoverCriteria] = useState<CriteriaRatings>({ taste: 0, price: 0, service: 0, space: 0 });

    // ── Form: mode
    const [existingReview, setExistingReview] = useState<UserReview | null>(null);
    const [isViewMode, setIsViewMode] = useState(false);   // đã đánh giá, đang xem
    const [isEditMode, setIsEditMode] = useState(false);   // đang chỉnh sửa
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // ─────────────────────────────────────────────────────
    // Effects
    // ─────────────────────────────────────────────────────
    useEffect(() => { setIsMounted(true); }, []);

    // Load fingerprint
    useEffect(() => {
        fpPromise.load().then(fp => fp.get()).then(r => setFingerprint(r.visitorId));
    }, []);

    // Listen to aggregated ratings from Firebase
    useEffect(() => {
        if (!data?.id) return;
        const statsRef = ref(db, `ratings/${data.id}`);
        const unsub = onValue(statsRef, snap => {
            if (snap.exists()) {
                setRatingStats(snap.val() as RatingStats);
            } else {
                setRatingStats(null);
            }
        });
        return () => unsub();
    }, [data?.id]);

    // Load existing review when fingerprint is ready
    useEffect(() => {
        if (!fingerprint || !data?.id) return;
        const reviewRef = ref(db, `reviews/${data.id}/${fingerprint}`);
        get(reviewRef).then(snap => {
            if (snap.exists()) {
                const rev = snap.val() as UserReview;
                setExistingReview(rev);
                setCriteria({ taste: rev.taste, price: rev.price, service: rev.service, space: rev.space });
                setIsViewMode(true);
                setIsEditMode(false);
            }
        });
    }, [fingerprint, data?.id]);

    // ─────────────────────────────────────────────────────
    // Lightbox
    // ─────────────────────────────────────────────────────
    useEffect(() => {
        if (!lightboxOpen) return;
        document.body.style.overflow = 'hidden';
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') setLightboxIndex(i => Math.max(0, i - 1));
            if (e.key === 'ArrowRight') setLightboxIndex(i => Math.min(lightboxImages.length - 1, i + 1));
            if (e.key === 'Escape') setLightboxOpen(false);
        };
        window.addEventListener('keydown', handleKey);
        return () => { window.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
    }, [lightboxOpen, lightboxImages.length]);

    const lightboxPrev = () => setLightboxIndex(i => Math.max(0, i - 1));
    const lightboxNext = () => setLightboxIndex(i => Math.min(lightboxImages.length - 1, i + 1));
    const handleTouchStart = (e: React.TouchEvent) => setTouchStartX(e.touches[0].clientX);
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX === null) return;
        const delta = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(delta) > 50) delta < 0 ? lightboxNext() : lightboxPrev();
        setTouchStartX(null);
    };
    const openMenuLightbox = () => {
        if (!data?.menu_images?.length) return;
        setLightboxImages(data.menu_images.map(img => img.sourceUrl));
        setLightboxIndex(0);
        setLightboxOpen(true);
    };
    void openMenuLightbox;

    // ─────────────────────────────────────────────────────
    // Rating Submit (YC2 + YC3)
    // ─────────────────────────────────────────────────────
    const isAllFilled = criteria.taste > 0 && criteria.price > 0 && criteria.service > 0 && criteria.space > 0;
    const overallRating = isAllFilled
        ? r1((criteria.taste + criteria.price + criteria.service + criteria.space) / 4)
        : 0;

    const handleSubmit = async () => {
        if (!fingerprint || !isAllFilled || isSubmitting) return;
        setIsSubmitting(true);
        setSubmitMessage(null);

        try {
            // Lấy IP
            let ip = 'unknown';
            try {
                const ipRes = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipRes.json();
                ip = ipData.ip;
            } catch { /* ignore IP fetch error */ }

            const newReview: UserReview = {
                taste: criteria.taste,
                price: criteria.price,
                service: criteria.service,
                space: criteria.space,
                overall: overallRating,
                timestamp: Date.now(),
                ip,
                visitorId: fingerprint,
            };

            const reviewRef = ref(db, `reviews/${data.id}/${fingerprint}`);
            const statsRef = ref(db, `ratings/${data.id}`);

            // Firebase Transaction: Upsert aggregated stats (YC2)
            // Trừ điểm cũ nếu đang edit, cộng điểm mới. Fix floating-point dùng r1().
            const oldReview = existingReview;

            await runTransaction(statsRef, (current: RatingStats | null) => {
                if (current === null) {
                    // Lần đầu tiên có review ở quán này
                    return {
                        count: 1,
                        totalTaste: r1(newReview.taste),
                        totalPrice: r1(newReview.price),
                        totalService: r1(newReview.service),
                        totalSpace: r1(newReview.space),
                        totalOverall: r1(newReview.overall),
                    } as RatingStats;
                }

                if (oldReview) {
                    // EDIT: trừ điểm cũ, cộng điểm mới, count không đổi
                    return {
                        count: current.count,
                        totalTaste:   r1((current.totalTaste   || 0) - oldReview.taste    + newReview.taste),
                        totalPrice:   r1((current.totalPrice   || 0) - oldReview.price    + newReview.price),
                        totalService: r1((current.totalService || 0) - oldReview.service  + newReview.service),
                        totalSpace:   r1((current.totalSpace   || 0) - oldReview.space    + newReview.space),
                        totalOverall: r1((current.totalOverall || 0) - oldReview.overall  + newReview.overall),
                    } as RatingStats;
                } else {
                    // THÊM MỚI: cộng thêm 1
                    return {
                        count: (current.count || 0) + 1,
                        totalTaste:   r1((current.totalTaste   || 0) + newReview.taste),
                        totalPrice:   r1((current.totalPrice   || 0) + newReview.price),
                        totalService: r1((current.totalService || 0) + newReview.service),
                        totalSpace:   r1((current.totalSpace   || 0) + newReview.space),
                        totalOverall: r1((current.totalOverall || 0) + newReview.overall),
                    } as RatingStats;
                }
            });

            // Ghi/ghi đè review của user (set = upsert)
            await set(reviewRef, newReview);

            setExistingReview(newReview);
            setIsViewMode(true);
            setIsEditMode(false);
            setSubmitMessage({ type: 'success', text: oldReview ? 'Đã cập nhật đánh giá của bạn! 🎉' : 'Cảm ơn bạn đã đánh giá! 🎉' });

        } catch (error) {
            console.error('Rating error:', error);
            setSubmitMessage({ type: 'error', text: 'Đã có lỗi xảy ra. Vui lòng thử lại sau!' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─────────────────────────────────────────────────────
    // YC4: Tính toán 3 tầng hiển thị điểm
    // ─────────────────────────────────────────────────────
    const hasFirebaseData = ratingStats !== null && ratingStats.count > 0;

    // Tầng 1: Firebase averages (thang 5 → thang 10)
    const firebaseScores = hasFirebaseData ? {
        taste:   r1((ratingStats.totalTaste   / ratingStats.count) * 2),
        price:   r1((ratingStats.totalPrice   / ratingStats.count) * 2),
        service: r1((ratingStats.totalService / ratingStats.count) * 2),
        space:   r1((ratingStats.totalSpace   / ratingStats.count) * 2),
        overall: r1((ratingStats.totalOverall / ratingStats.count) * 2),
    } : null;

    // Tầng 2: Admin WP scores (thang 10 trực tiếp)
    const adminTaste   = Number(data.rating_food || 0);
    const adminPrice   = Number(data.rating_price || 0);
    const adminService = Number(data.rating_service || 0);
    const adminSpace   = Number(data.rating_ambiance || 0);
    const hasAdminData = adminTaste > 0 || adminPrice > 0 || adminService > 0 || adminSpace > 0;

    const adminScores = hasAdminData ? {
        taste:   adminTaste,
        price:   adminPrice,
        service: adminService,
        space:   adminSpace,
        overall: (() => {
            const vals = [adminTaste, adminPrice, adminService, adminSpace].filter(v => v > 0);
            return vals.length ? r1(vals.reduce((a, b) => a + b) / vals.length) : 0;
        })(),
    } : null;

    // Lấy nguồn điểm dùng hiển thị
    const displayScores = firebaseScores ?? adminScores;
    const isAdminFallback = !firebaseScores && !!adminScores;
    const isEmpty = !firebaseScores && !adminScores;

    // Admin overall (dùng cho hero header badge)
    const adminOverallForHeader = adminScores?.overall ?? null;

    const currentUrl = `https://anuongcangiuoc.org/quan-an/${slug}`;

    // ─────────────────────────────────────────────────────
    // YC3 HELPER: Reset form to edit
    // ─────────────────────────────────────────────────────
    const enterEditMode = () => {
        if (existingReview) {
            setCriteria({ taste: existingReview.taste, price: existingReview.price, service: existingReview.service, space: existingReview.space });
        }
        setIsEditMode(true);
        setIsViewMode(false);
        setSubmitMessage(null);
    };

    const scrollToRatingForm = () => {
        ratingFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    // ─────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            {/* ── Cover Image Header ─────────────────────────── */}
            <div className="relative h-[250px] md:h-[400px] w-full overflow-hidden">
                <Image
                    src={data.featured_media_url || 'https://placehold.co/1200x400?text=Restaurant'}
                    alt={data.title.rendered}
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

                {/* Mobile Back Button */}
                <button
                    onClick={() => router.back()}
                    className="md:hidden absolute top-4 left-4 z-50 w-10 h-10 bg-white/80 backdrop-blur-sm hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95"
                    aria-label="Quay lại"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>

                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 text-white">
                    <div className="container mx-auto">
                        <h1 className="text-2xl md:text-4xl lg:text-5xl font-extrabold mb-2 drop-shadow-lg">
                            {data.title.rendered}
                        </h1>
                        {/* Hiển thị badge điểm tổng hợp ở header */}
                        {(hasFirebaseData && firebaseScores) ? (
                            <div className="flex items-center gap-2">
                                <div className="bg-orange-500 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-xl font-bold text-sm md:text-lg shadow-lg flex items-center gap-2">
                                    <span className="text-lg md:text-2xl">⭐</span>
                                    <span>{firebaseScores.overall}</span>
                                    <span className="text-xs md:text-sm opacity-90">/ 10</span>
                                </div>
                                <span className="text-white/80 text-xs">{ratingStats!.count} lượt đánh giá</span>
                            </div>
                        ) : adminOverallForHeader ? (
                            <div className="flex items-center gap-2">
                                <div className="bg-gray-600/80 text-white px-3 py-1.5 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2">
                                    <span>⭐</span>
                                    <span>{adminOverallForHeader}</span>
                                    <span className="text-xs opacity-90">/ 10</span>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* ── Main Content ───────────────────────────────── */}
            <div className="container mx-auto px-3 md:px-4 py-6 md:py-10 pb-24 md:pb-10">

                {/* Breadcrumb */}
                <nav className="text-xs md:text-sm text-gray-500 mb-4 md:mb-6 flex items-center gap-2">
                    <Link href="/" className="hover:text-orange-500 transition-colors">Trang chủ</Link>
                    <span>/</span>
                    <Link href="/kham-pha" className="hover:text-orange-500 transition-colors">Khám phá</Link>
                    <span>/</span>
                    <span className="text-gray-900 font-medium">{data.title.rendered}</span>
                </nav>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">

                    {/* ── Left Column ─────────────────────────── */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Quick Info Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                            <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm">
                                <div className="text-2xl md:text-3xl mb-2">📍</div>
                                <h3 className="text-xs md:text-sm font-bold text-gray-500 uppercase mb-1">Địa chỉ</h3>
                                <p className="text-sm md:text-base font-semibold text-gray-900">{data.address || 'Đang cập nhật'}</p>
                            </div>
                            <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm">
                                <div className="text-2xl md:text-3xl mb-2">🕒</div>
                                <h3 className="text-xs md:text-sm font-bold text-gray-500 uppercase mb-1">Giờ mở cửa</h3>
                                <p className="text-sm md:text-base font-semibold text-gray-900">{data.hours || 'Đang cập nhật'}</p>
                            </div>
                            <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm">
                                <div className="text-2xl md:text-3xl mb-2">💰</div>
                                <h3 className="text-xs md:text-sm font-bold text-gray-500 uppercase mb-1">Khoảng giá</h3>
                                <p className="text-sm md:text-base font-semibold text-orange-600">{data.price || 'Đang cập nhật'}</p>
                            </div>
                        </div>

                        {/* Amenities / Badges */}
                        {data.badges && data.badges.length > 0 && (
                            <div className="bg-white rounded-2xl p-4 md:p-6 border border-gray-100 shadow-sm">
                                <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <span>🏷️</span> Tiện ích &amp; Đặc điểm
                                </h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {data.badges.map((badgeKey) => {
                                        const badgeData = BADGE_LABELS[badgeKey as keyof typeof BADGE_LABELS];
                                        if (!badgeData) return null;
                                        const style = getBadgeStyle(badgeData.label);
                                        return (
                                            <div key={badgeKey} className={`${style.class} border-2 rounded-xl p-3 md:p-4 flex flex-col items-center justify-center text-center transition-transform hover:scale-105`}>
                                                <span className="text-2xl md:text-3xl mb-2">{style.icon}</span>
                                                <span className="text-xs md:text-sm font-bold">{badgeData.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Description */}
                        {data.content && data.content.rendered && (
                            <div className="bg-white rounded-2xl p-4 md:p-6 border border-gray-100 shadow-sm">
                                <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <span>📝</span> Giới thiệu
                                </h2>
                                <div
                                    className="prose prose-sm md:prose-base max-w-none text-gray-700 leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: data.content.rendered }}
                                />
                            </div>
                        )}

                        {/* Menu Images */}
                        {data.menu_images && data.menu_images.length > 0 && (
                            <ImageGallery images={data.menu_images} title="Thực Đơn" icon="📋" />
                        )}

                        {/* Gallery Images */}
                        {data.gallery_images && data.gallery_images.length > 0 && (
                            <ImageGallery images={data.gallery_images} title="Không Gian Quán" icon="🏪" />
                        )}

                        {/* ── Community Rating Form (YC3) ──────── */}
                        <div ref={ratingFormRef} className="bg-white rounded-2xl p-4 md:p-6 border border-gray-100 shadow-sm">
                            <div className="bg-gradient-to-b from-orange-50 to-white border border-orange-100 rounded-xl p-5 md:p-6 mb-6 shadow-sm">
                                <h3 className="text-gray-900 font-bold text-lg md:text-xl mb-1 flex items-center justify-center gap-2">
                                    <span>💬</span> Đánh giá của bạn
                                </h3>
                                <p className="text-gray-500 text-sm text-center mb-5">
                                    Chấm điểm 4 tiêu chí để cộng đồng có thêm thông tin nhé!
                                </p>

                                {/* ── VIEW MODE ── */}
                                {isViewMode && !isEditMode && existingReview && (
                                    <div>
                                        <div className="space-y-3 mb-4">
                                            {CRITERIA.map(c => (
                                                <StarRow
                                                    key={c.key}
                                                    label={c.label}
                                                    icon={c.icon}
                                                    value={criteria[c.key]}
                                                    hoverValue={0}
                                                    readOnly
                                                />
                                            ))}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm text-gray-500">
                                                Điểm tổng: <span className="font-bold text-orange-600">{existingReview.overall}/5</span>
                                            </div>
                                            <button
                                                onClick={enterEditMode}
                                                className="flex items-center gap-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold px-4 py-2 rounded-xl text-sm transition-all border border-orange-200"
                                            >
                                                ✏️ Sửa đánh giá
                                            </button>
                                        </div>
                                        {submitMessage && (
                                            <div className={`mt-3 text-center text-sm font-semibold py-2 rounded-lg ${submitMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                {submitMessage.text}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ── EDIT / SUBMIT MODE ── */}
                                {(!isViewMode || isEditMode) && (
                                    <div>
                                        <div className="space-y-3 mb-5">
                                            {CRITERIA.map(c => (
                                                <StarRow
                                                    key={c.key}
                                                    label={c.label}
                                                    icon={c.icon}
                                                    value={criteria[c.key]}
                                                    hoverValue={hoverCriteria[c.key]}
                                                    onChange={v => setCriteria(prev => ({ ...prev, [c.key]: v }))}
                                                    onHover={v => setHoverCriteria(prev => ({ ...prev, [c.key]: v }))}
                                                    onLeave={() => setHoverCriteria(prev => ({ ...prev, [c.key]: 0 }))}
                                                />
                                            ))}
                                        </div>

                                        {/* Overall preview */}
                                        {isAllFilled && (
                                            <div className="bg-orange-50 rounded-xl p-3 mb-4 flex items-center justify-between">
                                                <span className="text-sm text-gray-600 font-medium">Điểm tổng hợp:</span>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-orange-400 text-lg">★</span>
                                                    <span className="font-extrabold text-orange-600 text-lg">{overallRating}</span>
                                                    <span className="text-gray-400 text-sm">/5</span>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex gap-3">
                                            {isEditMode && (
                                                <button
                                                    onClick={() => { setIsEditMode(false); setIsViewMode(true); setSubmitMessage(null); }}
                                                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-all text-sm"
                                                >
                                                    Hủy
                                                </button>
                                            )}
                                            <button
                                                onClick={handleSubmit}
                                                disabled={!isAllFilled || isSubmitting || !fingerprint}
                                                className={`flex-1 font-bold py-3 rounded-xl transition-all text-sm
                                                    ${isAllFilled && !isSubmitting && fingerprint
                                                        ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-200 hover:shadow-lg active:scale-98'
                                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                                            >
                                                {isSubmitting ? '⏳ Đang gửi...' : isEditMode ? '💾 Lưu thay đổi' : '🌟 Gửi đánh giá'}
                                            </button>
                                        </div>

                                        {!isAllFilled && (
                                            <p className="text-center text-xs text-gray-400 mt-2">
                                                Vui lòng chấm đủ {CRITERIA.filter(c => criteria[c.key] === 0).length} tiêu chí còn lại để gửi
                                            </p>
                                        )}

                                        {submitMessage && (
                                            <div className={`mt-3 text-center text-sm font-semibold py-2 rounded-lg ${submitMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                {submitMessage.text}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Facebook Comments */}
                            <div className="w-full min-h-[200px]">
                                {isMounted && <FacebookComments url={currentUrl} numPosts={5} />}
                            </div>
                        </div>

                    </div>

                    {/* ── Right Column ─────────────────────────── */}
                    <div className="space-y-6 sticky top-24 self-start">

                        {/* Action Buttons (Desktop) */}
                        <div className="hidden md:block bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Liên hệ</h2>
                            <div className="space-y-3">
                                {(data as any).zalo_phone && (
                                    <a href={`https://zalo.me/${(data as any).zalo_phone}`} target="_blank" rel="noopener noreferrer"
                                        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg">
                                        <span className="text-xl">💬</span><span>Chat Zalo</span>
                                    </a>
                                )}
                                {!(data as any).zalo_phone && data.phone && (
                                    <a href={`tel:${data.phone}`}
                                        className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg">
                                        <span className="text-xl">📞</span><span>Gọi ngay</span>
                                    </a>
                                )}
                                {!(data as any).zalo_phone && !data.phone && data.map_link && (
                                    <a href={data.map_link} target="_blank" rel="noopener noreferrer"
                                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg">
                                        <span className="text-xl">🗺️</span><span>Chỉ đường</span>
                                    </a>
                                )}
                                {data.map_link && (data.phone || (data as any).zalo_phone) && (
                                    <a href={data.map_link} target="_blank" rel="noopener noreferrer"
                                        className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all border border-blue-200">
                                        <span className="text-xl">🗺️</span><span>Chỉ đường</span>
                                    </a>
                                )}
                                <button onClick={() => setIsReportModalOpen(true)}
                                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all border-2 border-gray-200">
                                    <span className="text-lg">🚩</span><span>Báo cáo lỗi</span>
                                </button>
                            </div>
                        </div>

                        {/* ── YC4: Detailed Score Block (3-tier) ── */}
                        <div className="bg-white rounded-2xl p-4 md:p-6 border border-gray-100 shadow-sm">
                            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <span>⭐</span> Đánh giá chi tiết
                            </h2>

                            {/* Tầng 1 & 2: Có điểm hiển thị */}
                            {!isEmpty && displayScores && (
                                <div className="space-y-4">
                                    {/* Note nguồn dữ liệu */}
                                    {isAdminFallback && (
                                        <div className="text-xs text-gray-400 italic bg-gray-50 rounded-lg px-3 py-2 flex items-center gap-1.5">
                                            <span>ℹ️</span>
                                            <span>Điểm tham khảo từ Admin · Chưa có đánh giá cộng đồng</span>
                                        </div>
                                    )}
                                    {hasFirebaseData && ratingStats && (
                                        <div className="text-xs text-orange-600 font-semibold bg-orange-50 rounded-lg px-3 py-2 flex items-center gap-1.5">
                                            <span>🔥</span>
                                            <span>Dựa trên {ratingStats.count} đánh giá cộng đồng</span>
                                        </div>
                                    )}

                                    {/* 4 Progress Bars */}
                                    {CRITERIA.map(c => {
                                        const score = displayScores[c.key as keyof typeof displayScores];
                                        return (
                                            <div key={c.key}>
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-xs md:text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                                                        <span>{c.icon}</span>{c.label}
                                                    </span>
                                                    <span className="text-sm md:text-base font-bold text-orange-600">
                                                        {score.toFixed(1)}/10
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-2 md:h-2.5 overflow-hidden">
                                                    <div
                                                        className="bg-gradient-to-r from-orange-400 to-orange-600 h-full rounded-full transition-all duration-700"
                                                        style={{ width: `${(score / 10) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Overall */}
                                    <div className="mt-5 pt-5 border-t border-gray-100 text-center">
                                        <p className="text-xs text-gray-500 mb-1">Điểm trung bình</p>
                                        <div className="text-3xl md:text-4xl font-extrabold text-orange-600">
                                            {displayScores.overall.toFixed(1)}
                                        </div>
                                        <div className="text-yellow-400 text-xl mt-1">★★★★★</div>
                                        <p className="text-xs text-gray-400 mt-0.5">/ 10 điểm</p>
                                    </div>
                                </div>
                            )}

                            {/* Tầng 3: Empty State CTA */}
                            {isEmpty && (
                                <div className="flex flex-col items-center text-center py-4 gap-4">
                                    <div className="text-5xl">🍽️</div>
                                    <div>
                                        <p className="font-bold text-gray-800 text-sm md:text-base mb-1">
                                            Chưa có đánh giá chi tiết
                                        </p>
                                        <p className="text-gray-500 text-xs md:text-sm leading-relaxed">
                                            Hãy là người đầu tiên trải nghiệm và chấm điểm cho quán này!
                                        </p>
                                    </div>
                                    <button
                                        onClick={scrollToRatingForm}
                                        className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-orange-200 hover:shadow-lg active:scale-95"
                                    >
                                        🌟 Đánh giá ngay
                                    </button>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>

            {/* ── Sticky Footer (Mobile) ──────────────────────── */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-3 md:hidden z-50">
                <div className="flex gap-3">
                    {data.map_link ? (
                        <a href={data.map_link} target="_blank" rel="noopener noreferrer"
                            className="flex-1 bg-white border-2 border-orange-400 text-orange-600 hover:bg-orange-50 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>Chỉ đường</span>
                        </a>
                    ) : (
                        <button disabled className="flex-1 bg-gray-50 border-2 border-gray-200 text-gray-400 font-bold py-3 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>Chỉ đường</span>
                        </button>
                    )}

                    {(data as any).zalo_phone ? (
                        <a href={`https://zalo.me/${(data as any).zalo_phone}`} target="_blank" rel="noopener noreferrer"
                            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-orange-200">
                            <span className="text-lg">💬</span><span>Chat Zalo</span>
                        </a>
                    ) : data.phone ? (
                        <a href={`tel:${data.phone}`}
                            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-orange-200">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span>Gọi Ngay</span>
                        </a>
                    ) : (
                        <button disabled className="flex-1 bg-gray-200 text-gray-400 font-bold py-3 rounded-xl flex items-center justify-center gap-2 cursor-not-allowed">
                            <span className="text-lg">📞</span><span>Liên hệ</span>
                        </button>
                    )}
                </div>

                <button onClick={() => setIsReportModalOpen(true)}
                    className="w-full mt-2 bg-gray-100 hover:bg-gray-200 text-gray-500 font-medium py-2 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 text-sm border border-gray-200">
                    <span>🚩</span><span>Báo cáo thông tin không chính xác</span>
                </button>
            </div>

            {/* ── Lightbox ────────────────────────────────────── */}
            {lightboxOpen && lightboxImages.length > 0 && (
                <div className="fixed inset-0 z-[200] bg-black flex flex-col" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                    <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm">
                        <div className="text-white font-semibold text-base">📖 Thực Đơn</div>
                        <div className="text-white/70 text-sm font-medium">{lightboxIndex + 1} / {lightboxImages.length}</div>
                        <button className="text-white bg-white/20 hover:bg-white/30 active:bg-white/40 rounded-full w-10 h-10 flex items-center justify-center text-lg font-bold transition-all" onClick={() => setLightboxOpen(false)} aria-label="Đóng">✕</button>
                    </div>
                    <div className="flex-1 flex items-center justify-center relative overflow-hidden">
                        <button className={`absolute left-2 z-10 w-14 h-14 flex items-center justify-center rounded-full text-white text-3xl font-light transition-all active:scale-90 ${lightboxIndex === 0 ? 'bg-white/10 opacity-30 cursor-not-allowed' : 'bg-white/20 hover:bg-white/35'}`} onClick={lightboxPrev} disabled={lightboxIndex === 0} aria-label="Ảnh trước">‹</button>
                        <img src={lightboxImages[lightboxIndex]} alt={`Menu ${lightboxIndex + 1}`} className="max-h-full max-w-full object-contain select-none" draggable={false} />
                        <button className={`absolute right-2 z-10 w-14 h-14 flex items-center justify-center rounded-full text-white text-3xl font-light transition-all active:scale-90 ${lightboxIndex === lightboxImages.length - 1 ? 'bg-white/10 opacity-30 cursor-not-allowed' : 'bg-white/20 hover:bg-white/35'}`} onClick={lightboxNext} disabled={lightboxIndex === lightboxImages.length - 1} aria-label="Ảnh tiếp theo">›</button>
                    </div>
                    {lightboxImages.length > 1 && lightboxImages.length <= 10 && (
                        <div className="flex justify-center gap-2 py-3 bg-black/80">
                            {lightboxImages.map((_, i) => (
                                <button key={i} onClick={() => setLightboxIndex(i)} className={`w-2 h-2 rounded-full transition-all ${i === lightboxIndex ? 'bg-white scale-125' : 'bg-white/40'}`} />
                            ))}
                        </div>
                    )}
                    {lightboxImages.length > 1 && lightboxIndex === 0 && (
                        <div className="absolute bottom-16 left-0 right-0 flex justify-center pointer-events-none">
                            <span className="bg-black/50 text-white/70 text-xs px-3 py-1 rounded-full">👉 Vuốt để xem ảnh tiếp theo</span>
                        </div>
                    )}
                </div>
            )}

            {/* ── Report Modal ─────────────────────────────────── */}
            {data && (
                <ReportModal
                    restaurantId={data.id}
                    restaurantName={data.title.rendered}
                    isOpen={isReportModalOpen}
                    onClose={() => setIsReportModalOpen(false)}
                />
            )}
        </div>
    );
}
