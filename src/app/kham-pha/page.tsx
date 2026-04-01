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

const PER_PAGE = 18;

// ---------------------------------------------------------------------------
// sessionStorage cache – giúp Scroll Restoration hoạt động khi nhấn Back
// ---------------------------------------------------------------------------
const CACHE_KEY = 'kham-pha-cache-v3';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 phút

interface KhamPhaCache {
    allRestaurants: Restaurant[];
    pagedRestaurants: Restaurant[];
    currentPage: number;
    totalPages: number;
    totalRestaurants: number;
    hasMore: boolean;
    sortBy: string;
    timestamp: number;
}

function readCache(sortBy: string): KhamPhaCache | null {
    try {
        if (typeof window === 'undefined') return null;
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const cache: KhamPhaCache = JSON.parse(raw);
        if (Date.now() - cache.timestamp > CACHE_TTL_MS) {
            sessionStorage.removeItem(CACHE_KEY);
            return null;
        }
        if (cache.sortBy !== sortBy) return null;
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

    // Đọc cache sớm nhất có thể để dùng làm initial state
    const initialSortBy = searchParams.get('sort') || 'newest';
    const cachedState = useMemo(() => readCache(initialSortBy), []); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Data state – khởi tạo từ cache nếu có (scroll restoration) ---
    const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>(
        () => cachedState?.allRestaurants ?? []
    );
    const [pagedRestaurants, setPagedRestaurants] = useState<Restaurant[]>(
        () => cachedState?.pagedRestaurants ?? []
    );
    const [loading, setLoading] = useState(
        () => !cachedState
    );
    const [searchLoading, setSearchLoading] = useState(() => !!(searchParams.get('q') || ''));
    const [loadingMore, setLoadingMore] = useState(false);
    const [allRestaurantsLoaded, setAllRestaurantsLoaded] = useState(
        () => !!(cachedState?.allRestaurants?.length)
    );
    const [showMobileFilter, setShowMobileFilter] = useState(false);

    // Firebase ratings: map restaurantId -> { totalScore, count }
    const [ratingsMap, setRatingsMap] = useState<Record<number, FirebaseRating>>({});

    // Pagination
    const [currentPage, setCurrentPage] = useState(() => cachedState?.currentPage ?? 1);
    const [totalRestaurants, setTotalRestaurants] = useState(() => cachedState?.totalRestaurants ?? 0);
    const [totalPages, setTotalPages] = useState(() => cachedState?.totalPages ?? 0);
    const [hasMore, setHasMore] = useState(() => cachedState?.hasMore ?? false);

    const sentinelRef = useRef<HTMLDivElement>(null);

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
    // Debounce ref để tránh spam URL update khi người dùng đang gõ nhanh
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

    // --- Fuse.js ---
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
    // PIPELINE CHUẨN: 2 Bước độc lập – Filter → Sort
    // ===========================================================================

    /**
     * BƯỚC 0: Chọn nguồn dữ liệu gốc.
     * - Khi có filter/search: dùng allRestaurants (đầy đủ) nếu đã tải, ngược lại dùng pagedRestaurants.
     * - Khi không có filter/search: dùng pagedRestaurants (infinite scroll).
     */
    const hasActiveFiltersOrSearch = useMemo(() =>
        selectedRegions.length > 0 ||
        selectedPriceRanges.length > 0 ||
        selectedServices.length > 0 ||
        selectedFoodTypes.length > 0 ||
        isNew ||
        searchKeyword.trim().length >= 2,
        [selectedRegions, selectedPriceRanges, selectedServices, selectedFoodTypes, isNew, searchKeyword]
    );

    const sourceRestaurants = useMemo(() => {
        if (hasActiveFiltersOrSearch) {
            return allRestaurants.length > 0 ? allRestaurants : pagedRestaurants;
        }
        return pagedRestaurants;
    }, [hasActiveFiltersOrSearch, allRestaurants, pagedRestaurants]);

    /**
     * BƯỚC 1 – LỌC (Filter):
     * Áp dụng tất cả điều kiện lọc (khu vực, giá, tiện ích, loại hình, tìm kiếm)
     * lên sourceRestaurants để tạo filteredArray.
     * Không có bất kỳ logic sắp xếp nào ở đây.
     */
    const filteredArray = useMemo(() => {
        let result = sourceRestaurants;

        // Tìm kiếm Fuse.js (ưu tiên keyword search trước)
        if (searchKeyword.trim().length >= 2) {
            if (allRestaurants.length === 0) return []; // Chờ tải xong
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
        sourceRestaurants, searchKeyword, allRestaurants, fuse,
        selectedRegions, selectedPriceRanges, selectedServices, selectedFoodTypes, isNew
    ]);

    /**
     * BƯỚC 2 – SẮP XẾP (Sort):
     * Áp dụng logic của Dropdown Sắp xếp lên BẢN SAO của filteredArray.
     * TUYỆT ĐỐI không mutate mảng gốc (.sort() trên [...filteredArray]).
     * Đây là mảng cuối cùng đem đi render.
     */
    const displayRestaurants = useMemo(() => {
        const arr = [...filteredArray];
        switch (sortBy) {
            case 'newest':
                // Quán mới nhất (id lớn nhất) xếp trên
                return arr.sort((a, b) => {
                    const dateA = a.date ? new Date(a.date).getTime() : 0;
                    const dateB = b.date ? new Date(b.date).getTime() : 0;
                    if (dateB !== dateA) return dateB - dateA;
                    return (b.id ?? 0) - (a.id ?? 0);
                });

            case 'oldest':
                // Quán cũ nhất (id nhỏ nhất) xếp trên
                return arr.sort((a, b) => {
                    const dateA = a.date ? new Date(a.date).getTime() : 0;
                    const dateB = b.date ? new Date(b.date).getTime() : 0;
                    if (dateA !== dateB) return dateA - dateB;
                    return (a.id ?? 0) - (b.id ?? 0);
                });

            case 'highest_rated': {
                // Điểm cao xếp trên; quán chưa có điểm (null/0) bị đẩy xuống cuối
                return arr.sort((a, b) => {
                    const ratingA = ratingsMap[a.id]?.totalScore && ratingsMap[a.id]?.count
                        ? ratingsMap[a.id].totalScore / ratingsMap[a.id].count
                        : null;
                    const ratingB = ratingsMap[b.id]?.totalScore && ratingsMap[b.id]?.count
                        ? ratingsMap[b.id].totalScore / ratingsMap[b.id].count
                        : null;
                    if (ratingA === null && ratingB === null) return 0;
                    if (ratingA === null) return 1;   // a không điểm → xuống dưới
                    if (ratingB === null) return -1;  // b không điểm → xuống dưới
                    return ratingB - ratingA;
                });
            }

            case 'popular':
                // Phổ biến: dựa vào views hoặc reviewCount (nhiều hơn lên trên)
                return arr.sort((a, b) => {
                    const viewsA = (a as Restaurant & { views?: number }).views ?? 0;
                    const viewsB = (b as Restaurant & { views?: number }).views ?? 0;
                    if (viewsB !== viewsA) return viewsB - viewsA;
                    // Tie-break: số lượng đánh giá Firebase
                    const countA = ratingsMap[a.id]?.count ?? 0;
                    const countB = ratingsMap[b.id]?.count ?? 0;
                    return countB - countA;
                });

            default:
                return arr;
        }
    }, [filteredArray, sortBy, ratingsMap]);

    // ===========================================================================

    // --- Ghi cache khi data thay đổi ---
    useEffect(() => {
        if (pagedRestaurants.length > 0) {
            writeCache({
                allRestaurants,
                pagedRestaurants,
                currentPage,
                totalPages,
                totalRestaurants,
                hasMore,
                sortBy,
            });
        }
    }, [allRestaurants, pagedRestaurants, currentPage, totalPages, totalRestaurants, hasMore, sortBy]);

    // --- Fetch ALL restaurants (background) ---
    useEffect(() => {
        if (cachedState?.allRestaurants?.length) {
            setAllRestaurantsLoaded(true);
            setSearchLoading(false);
            return;
        }
        async function loadAll() {
            try {
                const { restaurants: data } = await fetchRestaurantsWithPagination({ per_page: 200, page: 1 });
                setAllRestaurants(data);
            } catch (error) {
                console.error('Error fetching all restaurants:', error);
            } finally {
                setAllRestaurantsLoaded(true);
                setSearchLoading(false);
            }
        }
        loadAll();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Fetch trang đầu theo sortBy ---
    useEffect(() => {
        if (cachedState && cachedState.sortBy === sortBy && cachedState.pagedRestaurants.length > 0) {
            setLoading(false);
            return;
        }

        /**
         * Map sortBy (client) sang orderby/order (API WordPress).
         * 'highest_rated' và 'popular' không có endpoint API tương ứng → tải theo date desc
         * rồi để client-side sort xử lý.
         */
        const getApiParams = (sort: string): { orderby: 'date' | 'rating' | 'view_count'; order: 'asc' | 'desc' } => {
            switch (sort) {
                case 'oldest': return { orderby: 'date', order: 'asc' };
                case 'highest_rated': return { orderby: 'date', order: 'desc' }; // client sort
                case 'popular': return { orderby: 'date', order: 'desc' };       // client sort
                case 'newest':
                default: return { orderby: 'date', order: 'desc' };
            }
        };

        async function fetchData() {
            setLoading(true);
            setCurrentPage(1);
            try {
                const { orderby, order } = getApiParams(sortBy);
                const { restaurants: data, total, totalPages: pages } = await fetchRestaurantsWithPagination({
                    per_page: PER_PAGE, page: 1,
                    orderby,
                    order
                });
                setPagedRestaurants(data);
                setTotalRestaurants(total);
                setTotalPages(pages);
                setHasMore(pages > 1);
            } catch (error) {
                console.error('Error fetching:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Load more (infinite scroll) ---
    const loadMoreRestaurants = useCallback(async () => {
        if (loadingMore || !hasMore || searchKeyword.trim()) return;
        setLoadingMore(true);
        try {
            const nextPage = currentPage + 1;
            const getApiParams = (sort: string): { orderby: 'date' | 'rating' | 'view_count'; order: 'asc' | 'desc' } => {
                switch (sort) {
                    case 'oldest': return { orderby: 'date', order: 'asc' };
                    default: return { orderby: 'date', order: 'desc' };
                }
            };
            const { orderby, order } = getApiParams(sortBy);
            const { restaurants: data } = await fetchRestaurantsWithPagination({
                per_page: PER_PAGE, page: nextPage,
                orderby,
                order
            });
            setPagedRestaurants(prev => [...prev, ...data]);
            setCurrentPage(nextPage);
            setHasMore(nextPage < totalPages);
        } catch (error) {
            console.error('Error loading more:', error);
        } finally {
            setLoadingMore(false);
        }
    }, [loadingMore, hasMore, searchKeyword, currentPage, totalPages, sortBy]);

    // --- IntersectionObserver ---
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;
        const observer = new IntersectionObserver(
            (entries) => { if (entries[0].isIntersecting) loadMoreRestaurants(); },
            { rootMargin: '200px' }
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [loadMoreRestaurants]);

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
                            ? <><span className="font-bold text-orange-600">{displayRestaurants.length}</span> quán cho &ldquo;{searchKeyword}&rdquo;</>
                            : <>Tìm thấy <span className="font-bold text-orange-600">{totalRestaurants}</span> quán ăn</>
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
                                {loading || searchLoading ? 'Đang tải...' : `${displayRestaurants.length} kết quả`}
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
                        ) : (hasActiveFiltersOrSearch && !allRestaurantsLoaded) ? (
                            <div className="text-center py-20">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-400 mx-auto"></div>
                                <p className="mt-4 text-gray-500 text-sm">Đang tìm dữ liệu phù hợp...</p>
                            </div>
                        ) : displayRestaurants.length > 0 ? (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {displayRestaurants.map((restaurant) => (
                                        <RestaurantCard
                                            key={restaurant.id}
                                            data={restaurant}
                                            firebaseRating={ratingsMap[restaurant.id]}
                                        />
                                    ))}
                                </div>

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
                                Áp dụng ({displayRestaurants.length} quán)
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
