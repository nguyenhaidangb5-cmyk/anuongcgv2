"use client";
import React, { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import Image from 'next/image';
import Link from 'next/link';
import { Restaurant, BADGE_LABELS } from '@/types/wordpress';
import { useParams, useRouter } from 'next/navigation';
import { fetchRestaurantBySlug } from '@/lib/api';
import { ImageGallery } from '@/components/ImageGallery';
import { ReportModal } from '@/components/ReportModal';

const getBadgeStyle = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('máy lạnh') || l.includes('view sông') || l.includes('view')) {
        return {
            class: 'bg-blue-50 text-blue-700 border-blue-200',
            icon: l.includes('máy lạnh') ? '❄️' : '🌊'
        };
    }
    if (l.includes('ngon, bổ, rẻ') || l.includes('xác thực')) {
        return {
            class: 'bg-green-50 text-green-700 border-green-200',
            icon: l.includes('xác thực') ? '✅' : '💰'
        };
    }
    if (l.includes('địa phương') || l.includes('chuẩn vị')) {
        return {
            class: 'bg-orange-50 text-orange-700 border-orange-200',
            icon: l.includes('địa phương') ? '🏠' : '⭐'
        };
    }
    if (l.includes('hot') || l.includes('trending')) {
        return {
            class: 'bg-red-50 text-red-700 border-red-200',
            icon: '🔥'
        };
    }
    if (l.includes('gia đình')) {
        return {
            class: 'bg-purple-50 text-purple-700 border-purple-200',
            icon: '👨‍👩‍👧‍👦'
        };
    }
    return {
        class: 'bg-gray-50 text-gray-600 border-gray-200',
        icon: '📍'
    };
};

