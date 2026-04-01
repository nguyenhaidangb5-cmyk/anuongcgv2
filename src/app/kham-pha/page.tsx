"use client";
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Fuse from 'fuse.js';
import { Navbar } from '@/components/Navbar';
import { RestaurantCard } from '@/components/RestaurantCard';
import { Restaurant } from '@/types/wordpress';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { fetchRestaurantsWithPagination } from '@/lib/api';
import { normalizeVietnameseString } from '@/lib/vietnamese-utils';
import { ref, get } from 'firebase/database';
import { db } from '@/lib/firebase';
import { FirebaseRating } from '@/types/firebase';

import { Suspense } from 'react';

/**
 * Số quán hiển thị mỗi lần "tải thêm" (client-side slice).
 * Không còn là PER_PAGE gửi lên API nữa.
 */
const ITEMS_PER_PAGE = 18;
const SS_VISIBLE_COUNT_KEY = 'khamPha_visibleCount';
const SS_SCROLL_Y_KEY = 'khamPha_scrollY';

/** Đọc visibleCount từ sessionStorage đồng bộ (an toàn ở "use client"). */
function readSavedVisibleCount(): number {
    try {
        if (typeof window === 'undefined') return ITEMS_PER_PAGE;
        const v = sessionStorage.getItem(SS_VISIBLE_COUNT_KEY);
        if (!v) return ITEMS_PER_PAGE;
        const n = parseInt(v, 10);
        return !isNaN(n) && n > ITEMS_PER_PAGE ? n : ITEMS_PER_PAGE;
    } catch { return ITEMS_PER_PAGE; }
}

/**
 * Số quán tải từ API trong một lần gọi để lấy toàn bộ data.
 * Đặt cao đủ để lấy hết trong 1–2 request.
 */
const API_BATCH = 200;

// ---------------------------------------------------------------------------
// sessionStorage cache – giúp Scroll Restoration hoạt động khi nhấn Back
// ---------------------------------------------------------------------------
const CACHE_KEY = 'kham-pha-cache-v4';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 phút

interface KhamPhaCache {
    allRestaurants: Restaurant[];
    totalRestaurants: number;
    timestamp: number;
}

function readCache(): KhamPhaCache | null {
    try {
        if (typeof window === 'undefined') return null;
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const cache: KhamPhaCache = JSON.parse(raw);
        if (Date.now() - cache.timestamp > CACHE_TTL_MS) {
            sessionStorage.removeItem(CACHE_KEY);
            return null;
        }
        return cache;
    } catch { return null; }
}

function writeCache(data: Omit<KhamPhaCache, 'timestamp'>) {
    try {
        if (typeof window === 'undefined') return;
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, timestamp: Date.now() }));
    } catch { /* bỏ qua lỗi quota */ }
}
// ---------------------------------------------------------------------------

function ExplorePageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    // --- State bộ lọc (đọc từ URL khi mount) ---
    const [selectedRegions, setSelectedRegions] = useState<string[]>(() => {
        const v = searchParams.get('regions');
        return v ? v.split(',') : [];
    });
    const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>(() => {
        const v = searchParams.get('prices');
        return v ? v.split(',') : [];
    });
    const [selectedServices, setSelectedServices] = useState<string[]>(() => {
        const v = searchParams.get('services');
        return v ? v.split(',') : [];
    });
    const [selectedFoodTypes, setSelectedFoodTypes] = useState<string[]>(() => {
        const v = searchParams.get('food_types');
        return v ? v.split(',') : [];
    });
    const [isNew, setIsNew] = useState(() => searchParams.get('is_new') === '1');
    const [sortBy, setSortBy] = useState<string>(() => searchParams.get('sort') || 'newest');
    const [searchKeyword, setSearchKeyword] = useState(() => searchParams.get('q') || '');

    // Đọc cache khi mount (đồng bộ, an toàn vì "use client")
    const cachedState = useMemo(() => readCache(), []); // eslint-disable-line react-hooks/exhaustive-deps

    // ===========================================================================
    // DATA STATE – Chỉ có 1 nguồn dữ liệu duy nhất: allRestaurants
    // Mọi filter / sort / paginate đều thực hiện trên client từ mảng này.
    // ===========================================================================
    const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>(
        () => cachedState?.allRestaurants ?? []
    );
    const [totalRestaurants, setTotalRestaurants] = useState(
        () => cachedState?.totalRestaurants ?? 0
    );
    const [loading, setLoading] = useState(() => !cachedState);
    const [showMobileFilter, setShowMobileFilter] = useState(false);

    // Firebase ratings: map restaurantId -> { totalScore, count }
    const [ratingsMap, setRatingsMap] = useState<Record<number, FirebaseRating>>({});

    /**
     * visibleCount: Số quán đang hiển thị (client-side pagination).
     * Khởi tạo ĐỒNG BỘ từ sessionStorage – vì đây là "use client", không có SSR
     * cho nội dung này (loading=true che khuất grid khi server render).
     * Cách này đảm bảo DOM render đủ cao ngay từ lần render đầu tiên sau mount,
     * cho phép scroll restoration thủ công hoạt động chính xác.
     */
    const [visibleCount, setVisibleCount] = useState(() => readSavedVisibleCount());
    const [loadingMore, setLoadingMore] = useState(false);
    const scrollRestored = useRef(false);

    const sentinelRef = useRef<HTMLDivElement>(null);

    /**
     * MANUAL SCROLL RESTORATION:
     * Sau khi cả allRestaurants lẫn visibleCount đã sẵn sàng (DOM đủ cao),
     * đọc scrollY đã lưu và cuộn về đúng vị trí.
     * Chỉ thực hiện 1 lần duy nhất sau khi back (scrollRestored ref).
     */
    useEffect(() => {
        if (scrollRestored.current) return;
        if (allRestaurants.length === 0) return; // Chưa có data
        const savedScrollY = (() => {
            try {
                const v = sessionStorage.getItem(SS_SCROLL_Y_KEY);
                return v ? parseInt(v, 10) : null;
            } catch { return null; }
        })();
        if (savedScrollY === null || savedScrollY === 0) return;
        // Dùng requestAnimationFrame để chắc chắn DOM đã paint xong
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                window.scrollTo({ top: savedScrollY, behavior: 'instant' });
                scrollRestored.current = true;
            });
        });
    }, [allRestaurants]); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Firebase: fetch toàn bộ ratings một lần ---
    useEffect(() => {
        const fetchRatings = async () => {
            try {
                const ratingsRef = ref(db, 'ratings');
                const snapshot = await get(ratingsRef);
                if (snapshot.exists()) {
                    const raw = snapshot.val() as Record<string, FirebaseRating>;
                    const mapped: Record<number, FirebaseRating> = {};
                    Object.entries(raw).forEach(([id, val]) => {
                        mapped[Number(id)] = val;
                    });
                    setRatingsMap(mapped);
                }
            } catch (err) {
                console.error('Error fetching Firebase ratings:', err);
            }
        };
        fetchRatings();
    }, []);

    // --- Đồng bộ filter state -> URL (không reload trang) ---
    const syncUrl = useCallback((updates: Record<string, string | string[] | boolean | null>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(updates).forEach(([key, val]) => {
            if (val === null || val === '' || val === false || (Array.isArray(val) && val.length === 0)) {
                params.delete(key);
            } else if (Array.isArray(val)) {
                params.set(key, val.join(','));
            } else if (typeof val === 'boolean') {
                params.set(key, val ? '1' : '0');
            } else {
                params.set(key, String(val));
            }
        });
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, [searchParams, router, pathname]);

    // --- Handler wrappers (cập nhật state + URL cùng lúc) ---
    const toggleRegion = (region: string) => {
        setSelectedRegions(prev => {
            const next = prev.includes(region) ? prev.filter(r => r !== region) : [...prev, region];
            syncUrl({ regions: next });
            return next;
        });
    };
    const togglePriceRange = (range: string) => {
        setSelectedPriceRanges(prev => {
            const next = prev.includes(range) ? prev.filter(r => r !== range) : [...prev, range];
            syncUrl({ prices: next });
            return next;
        });
    };
    const toggleService = (service: string) => {
        setSelectedServices(prev => {
            const next = prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service];
            syncUrl({ services: next });
            return next;
        });
    };
    const toggleFoodType = (type: string) => {
        setSelectedFoodTypes(prev => {
            const next = prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type];
            syncUrl({ food_types: next });
            return next;
        });
    };
    const handleIsNew = (val: boolean) => {
        setIsNew(val);
        syncUrl({ is_new: val });
    };
    const handleSortBy = (val: string) => {
        setSortBy(val);
        // Cập nhật URL ?sort=... mà KHÔNG xóa các tham số lọc khác
        syncUrl({ sort: val });
    };

    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleSearch = (val: string) => {
        setSearchKeyword(val);
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            syncUrl({ q: val });
        }, 350);
    };
    const clearAllFilters = () => {
        setSelectedRegions([]);
        setSelectedPriceRanges([]);
        setSelectedServices([]);
        setSelectedFoodTypes([]);
        setIsNew(false);
        syncUrl({ regions: null, prices: null, services: null, food_types: null, is_new: null });
    };

    // --- Fuse.js – chỉ build khi allRestaurants thay đổi ---
    const fuse = useMemo(() => {
        if (allRestaurants.length === 0) return null;
        return new Fuse(allRestaurants, {
            keys: [
                { name: 'title.rendered', weight: 2 },
                { name: 'address', weight: 1.5 },
                { name: 'food_type_names', weight: 1 },
                { name: 'region_names', weight: 0.8 }
            ],
            threshold: 0.3,
            ignoreLocation: true,
            getFn: (obj, path) => {
                const value = Fuse.config.getFn(obj, path);
                if (typeof value === 'string') return normalizeVietnameseString(value);
                if (Array.isArray(value)) return value.map(v => typeof v === 'string' ? normalizeVietnameseString(v) : v);
                return value;
            }
        });
    }, [allRestaurants]);

    // ===========================================================================
    // PIPELINE CHUẨN: 3 Bước tuần tự – Filter → Sort → Slice
    // ===========================================================================

    /**
     * BƯỚC 1 – LỌC (Filter):
     * Áp dụng tất cả điều kiện lọc (keyword, khu vực, giá, tiện ích, loại hình)
     * lên toàn bộ allRestaurants.
     * KHÔNG có logic sắp xếp hay cắt mảng ở đây.
     */
    const filteredData = useMemo(() => {
        let result = allRestaurants;

        // Tìm kiếm Fuse.js
        if (searchKeyword.trim().length >= 2) {
            const normalizedKeyword = normalizeVietnameseString(searchKeyword);
            let searchResults: Restaurant[] = [];
            if (fuse) searchResults = fuse.search(normalizedKeyword).map(r => r.item);
            if (searchResults.length === 0) {
                const lower = normalizedKeyword.toLowerCase();
                searchResults = allRestaurants.filter(r => {
                    const t = normalizeVietnameseString(r.title?.rendered || '').toLowerCase();
                    const a = normalizeVietnameseString(r.address || '').toLowerCase();
                    return t.includes(lower) || a.includes(lower);
                });
            }
            result = searchResults;
        }

        // Lọc theo khu vực
        if (selectedRegions.length > 0) {
            result = result.filter(restaurant => {
                const regionNames = restaurant.region_names || [];
                const expandedRegions = selectedRegions.flatMap(r =>
                    r === 'Xã Cần Giuộc' ? ['Xã Cần Giuộc', 'Thị trấn Cần Giuộc'] : [r]
                );
                return expandedRegions.some(r => regionNames.includes(r));
            });
        }

        // Lọc theo khoảng giá
        if (selectedPriceRanges.length > 0) {
            result = result.filter(restaurant =>
                !!restaurant.price_range && selectedPriceRanges.includes(restaurant.price_range)
            );
        }

        // Lọc theo tiện ích
        if (selectedServices.length > 0) {
            result = result.filter(restaurant =>
                selectedServices.every(service => {
                    switch (service) {
                        case 'verified': case 'is_verified': return restaurant.is_verified === true;
                        case 'has_ac': return restaurant.has_ac === true;
                        case 'free_parking': case 'has_parking': return restaurant.has_parking === true;
                        case 'family_friendly': case 'is_family_friendly': return restaurant.is_family_friendly === true;
                        case 'nice_view': case 'has_nice_view': return restaurant.has_nice_view === true;
                        case 'trending': case 'is_trending': return restaurant.is_trending === true;
                        case 'good_cheap': case 'is_good_cheap': return restaurant.is_good_cheap === true;
                        case 'local_choice': case 'is_local_choice': return restaurant.is_local_choice === true;
                        case 'authentic': case 'is_authentic': return restaurant.is_authentic === true;
                        case 'has_alcohol': return restaurant.has_alcohol === true;
                        case 'shipping': case 'is_shipping': return restaurant.is_shipping === true;
                        default: return false;
                    }
                })
            );
        }

        // Lọc theo loại hình
        if (selectedFoodTypes.length > 0) {
            result = result.filter(restaurant => {
                const foodTypeSlugs = restaurant.food_type_slugs || [];
                return selectedFoodTypes.some(type => foodTypeSlugs.includes(type));
            });
        }

        // Lọc theo "Quán mới"
        if (isNew) {
            result = result.filter(restaurant => !!restaurant.is_new);
        }

        return result;
    }, [
        allRestaurants, searchKeyword, fuse,
        selectedRegions, selectedPriceRanges, selectedServices, selectedFoodTypes, isNew
    ]);

    /**
     * BƯỚC 2 – SẮP XẾP (Sort):
     * Áp dụng logic of Dropdown lên BẢN SAO của filteredData.
     * [...filteredData].sort(...) – KHÔNG mutate mảng gốc.
     * Sort trên TOÀN BỘ mảng đã lọc, không phải trên slice.
     */
    const sortedData = useMemo(() => {
        const arr = [...filteredData];
        switch (sortBy) {
            case 'newest':
                return arr.sort((a, b) => {
                    const dateA = a.date ? new Date(a.date).getTime() : 0;
                    const dateB = b.date ? new Date(b.date).getTime() : 0;
                    if (dateB !== dateA) return dateB - dateA;
                    return (b.id ?? 0) - (a.id ?? 0);
                });

            case 'oldest':
                return arr.sort((a, b) => {
                    const dateA = a.date ? new Date(a.date).getTime() : 0;
                    const dateB = b.date ? new Date(b.date).getTime() : 0;
                    if (dateA !== dateB) return dateA - dateB;
                    return (a.id ?? 0) - (b.id ?? 0);
                });

            case 'highest_rated':
                return arr.sort((a, b) => {
                    const ratingA = ratingsMap[a.id]?.totalScore && ratingsMap[a.id]?.count
                        ? ratingsMap[a.id].totalScore / ratingsMap[a.id].count
                        : null;
                    const ratingB = ratingsMap[b.id]?.totalScore && ratingsMap[b.id]?.count
                        ? ratingsMap[b.id].totalScore / ratingsMap[b.id].count
                        : null;
                    if (ratingA === null && ratingB === null) return 0;
                    if (ratingA === null) return 1;
                    if (ratingB === null) return -1;
                    return ratingB - ratingA;
                });

            case 'popular':
                return arr.sort((a, b) => {
                    const viewsA = a.views ?? 0;
                    const viewsB = b.views ?? 0;
                    if (viewsB !== viewsA) return viewsB - viewsA;
                    const countA = ratingsMap[a.id]?.count ?? 0;
                    const countB = ratingsMap[b.id]?.count ?? 0;
                    return countB - countA;
                });

            default:
                return arr;
        }
    }, [filteredData, sortBy, ratingsMap]);

    /**
     * BƯỚC 3 – PHÂN TRANG CLIENT (Slice):
     * Cắt sortedData theo visibleCount để render.
     * Đây là mảng cuối cùng đem đi render.
     */
    const visibleData = useMemo(
        () => sortedData.slice(0, visibleCount),
        [sortedData, visibleCount]
    );

    /**
     * Có thêm data để hiển thị không?
     * Đây là điều kiện duy nhất để IntersectionObserver trigger.
     */
    const hasMore = visibleData.length < sortedData.length;

    // ===========================================================================

    /**
     * Reset visibleCount về ITEMS_PER_PAGE mỗi khi sortBy, filter, hoặc search thay đổi.
     * Đồng thời xóa cả scrollY đã lưu – user đang lọc/sắp xếp mới, không cần restore.
     * Bỏ qua lần chạy đầu tiên (mount) – lúc đó restore logic đang xử lý.
     */
    const isFirstRender = useRef(true);
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        setVisibleCount(ITEMS_PER_PAGE);
        scrollRestored.current = true; // Không restore scroll cho session mới (filter/sort)
        try {
            sessionStorage.setItem(SS_VISIBLE_COUNT_KEY, String(ITEMS_PER_PAGE));
            sessionStorage.removeItem(SS_SCROLL_Y_KEY); // Xóa scroll cũ
        } catch { /* ignore */ }
    }, [
        sortBy,
        selectedRegions, selectedPriceRanges, selectedServices, selectedFoodTypes,
        isNew, searchKeyword
    ]);


    // --- Fetch toàn bộ restaurants (1 lần duy nhất khi mount) ---
    useEffect(() => {
        // Nếu đã có cache hợp lệ thì dùng, không fetch lại
        if (cachedState?.allRestaurants?.length) {
            setLoading(false);
            return;
        }

        async function loadAll() {
            setLoading(true);
            try {
                // Tải trang đầu để biết totalPages
                const { restaurants: firstBatch, total, totalPages } = await fetchRestaurantsWithPagination({
                    per_page: API_BATCH, page: 1,
                    orderby: 'date', order: 'desc'
                });

                let collected = [...firstBatch];

                // Nếu còn nhiều trang, fetch song song
                if (totalPages > 1) {
                    const pageNums = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
                    const rest = await Promise.all(
                        pageNums.map(p =>
                            fetchRestaurantsWithPagination({ per_page: API_BATCH, page: p, orderby: 'date', order: 'desc' })
                                .then(r => r.restaurants)
                                .catch(() => [] as Restaurant[])
                        )
                    );
                    collected = [...collected, ...rest.flat()];
                }

                setAllRestaurants(collected);
                setTotalRestaurants(total);
                writeCache({ allRestaurants: collected, totalRestaurants: total });
            } catch (error) {
                console.error('Error fetching all restaurants:', error);
            } finally {
                setLoading(false);
            }
        }
        loadAll();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Tải thêm (client-side): tăng visibleCount và lưu vào sessionStorage ---
    const loadMore = useCallback(() => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        setTimeout(() => {
            setVisibleCount(prev => {
                const next = prev + ITEMS_PER_PAGE;
                try { sessionStorage.setItem(SS_VISIBLE_COUNT_KEY, String(next)); } catch { /* ignore */ }
                return next;
            });
            setLoadingMore(false);
        }, 0);
    }, [loadingMore, hasMore]);

    // --- IntersectionObserver trigger loadMore ---
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;
        const observer = new IntersectionObserver(
            (entries) => { if (entries[0].isIntersecting) loadMore(); },
            { rootMargin: '300px' }
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [loadMore]);

    const hasActiveFiltersOrSearch =
        selectedRegions.length > 0 ||
        selectedPriceRanges.length > 0 ||
        selectedServices.length > 0 ||
        selectedFoodTypes.length > 0 ||
        isNew ||
        searchKeyword.trim().length >= 2;

    // Sidebar filter JSX (dùng lại cả desktop + mobile)
    const filterSidebar = (
        <>
            {hasActiveFiltersOrSearch && (
                <button
                    onClick={clearAllFilters}
                    className="w-full bg-red-50 text-red-600 hover:bg-red-100 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                    <span>❌</span><span>Xóa tất cả bộ lọc</span>
                </button>
            )}

            {/* Tìm kiếm */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <input
                    type="text"
                    placeholder="🔍 Tìm tên quán, món ăn..."
                    value={searchKeyword}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
            </div>

            {/* Khu vực */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><span>📍</span> Khu vực</h3>
                <div className="space-y-2">
                    {['Xã Cần Giuộc', 'Xã Phước Lý', 'Xã Mỹ Lộc', 'Xã Phước Vĩnh Tây', 'Xã Tân Tập'].map((region) => (
                        <label key={region} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                            <input type="checkbox" checked={selectedRegions.includes(region)} onChange={() => toggleRegion(region)} className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500" />
                            <span className="text-sm text-gray-700">{region}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Khoảng giá */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><span>💰</span> Khoảng giá</h3>
                <div className="space-y-2">
                    {[
                        { value: 'under-30k', label: 'Dưới 30.000đ' },
                        { value: '30k-50k', label: '30.000đ - 50.000đ' },
                        { value: '50k-100k', label: '50.000đ - 100.000đ' },
                        { value: 'over-100k', label: 'Trên 100.000đ' }
                    ].map((range) => (
                        <label key={range.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                            <input type="checkbox" checked={selectedPriceRanges.includes(range.value)} onChange={() => togglePriceRange(range.value)} className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500" />
                            <span className="text-sm text-gray-700">{range.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Tiện ích */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><span>✨</span> Tiện ích</h3>
                <div className="space-y-2">
                    {[
                        { value: 'has_ac', label: '❄️ Có máy lạnh' },
                        { value: 'free_parking', label: '🛵 Giữ xe miễn phí' },
                        { value: 'verified', label: '👑 Admin Đề Xuất' },
                        { value: 'local_choice', label: '🏠 Dân địa phương chọn' },
                        { value: 'trending', label: '🔥 Đang hot (Trending)' },
                        { value: 'family_friendly', label: '👨‍👩‍👧‍👦 Phù hợp gia đình' },
                        { value: 'nice_view', label: '📸 View đẹp/Sống ảo' },
                        { value: 'good_cheap', label: '💰 Ngon, bổ, rẻ' },
                        { value: 'authentic', label: '🍜 Chuẩn vị/Authentic' },
                        { value: 'has_alcohol', label: '🍺 Có bán rượu bia' },
                        { value: 'shipping', label: '🚀 Giao hàng/Delivery' }
                    ].map((service) => (
                        <label key={service.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                            <input type="checkbox" checked={selectedServices.includes(service.value)} onChange={() => toggleService(service.value)} className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500" />
                            <span className="text-sm text-gray-700">{service.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Loại hình */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><span>🍜</span> Loại hình</h3>
                <div className="space-y-2">
                    {[
                        { value: 'an-sang', label: '🌅 Ăn sáng' },
                        { value: 'quan-nhau', label: '🍻 Quán nhậu' },
                        { value: 'com', label: '🍚 Cơm' },
                        { value: 'do-an-vat', label: '🍢 Đồ ăn vặt' },
                        { value: 'lau-nuong', label: '🍲 Lẩu & Nướng' },
                        { value: 'hai-san', label: '🦞 Hải Sản' },
                        { value: 'dac-san-dia-phuong', label: '🎁 Đặc sản địa phương' },
                        { value: 'mon-chay', label: '🥦 Món chay' },
                        { value: 'tra-sua-cafe', label: '🥤 Trà sữa/Cafe' }
                    ].map((type) => (
                        <label key={type.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                            <input type="checkbox" checked={selectedFoodTypes.includes(type.value)} onChange={() => toggleFoodType(type.value)} className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500" />
                            <span className="text-sm text-gray-700">{type.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Quán mới */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><span>🆕</span> Đặc biệt</h3>
                <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                    <input type="checkbox" checked={isNew} onChange={(e) => handleIsNew(e.target.checked)} className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500" />
                    <span className="text-sm text-gray-700">🆕 Chỉ xem quán mới</span>
                </label>
            </div>
        </>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <div className="container mx-auto px-3 md:px-4 py-6 md:py-10">
                {/* Header */}
                <div className="mb-6 md:mb-8">
                    <h1 className="text-2xl md:text-4xl font-extrabold text-gray-900 mb-2">
                        🔍 Khám phá Ẩm thực
                    </h1>
                    <p className="text-sm md:text-base text-gray-600">
                        {searchKeyword.trim()
                            ? <><span className="font-bold text-orange-600">{sortedData.length}</span> quán cho &ldquo;{searchKeyword}&rdquo;</>
                            : <>Tìm thấy <span className="font-bold text-orange-600">{totalRestaurants || allRestaurants.length}</span> quán ăn</>
                        }
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Sidebar Desktop */}
                    <aside className="hidden lg:block lg:col-span-1 space-y-4 sticky top-24 self-start max-h-[calc(100vh-7rem)] overflow-y-auto pb-4">
                        {filterSidebar}
                    </aside>

                    {/* Main Content */}
                    <div className="lg:col-span-3">
                        {/* Mobile Filter Button */}
                        <button
                            onClick={() => setShowMobileFilter(true)}
                            className="lg:hidden w-full bg-orange-500 text-white font-bold py-3 rounded-xl mb-4 flex items-center justify-center gap-2 shadow-lg shadow-orange-200"
                        >
                            <span>🔍</span>
                            <span>Bộ lọc & Tìm kiếm{hasActiveFiltersOrSearch ? ` (đang lọc)` : ''}</span>
                        </button>

                        {/* Sort & Results */}
                        <div className="flex items-center justify-between mb-6">
                            <p className="text-sm text-gray-600">
                                {loading ? 'Đang tải...' : `${sortedData.length} kết quả`}
                            </p>
                            <select
                                value={sortBy}
                                onChange={(e) => handleSortBy(e.target.value)}
                                className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            >
                                <option value="newest">Mới nhất</option>
                                <option value="oldest">Cũ nhất</option>
                                <option value="highest_rated">Đánh giá cao</option>
                                <option value="popular">Phổ biến</option>
                            </select>
                        </div>

                        {/* Restaurant Grid */}
                        {loading ? (
                            <div className="text-center py-20">
                                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto"></div>
                                <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
                            </div>
                        ) : visibleData.length > 0 ? (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {visibleData.map((restaurant) => (
                                        <RestaurantCard
                                            key={restaurant.id}
                                            data={restaurant}
                                            firebaseRating={ratingsMap[restaurant.id]}
                                        />
                                    ))}
                                </div>

                                {/* Sentinel: trigger khi scroll đến cuối */}
                                <div ref={sentinelRef} className="mt-8 flex justify-center min-h-[48px] items-center">
                                    {loadingMore && (
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-20">
                                <p className="text-2xl mb-2">😔</p>
                                <p className="text-gray-600 mb-4">Không tìm thấy quán ăn phù hợp</p>
                                {hasActiveFiltersOrSearch && (
                                    <button onClick={clearAllFilters} className="text-orange-500 hover:underline font-bold">
                                        Xóa bộ lọc và thử lại
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Filter Overlay */}
            {showMobileFilter && (
                <div className="fixed inset-0 z-[60] lg:hidden">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowMobileFilter(false)} />
                    <div className="absolute right-0 top-0 bottom-0 w-[85%] max-w-sm bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                            <h2 className="text-xl font-bold text-gray-900">Bộ lọc</h2>
                            <button onClick={() => setShowMobileFilter(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">✕</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {filterSidebar}
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-gray-50">
                            <button
                                onClick={() => setShowMobileFilter(false)}
                                className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-orange-200"
                            >
                                Áp dụng ({sortedData.length} quán)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ExplorePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500"></div>
            </div>
        }>
            <ExplorePageContent />
        </Suspense>
    );
}
