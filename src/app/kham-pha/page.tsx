"use client";
import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { RestaurantCard } from '@/components/RestaurantCard';
import { Restaurant } from '@/types/wordpress';
import { useSearchParams } from 'next/navigation';
import { fetchRestaurantsWithPagination } from '@/lib/api';

import { Suspense } from 'react';

function ExplorePageContent() {
    const searchParams = useSearchParams();
    const initialCategory = searchParams.get('category');
    const initialSearch = searchParams.get('search');
    const initialSort = searchParams.get('sort');

    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [showMobileFilter, setShowMobileFilter] = useState(false);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalRestaurants, setTotalRestaurants] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [hasMore, setHasMore] = useState(false);

    const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
    const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>([]);
    const [selectedRatings, setSelectedRatings] = useState<string[]>([]);
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [selectedFoodTypes, setSelectedFoodTypes] = useState<string[]>([]);
    const [isNew, setIsNew] = useState(false);
    const [sortBy, setSortBy] = useState<string>(initialSort || 'newest');
    const [searchKeyword, setSearchKeyword] = useState(initialSearch || '');


    // Fetch restaurants từ API
    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            setCurrentPage(1); // Reset to page 1
            try {
                const { restaurants: data, total, totalPages: pages } = await fetchRestaurantsWithPagination({
                    per_page: 20,
                    page: 1,
                    search: searchKeyword,
                    orderby: getSortOrderBy(sortBy),
                    order: getSortOrder(sortBy)
                });
                setRestaurants(data);
                setTotalRestaurants(total);
                setTotalPages(pages);
                setHasMore(pages > 1);
            } catch (error) {
                console.error('Error fetching restaurants:', error);
                setRestaurants([]);
                setTotalRestaurants(0);
                setTotalPages(0);
                setHasMore(false);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [searchKeyword, sortBy]);

    // Helper functions for sorting
    const getSortOrderBy = (sort: string): 'date' | 'rating' | 'view_count' | undefined => {
        switch (sort) {
            case 'newest':
            case 'oldest':
                return 'date';
            case 'rating':
                return 'rating';
            case 'popular':
                return 'view_count';
            default:
                return 'date';
        }
    };

    const getSortOrder = (sort: string): 'asc' | 'desc' => {
        if (sort === 'oldest') return 'asc';
        return 'desc';
    };

    // Load more function
    const loadMoreRestaurants = async () => {
        if (loadingMore || !hasMore) return;

        setLoadingMore(true);
        try {
            const nextPage = currentPage + 1;
            const { restaurants: data } = await fetchRestaurantsWithPagination({
                per_page: 20,
                page: nextPage,
                search: searchKeyword,
                orderby: getSortOrderBy(sortBy),
                order: getSortOrder(sortBy)
            });
            setRestaurants(prev => [...prev, ...data]);
            setCurrentPage(nextPage);
            setHasMore(nextPage < totalPages);
        } catch (error) {
            console.error('Error loading more restaurants:', error);
        } finally {
            setLoadingMore(false);
        }
    };

    // Đồng bộ URL params với filter state
    useEffect(() => {
        if (initialCategory) {
            if (['trending', 'family_friendly', 'has_ac', 'nice_view', 'good_cheap', 'verified'].includes(initialCategory)) {
                setSelectedServices([initialCategory]);
            } else {
                setSelectedFoodTypes([initialCategory]);
            }
        }

        if (initialSort === 'newest') {
            setSortBy('newest');
        }

        if (initialSearch) {
            setSearchKeyword(initialSearch);
        }
    }, [initialCategory, initialSort, initialSearch]);

    // Filter logic (client-side)
    const filteredRestaurants = restaurants.filter((restaurant) => {
        // Filter by region
        if (selectedRegions.length > 0) {
            const restaurantRegion = restaurant.address || '';
            const matchesRegion = selectedRegions.some(region =>
                restaurantRegion.toLowerCase().includes(region.toLowerCase())
            );
            if (!matchesRegion) return false;
        }

        // Filter by price range
        if (selectedPriceRanges.length > 0) {
            if (!restaurant.price_range || !selectedPriceRanges.includes(restaurant.price_range)) {
                return false;
            }
        }

        // Filter by rating
        if (selectedRatings.length > 0) {
            const ratings = [
                Number(restaurant.rating_food || 0),
                Number(restaurant.rating_price || 0),
                Number(restaurant.rating_service || 0),
                Number(restaurant.rating_ambiance || 0),
            ].filter(r => r > 0);

            const avgRating = ratings.length > 0
                ? ratings.reduce((a, b) => a + b, 0) / ratings.length
                : 0;

            const matchesRating = selectedRatings.some(range => {
                if (range === '9+') return avgRating >= 9;
                if (range === '8-9') return avgRating >= 8 && avgRating < 9;
                if (range === '7-8') return avgRating >= 7 && avgRating < 8;
                return false;
            });

            if (!matchesRating) return false;
        }

        // Filter by services/badges
        if (selectedServices.length > 0) {
            const matchesService = selectedServices.every(service => {
                // Map service keys to restaurant boolean fields
                switch (service) {
                    case 'verified':
                    case 'is_verified':
                        return restaurant.is_verified === true;
                    case 'has_ac':
                        return restaurant.has_ac === true;
                    case 'free_parking':
                    case 'has_parking':
                        return restaurant.has_parking === true;
                    case 'family_friendly':
                    case 'is_family_friendly':
                        return restaurant.is_family_friendly === true;
                    case 'nice_view':
                    case 'has_nice_view':
                        return restaurant.has_nice_view === true;
                    case 'trending':
                    case 'is_trending':
                        return restaurant.is_trending === true;
                    case 'good_cheap':
                    case 'is_good_cheap':
                        return restaurant.is_good_cheap === true;
                    default:
                        return false;
                }
            });
            if (!matchesService) return false;
        }

        // Filter by food type (SỬ DỤNG taxonomy từ _embedded)
        if (selectedFoodTypes.length > 0) {
            // Lấy food_type terms từ _embedded nếu có
            const embedded = (restaurant as any)._embedded;
            const foodTypeTerms = embedded?.['wp:term']?.find((termGroup: any[]) =>
                termGroup.some((term: any) => term.taxonomy === 'food_type')
            ) || [];

            const foodTypeSlugs = foodTypeTerms.map((term: any) => term.slug);

            const matchesFoodType = selectedFoodTypes.some(type =>
                foodTypeSlugs.includes(type)
            );
            if (!matchesFoodType) return false;
        }

        // Filter by "Quán mới"
        if (isNew) {
            if (!restaurant.is_new) return false;
        }

        return true;
    });

    const toggleRegion = (region: string) => {
        setSelectedRegions(prev =>
            prev.includes(region) ? prev.filter(r => r !== region) : [...prev, region]
        );
    };

    const togglePriceRange = (range: string) => {
        setSelectedPriceRanges(prev =>
            prev.includes(range) ? prev.filter(r => r !== range) : [...prev, range]
        );
    };

    const toggleRating = (rating: string) => {
        setSelectedRatings(prev =>
            prev.includes(rating) ? prev.filter(r => r !== rating) : [...prev, rating]
        );
    };

    const toggleService = (service: string) => {
        setSelectedServices(prev =>
            prev.includes(service) ? prev.filter(s => s !== service) : [...prev, service]
        );
    };

    const toggleFoodType = (type: string) => {
        setSelectedFoodTypes(prev =>
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    const clearAllFilters = () => {
        setSelectedRegions([]);
        setSelectedPriceRanges([]);
        setSelectedRatings([]);
        setSelectedServices([]);
        setSelectedFoodTypes([]);
        setIsNew(false);
    };

    const hasActiveFilters = selectedRegions.length > 0 || selectedPriceRanges.length > 0 ||
        selectedRatings.length > 0 || selectedServices.length > 0 || selectedFoodTypes.length > 0 || isNew;

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
                        Tìm thấy <span className="font-bold text-orange-600">{totalRestaurants}</span> quán ăn
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Sidebar Filters (Desktop) */}
                    <aside className="hidden lg:block lg:col-span-1 space-y-6">

                        {/* Clear All Filters */}
                        {hasActiveFilters && (
                            <button
                                onClick={clearAllFilters}
                                className="w-full bg-red-50 text-red-600 hover:bg-red-100 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                <span>❌</span>
                                <span>Xóa tất cả bộ lọc</span>
                            </button>
                        )}

                        {/* Khu vực */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <span>📍</span> Khu vực
                            </h3>
                            <div className="space-y-2">
                                {['Thị trấn Cần Giuộc', 'Xã Phước Lý', 'Xã Mỹ Lộc', 'Xã Phước Vĩnh Tây', 'Xã Tân Tập'].map((region) => (
                                    <label key={region} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={selectedRegions.includes(region)}
                                            onChange={() => toggleRegion(region)}
                                            className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                                        />
                                        <span className="text-sm text-gray-700">{region}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Khoảng giá */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <span>💰</span> Khoảng giá
                            </h3>
                            <div className="space-y-2">
                                {[
                                    { value: 'under-30k', label: 'Dưới 30.000đ' },
                                    { value: '30k-50k', label: '30.000đ - 50.000đ' },
                                    { value: '50k-100k', label: '50.000đ - 100.000đ' },
                                    { value: 'over-100k', label: 'Trên 100.000đ' }
                                ].map((range) => (
                                    <label key={range.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={selectedPriceRanges.includes(range.value)}
                                            onChange={() => togglePriceRange(range.value)}
                                            className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                                        />
                                        <span className="text-sm text-gray-700">{range.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Đánh giá */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <span>⭐</span> Đánh giá
                            </h3>
                            <div className="space-y-2">
                                {[
                                    { value: '9+', label: '9.0+ ⭐⭐⭐⭐⭐' },
                                    { value: '8-9', label: '8.0 - 9.0 ⭐⭐⭐⭐' },
                                    { value: '7-8', label: '7.0 - 8.0 ⭐⭐⭐' }
                                ].map((rating) => (
                                    <label key={rating.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={selectedRatings.includes(rating.value)}
                                            onChange={() => toggleRating(rating.value)}
                                            className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                                        />
                                        <span className="text-sm text-gray-700">{rating.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Tiện ích */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <span>✨</span> Tiện ích
                            </h3>
                            <div className="space-y-2">
                                {[
                                    { value: 'has_ac', label: '❄️ Có máy lạnh' },
                                    { value: 'free_parking', label: '🛵 Giữ xe miễn phí' },
                                    { value: 'verified', label: '✅ Đã xác thực' },
                                    { value: 'family_friendly', label: '👨‍👩‍👧‍👦 Phù hợp gia đình' },
                                    { value: 'nice_view', label: '📸 View đẹp' },
                                    { value: 'trending', label: '🔥 Đang hot' }
                                ].map((service) => (
                                    <label key={service.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={selectedServices.includes(service.value)}
                                            onChange={() => toggleService(service.value)}
                                            className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                                        />
                                        <span className="text-sm text-gray-700">{service.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Loại hình */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <span>🍜</span> Loại hình
                            </h3>
                            <div className="space-y-2">
                                {[
                                    { value: 'quan-nhau', label: '🍻 Quán nhậu' },
                                    { value: 'com-mon-nuoc', label: '🍚 Cơm/Món nước' },
                                    { value: 'do-an-vat', label: '🍢 Đồ ăn vặt' },
                                    { value: 'dac-san-dia-phuong', label: '🎁 Đặc sản địa phương' },
                                    { value: 'mon-chay', label: '🥦 Món chay' },
                                    { value: 'tra-sua', label: '🥤 Trà sữa/Cafe' }
                                ].map((type) => (
                                    <label key={type.value} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={selectedFoodTypes.includes(type.value)}
                                            onChange={() => toggleFoodType(type.value)}
                                            className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                                        />
                                        <span className="text-sm text-gray-700">{type.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Quán mới */}
                        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <span>🆕</span> Đặc biệt
                            </h3>
                            <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                                <input
                                    type="checkbox"
                                    checked={isNew}
                                    onChange={(e) => setIsNew(e.target.checked)}
                                    className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                                />
                                <span className="text-sm text-gray-700">🆕 Chỉ xem quán mới</span>
                            </label>
                        </div>

                    </aside>

                    {/* Main Content */}
                    <div className="lg:col-span-3">
                        {/* Mobile Filter Button */}
                        <button
                            onClick={() => setShowMobileFilter(true)}
                            className="lg:hidden w-full bg-orange-500 text-white font-bold py-3 rounded-xl mb-4 flex items-center justify-center gap-2 shadow-lg shadow-orange-200"
                        >
                            <span>🔍</span>
                            <span>Bộ lọc & Tìm kiếm</span>
                        </button>

                        {/* Sort & Results */}
                        <div className="flex items-center justify-between mb-6">
                            <p className="text-sm text-gray-600">
                                {loading ? 'Đang tải...' : `${filteredRestaurants.length} kết quả`}
                            </p>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            >
                                <option value="newest">Mới nhất</option>
                                <option value="oldest">Cũ nhất</option>
                                <option value="rating">Đánh giá cao</option>
                                <option value="popular">Phổ biến</option>
                            </select>
                        </div>

                        {/* Restaurant Grid */}
                        {loading ? (
                            <div className="text-center py-20">
                                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto"></div>
                                <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
                            </div>
                        ) : filteredRestaurants.length > 0 ? (
                            <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredRestaurants.map((restaurant) => (
                                        <RestaurantCard key={restaurant.id} data={restaurant} />
                                    ))}
                                </div>

                                {/* Load More Button */}
                                {hasMore && (
                                    <div className="mt-8 flex justify-center">
                                        <button
                                            onClick={loadMoreRestaurants}
                                            disabled={loadingMore}
                                            className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-orange-200 disabled:shadow-none flex items-center gap-2"
                                        >
                                            {loadingMore ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                    <span>Đang tải...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>📋</span>
                                                    <span>Xem thêm ({totalRestaurants - filteredRestaurants.length} quán)</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-20">
                                <p className="text-2xl mb-2">😔</p>
                                <p className="text-gray-600 mb-4">Không tìm thấy quán ăn phù hợp</p>
                                {hasActiveFilters && (
                                    <button
                                        onClick={clearAllFilters}
                                        className="text-orange-500 hover:underline font-bold"
                                    >
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
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowMobileFilter(false)}
                    />

                    {/* Content */}
                    <div className="absolute right-0 top-0 bottom-0 w-[85%] max-w-sm bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                            <h2 className="text-xl font-bold text-gray-900">Bộ lọc</h2>
                            <button
                                onClick={() => setShowMobileFilter(false)}
                                className="p-2 hover:bg-gray-100 rounded-full text-gray-500"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-6">
                            {hasActiveFilters && (
                                <button
                                    onClick={() => {
                                        clearAllFilters();
                                        setShowMobileFilter(false);
                                    }}
                                    className="w-full bg-red-50 text-red-600 font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                                >
                                    <span>❌</span> Xóa tất cả bộ lọc
                                </button>
                            )}

                            {/* Khu vực */}
                            <div className="space-y-3">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">📍 Khu vực</h3>
                                <div className="grid grid-cols-1 gap-2">
                                    {['Thị trấn Cần Giuộc', 'Xã Phước Lý', 'Xã Mỹ Lộc', 'Xã Phước Vĩnh Tây', 'Xã Tân Tập'].map((region) => (
                                        <label key={region} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                            <input
                                                type="checkbox"
                                                checked={selectedRegions.includes(region)}
                                                onChange={() => toggleRegion(region)}
                                                className="w-4 h-4 text-orange-500 rounded"
                                            />
                                            <span className="text-sm text-gray-700">{region}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Khoảng giá */}
                            <div className="space-y-3">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">💰 Khoảng giá</h3>
                                <div className="grid grid-cols-1 gap-2">
                                    {[
                                        { value: 'under-30k', label: 'Dưới 30.000đ' },
                                        { value: '30k-50k', label: '30.000đ - 50.000đ' },
                                        { value: '50k-100k', label: '50.000đ - 100.000đ' },
                                        { value: 'over-100k', label: 'Trên 100.000đ' }
                                    ].map((range) => (
                                        <label key={range.value} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                            <input
                                                type="checkbox"
                                                checked={selectedPriceRanges.includes(range.value)}
                                                onChange={() => togglePriceRange(range.value)}
                                                className="w-4 h-4 text-orange-500 rounded"
                                            />
                                            <span className="text-sm text-gray-700">{range.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Tiện ích */}
                            <div className="space-y-3">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">✨ Tiện ích</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { value: 'has_ac', label: '❄️ Máy lạnh' },
                                        { value: 'free_parking', label: '🛵 Giữ xe' },
                                        { value: 'verified', label: '✅ Xác thực' },
                                        { value: 'trending', label: '🔥 Hot' }
                                    ].map((service) => (
                                        <label key={service.value} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                            <input
                                                type="checkbox"
                                                checked={selectedServices.includes(service.value)}
                                                onChange={() => toggleService(service.value)}
                                                className="w-4 h-4 text-orange-500 rounded"
                                            />
                                            <span className="text-[11px] text-gray-700">{service.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Loại hình */}
                            <div className="space-y-3">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">🍜 Loại hình</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { value: 'quan-nhau', label: '🍻 Nhậu' },
                                        { value: 'com-mon-nuoc', label: '🍚 Cơm' },
                                        { value: 'do-an-vat', label: '🍢 Ăn vặt' },
                                        { value: 'tra-sua', label: '🥤 Cafe' }
                                    ].map((type) => (
                                        <label key={type.value} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                            <input
                                                type="checkbox"
                                                checked={selectedFoodTypes.includes(type.value)}
                                                onChange={() => toggleFoodType(type.value)}
                                                className="w-4 h-4 text-orange-500 rounded"
                                            />
                                            <span className="text-[11px] text-gray-700">{type.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-gray-50">
                            <button
                                onClick={() => setShowMobileFilter(false)}
                                className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-orange-200"
                            >
                                Áp dụng ({filteredRestaurants.length} quán)
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
