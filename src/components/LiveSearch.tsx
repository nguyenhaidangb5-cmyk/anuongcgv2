"use client";
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Fuse from 'fuse.js';
import { Restaurant } from '@/types/wordpress';
import { fetchRestaurants, fixWpUrl } from '@/lib/api';
import { normalizeVietnameseString } from '@/lib/vietnamese-utils';

interface LiveSearchProps {
    placeholder?: string;
}

export const LiveSearch: React.FC<LiveSearchProps> = ({
    placeholder = "Tìm món ngon, địa chỉ ăn uống..."
}) => {
    const [keyword, setKeyword] = useState('');
    const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
    const [results, setResults] = useState<Restaurant[]>([]);
    const [loading, setLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    // Fuse.js configuration for fuzzy search
    const fuse = useMemo(() => {
        if (allRestaurants.length === 0) return null;

        return new Fuse(allRestaurants, {
            keys: [
                { name: 'title.rendered', weight: 2 },
                { name: 'address', weight: 1.5 },
                { name: 'food_type_names', weight: 1 },
                { name: 'region_names', weight: 0.8 }
            ],
            threshold: 0.3,      // Giảm từ 0.4 → 0.3 để match chính xác hơn
            ignoreLocation: true, // Cho phép match ở bất kỳ vị trí nào trong chuỗi
            // KHÔNG dùng useExtendedSearch vì nó thay đổi cú pháp (cần prefix 'keyword)
            // điều này gây lỗi khi tìm từ ngắn như FC, HN, v.v.
            getFn: (obj, path) => {
                const value = Fuse.config.getFn(obj, path);
                if (typeof value === 'string') {
                    return normalizeVietnameseString(value);
                }
                if (Array.isArray(value)) {
                    return value.map(v => typeof v === 'string' ? normalizeVietnameseString(v) : v);
                }
                return value;
            }
        });
    }, [allRestaurants]);

    // Fetch all restaurants once on mount
    useEffect(() => {
        const loadRestaurants = async () => {
            try {
                const data = await fetchRestaurants({
                    per_page: 200 // Tăng lên 200 để bao phủ toàn bộ quán
                });
                setAllRestaurants(data);
            } catch (error) {
                console.error('Failed to load restaurants:', error);
            }
        };
        loadRestaurants();
    }, []);

    // Debounced search with Fuse.js + fallback substring search
    useEffect(() => {
        if (keyword.trim().length < 2) {
            setResults([]);
            setShowDropdown(false);
            return;
        }

        setLoading(true);

        // Clear previous timer
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        // Set new timer (300ms debounce)
        debounceTimer.current = setTimeout(() => {
            try {
                if (fuse) {
                    // Normalize keyword for Vietnamese search
                    const normalizedKeyword = normalizeVietnameseString(keyword);

                    // Perform fuzzy search
                    const fuseResults = fuse.search(normalizedKeyword);

                    // Extract items
                    let searchResults = fuseResults
                        .map(result => result.item)
                        .slice(0, 15);

                    // FALLBACK: Nếu Fuse trả về 0 kết quả, thử tìm trực tiếp
                    // bằng substring case-insensitive (phù hợp từ viết tắt như FC, HN...)
                    if (searchResults.length === 0) {
                        const lowerKeyword = normalizedKeyword.toLowerCase();
                        searchResults = allRestaurants
                            .filter(r => {
                                const titleNorm = normalizeVietnameseString(r.title?.rendered || '');
                                const addressNorm = normalizeVietnameseString(r.address || '');
                                return titleNorm.includes(lowerKeyword) ||
                                    addressNorm.includes(lowerKeyword);
                            })
                            .slice(0, 15);
                    }

                    setResults(searchResults);
                    setShowDropdown(true);
                } else {
                    setResults([]);
                }
            } catch (error) {
                console.error('Search error:', error);
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, [keyword, fuse]);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (keyword.trim()) {
            window.location.href = `/kham-pha?search=${encodeURIComponent(keyword)}`;
        }
    };

    return (
        <div ref={searchRef} className="relative w-full max-w-2xl">
            <form onSubmit={handleSubmit} className="bg-white rounded-full p-1.5 md:p-2 shadow-xl flex items-center transform hover:scale-[1.01] transition-transform duration-300">
                <div className="pl-3 md:pl-5 text-gray-400 text-base md:text-xl hidden sm:block">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder={placeholder}
                    className="flex-1 px-3 md:px-4 py-2 md:py-3 text-gray-800 placeholder-gray-400 bg-transparent outline-none font-medium text-sm md:text-lg"
                    autoComplete="off"
                />
                {loading && (
                    <div className="mr-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500"></div>
                    </div>
                )}
                <button type="submit" className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 py-2 md:px-8 md:py-3.5 rounded-full font-bold shadow-lg transition-all active:scale-95 text-sm md:text-base">
                    Tìm kiếm
                </button>
            </form>

            {/* Dropdown Results - Fixed z-index and overflow issues */}
            {showDropdown && keyword.trim().length >= 2 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-[9999] max-h-[400px] overflow-y-auto">
                    {loading ? (
                        <div className="p-6 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-2"></div>
                            <p className="text-sm text-gray-500">Đang tìm kiếm...</p>
                        </div>
                    ) : results.length > 0 ? (
                        <div className="divide-y divide-gray-100">
                            {results.map((restaurant) => (
                                <Link
                                    key={restaurant.id}
                                    href={`/quan-an/${restaurant.slug}`}
                                    onClick={() => setShowDropdown(false)}
                                    className="flex items-center justify-between p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors w-full cursor-pointer group"
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        {/* Thumbnail */}
                                        <div className="relative w-12 h-12 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
                                            {restaurant.thumbnail_url ? (
                                                <Image
                                                    src={restaurant.thumbnail_url}
                                                    alt={restaurant.title.rendered}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xl bg-gray-100">
                                                    🍽️
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex flex-col items-start flex-1 min-w-0">
                                            <h4 className="font-semibold text-gray-800 text-sm md:text-base truncate w-full group-hover:text-orange-600 transition-colors">
                                                {restaurant.title.rendered}
                                            </h4>
                                            <p className="text-xs md:text-sm text-gray-500 truncate w-full">
                                                📍 {restaurant.address || 'Cần Giuộc'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Rating */}
                                    {restaurant.average_rating && (
                                        <div className="flex-shrink-0 ml-2 bg-orange-500 text-white px-2 py-1 rounded-lg font-bold text-xs flex items-center gap-1">
                                            <span>⭐</span>
                                            <span>{restaurant.average_rating}</span>
                                        </div>
                                    )}
                                </Link>
                            ))}

                            {/* View All Link */}
                            <div className="p-3 bg-gray-50 text-center">
                                <Link
                                    href={`/kham-pha?search=${encodeURIComponent(keyword)}`}
                                    onClick={() => setShowDropdown(false)}
                                    className="text-sm font-bold text-orange-600 hover:text-orange-700 hover:underline"
                                >
                                    Xem tất cả {results.length} kết quả cho "{keyword}" →
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 text-center">
                            <p className="text-2xl mb-2">😔</p>
                            <p className="text-sm text-gray-600 mb-2">Không tìm thấy kết quả cho "{keyword}"</p>
                            <p className="text-xs text-gray-400">Thử tìm kiếm với từ khóa khác</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