export default function RestaurantDetailPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;
    const [data, setData] = useState<Restaurant | null>(null);
    const [loading, setLoading] = useState(true);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxImages, setLightboxImages] = useState<string[]>([]);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [touchStartX, setTouchStartX] = useState<number | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const result = await fetchRestaurantBySlug(slug);
                setData(result);
            } catch (error) {
                console.error('Error fetching restaurant:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [slug]);

    // Keyboard navigation + body scroll lock for lightbox
    useEffect(() => {
        if (!lightboxOpen) return;
        document.body.style.overflow = 'hidden';
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') setLightboxIndex(i => Math.max(0, i - 1));
            if (e.key === 'ArrowRight') setLightboxIndex(i => Math.min(lightboxImages.length - 1, i + 1));
            if (e.key === 'Escape') setLightboxOpen(false);
        };
        window.addEventListener('keydown', handleKey);
        return () => {
            window.removeEventListener('keydown', handleKey);
            document.body.style.overflow = '';
        };
    }, [lightboxOpen, lightboxImages.length]);

    const lightboxPrev = () => setLightboxIndex(i => Math.max(0, i - 1));
    const lightboxNext = () => setLightboxIndex(i => Math.min(lightboxImages.length - 1, i + 1));

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStartX(e.touches[0].clientX);
    };
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX === null) return;
        const delta = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(delta) > 50) {
            if (delta < 0) lightboxNext();
            else lightboxPrev();
        }
        setTouchStartX(null);
    };

    const openMenuLightbox = () => {
        if (!data?.menu_images?.length) return;
        setLightboxImages(data.menu_images.map(img => img.sourceUrl));
        setLightboxIndex(0);
        setLightboxOpen(true);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="container mx-auto px-4 py-20 text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Đang tải...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navbar />
                <div className="container mx-auto px-4 py-20 text-center">
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">Không tìm thấy quán ăn</h1>
                    <Link href="/" className="text-orange-500 hover:underline">← Quay về trang chủ</Link>
                </div>
            </div>
        );
    }

    // Tính điểm trung bình
    const ratings = [
        { label: 'Chất lượng món', value: Number(data.rating_food || 0), icon: '🍽️' },
        { label: 'Giá cả', value: Number(data.rating_price || 0), icon: '💵' },
        { label: 'Phục vụ', value: Number(data.rating_service || 0), icon: '👨‍🍳' },
        { label: 'Không gian', value: Number(data.rating_ambiance || 0), icon: '🏪' },
    ].filter((r) => r.value > 0);

    const averageRating = ratings.length
        ? (ratings.reduce((a, b) => a + b.value, 0) / ratings.length).toFixed(1)
        : null;

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            {/* Cover Image Header */}
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
                        {averageRating && (
                            <div className="flex items-center gap-2">
                                <div className="bg-orange-500 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-xl font-bold text-sm md:text-lg shadow-lg flex items-center gap-2">
                                    <span className="text-lg md:text-2xl">⭐</span>
                                    <span>{averageRating}</span>
                                    <span className="text-xs md:text-sm opacity-90">/ 10</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
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

                    {/* Left Column - Main Info */}
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
                                    <span>🏷️</span> Tiện ích & Đặc điểm
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

                        {/* Menu Images Section - ẨN TRÊN MOBILE, chỉ hiện desktop */}
                        {data.menu_images && data.menu_images.length > 0 && (
                            <div className="hidden md:block">
                                <ImageGallery
                                    images={data.menu_images}
                                    title="Thực Đơn"
                                    icon="📋"
                                />
                            </div>
                        )}

                        {/* Gallery Images Section */}
                        {data.gallery_images && data.gallery_images.length > 0 && (
                            <ImageGallery
                                images={data.gallery_images}
                                title="Không Gian Quán"
                                icon="🏪"
                            />
                        )}

                    </div>

                    {/* Right Column - Ratings & Actions */}
                    <div className="space-y-6">

                        {/* Action Buttons (Desktop) */}
                        <div className="hidden md:block bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Liên hệ</h2>
                            <div className="space-y-3">
                                {/* Zalo ưu tiên 1 */}
                                {(data as any).zalo_phone && (
                                    <a
                                        href={`https://zalo.me/${(data as any).zalo_phone}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
                                    >
                                        <span className="text-xl">💬</span>
                                        <span>Chat Zalo</span>
                                    </a>
                                )}

                                {/* Phone ưu tiên 2 */}
                                {!(data as any).zalo_phone && data.phone && (
                                    <a
                                        href={`tel:${data.phone}`}
                                        className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
                                    >
                                        <span className="text-xl">📞</span>
                                        <span>Gọi ngay</span>
                                    </a>
                                )}

                                {/* Map ưu tiên 3 */}
                                {!(data as any).zalo_phone && !data.phone && data.map_link && (
                                    <a
                                        href={data.map_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
                                    >
                                        <span className="text-xl">🗺️</span>
                                        <span>Chỉ đường</span>
                                    </a>
                                )}

                                {/* Map link shown separately if phone also exists */}
                                {data.map_link && (data.phone || (data as any).zalo_phone) && (
                                    <a
                                        href={data.map_link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all border border-blue-200"
                                    >
                                        <span className="text-xl">🗺️</span>
                                        <span>Chỉ đường</span>
                                    </a>
                                )}

                                {/* Nút Báo cáo */}
                                <button
                                    onClick={() => setIsReportModalOpen(true)}
                                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all border-2 border-gray-200"
                                >
                                    <span className="text-lg">🚩</span>
                                    <span>Báo cáo lỗi</span>
                                </button>
                            </div>
                        </div>

                        {/* Detailed Ratings */}
                        {ratings.length > 0 && (
                            <div className="bg-white rounded-2xl p-4 md:p-6 border border-gray-100 shadow-sm sticky top-24">
                                <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <span>⭐</span> Đánh giá chi tiết
                                </h2>
                                <div className="space-y-4">
                                    {ratings.map((rating, idx) => (
                                        <div key={idx}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs md:text-sm font-semibold text-gray-700 flex items-center gap-2">
                                                    <span>{rating.icon}</span>
                                                    {rating.label}
                                                </span>
                                                <span className="text-sm md:text-base font-bold text-orange-600">{rating.value}/10</span>
                                            </div>
                                            <div className="w-full bg-gray-100 rounded-full h-2 md:h-2.5 overflow-hidden">
                                                <div
                                                    className="bg-gradient-to-r from-orange-400 to-orange-600 h-full rounded-full transition-all duration-500"
                                                    style={{ width: `${(rating.value / 10) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {averageRating && (
                                    <div className="mt-6 pt-6 border-t border-gray-100">
                                        <div className="text-center">
                                            <p className="text-xs md:text-sm text-gray-500 mb-2">Điểm trung bình</p>
                                            <div className="text-3xl md:text-4xl font-extrabold text-orange-600">{averageRating}</div>
                                            <div className="text-yellow-400 text-xl md:text-2xl mt-1">★★★★★</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {/* Sticky Footer (Mobile Only) - Level 1 Ordering */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-3 md:hidden z-50">
                <div className="flex gap-3">
                    {/* Left: Xem Menu */}
                    {data.menu_images && data.menu_images.length > 0 ? (
                        <button
                            onClick={openMenuLightbox}
                            className="flex-shrink-0 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 border border-gray-300"
                        >
                            <span className="text-lg">📖</span>
                            <span className="text-sm">Xem Menu ({data.menu_images.length})</span>
                        </button>
                    ) : (
                        <button
                            disabled
                            className="flex-shrink-0 bg-gray-50 text-gray-400 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-gray-200 cursor-not-allowed"
                            title="Chưa có menu"
                        >
                            <span className="text-lg">📖</span>
                            <span className="text-sm">Chưa có menu</span>
                        </button>
                    )}

                    {/* Right: Smart Contact Button */}
                    {(data as any).zalo_phone ? (
                        <a
                            href={`https://zalo.me/${(data as any).zalo_phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg"
                        >
                            <span className="text-lg">💬</span>
                            <span>Chat Zalo</span>
                        </a>
                    ) : data.phone ? (
                        <a
                            href={`tel:${data.phone}`}
                            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg"
                        >
                            <span className="text-lg">📞</span>
                            <span>Gọi Ngay</span>
                        </a>
                    ) : data.map_link ? (
                        <a
                            href={data.map_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg"
                        >
                            <span className="text-lg">🗺️</span>
                            <span>Chỉ đường</span>
                        </a>
                    ) : null}
                </div>
            </div>

            {/* Lightbox - Full-screen mobile-optimized Menu/Gallery viewer */}
            {lightboxOpen && lightboxImages.length > 0 && (
                <div
                    className="fixed inset-0 z-[200] bg-black flex flex-col"
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                >
                    {/* Header bar */}
                    <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm">
                        <div className="text-white font-semibold text-base">📖 Thực Đơn</div>
                        <div className="text-white/70 text-sm font-medium">{lightboxIndex + 1} / {lightboxImages.length}</div>
                        <button
                            className="text-white bg-white/20 hover:bg-white/30 active:bg-white/40 rounded-full w-10 h-10 flex items-center justify-center text-lg font-bold transition-all"
                            onClick={() => setLightboxOpen(false)}
                            aria-label="Đóng"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Image area */}
                    <div className="flex-1 flex items-center justify-center relative overflow-hidden">
                        {/* Prev button */}
                        <button
                            className={`absolute left-2 z-10 w-14 h-14 flex items-center justify-center rounded-full text-white text-3xl font-light transition-all active:scale-90 ${lightboxIndex === 0 ? 'bg-white/10 opacity-30 cursor-not-allowed' : 'bg-white/20 hover:bg-white/35'
                                }`}
                            onClick={lightboxPrev}
                            disabled={lightboxIndex === 0}
                            aria-label="Ảnh trước"
                        >
                            ‹
                        </button>

                        {/* Image */}
                        <img
                            src={lightboxImages[lightboxIndex]}
                            alt={`Menu ${lightboxIndex + 1}`}
                            className="max-h-full max-w-full object-contain select-none"
                            draggable={false}
                        />

                        {/* Next button */}
                        <button
                            className={`absolute right-2 z-10 w-14 h-14 flex items-center justify-center rounded-full text-white text-3xl font-light transition-all active:scale-90 ${lightboxIndex === lightboxImages.length - 1 ? 'bg-white/10 opacity-30 cursor-not-allowed' : 'bg-white/20 hover:bg-white/35'
                                }`}
                            onClick={lightboxNext}
                            disabled={lightboxIndex === lightboxImages.length - 1}
                            aria-label="Ảnh tiếp theo"
                        >
                            ›
                        </button>
                    </div>

                    {/* Dot indicators (for ≤10 images) */}
                    {lightboxImages.length > 1 && lightboxImages.length <= 10 && (
                        <div className="flex justify-center gap-2 py-3 bg-black/80">
                            {lightboxImages.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setLightboxIndex(i)}
                                    className={`w-2 h-2 rounded-full transition-all ${i === lightboxIndex ? 'bg-white scale-125' : 'bg-white/40'
                                        }`}
                                />
                            ))}
                        </div>
                    )}

                    {/* Swipe hint (shown only on first image) */}
                    {lightboxImages.length > 1 && lightboxIndex === 0 && (
                        <div className="absolute bottom-16 left-0 right-0 flex justify-center pointer-events-none">
                            <span className="bg-black/50 text-white/70 text-xs px-3 py-1 rounded-full">
                                👉 Vuốt để xem ảnh tiếp theo
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Report Modal */}
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
