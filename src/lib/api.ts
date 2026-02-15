import { Restaurant } from '@/types/wordpress';

const API_URL = process.env.NEXT_PUBLIC_WORDPRESS_API_URL || process.env.WORDPRESS_API_URL || 'https://admin.anuongcangiuoc.org/wp-json';

/**
 * Hàm hỗ trợ sửa lỗi URL từ WordPress database cũ
 * Chuyển các link từ anuongcangiuoc.org sang admin.anuongcangiuoc.org
 */
export function fixWpUrl(url: string | null | undefined): string {
    if (!url) return '';
    return url.replace(/https?:\/\/anuongcangiuoc\.org/g, 'https://admin.anuongcangiuoc.org');
}

export interface FetchRestaurantsParams {
    per_page?: number;
    page?: number;
    search?: string;
    orderby?: 'date' | 'title' | 'rating' | 'view_count';
    order?: 'asc' | 'desc';
    food_type?: string;
    khu_vuc?: string;
}

export interface FetchRestaurantsResponse {
    restaurants: Restaurant[];
    total: number;
    totalPages: number;
}

/**
 * Fetch danh sách quán ăn từ WordPress REST API (legacy - returns array only)
 */
export async function fetchRestaurants(params: FetchRestaurantsParams = {}): Promise<Restaurant[]> {
    const result = await fetchRestaurantsWithPagination(params);
    return result.restaurants;
}

/**
 * Fetch danh sách quán ăn với thông tin pagination
 */
export async function fetchRestaurantsWithPagination(params: FetchRestaurantsParams = {}): Promise<FetchRestaurantsResponse> {
    const {
        per_page = 20,
        page = 1,
        search,
        orderby,
        order,
        food_type,
        khu_vuc
    } = params;

    const queryParams = new URLSearchParams({
        per_page: per_page.toString(),
        page: page.toString(),
        _embed: '1', // Để lấy featured image
    });

    if (search) queryParams.append('search', search);

    // Handle different orderby options
    if (orderby === 'rating') {
        // Sort by average rating (client-side after fetch)
        queryParams.append('orderby', 'date');
    } else if (orderby === 'view_count') {
        // Sort by ads click count meta field
        queryParams.append('orderby', 'meta_value_num');
        queryParams.append('meta_key', '_ads_click_count');
    } else if (orderby) {
        queryParams.append('orderby', orderby);
    }

    if (order) queryParams.append('order', order);
    if (food_type) queryParams.append('food_type', food_type);
    if (khu_vuc) queryParams.append('khu_vuc', khu_vuc);

    const url = `${API_URL}/wp/v2/quan_an?${queryParams.toString()}`;

    try {
        const response = await fetch(url, {
            next: { revalidate: 10 } // Cache 10 giây
        });

        if (!response.ok) {
            console.error('API Error:', response.status, response.statusText);
            return { restaurants: [], total: 0, totalPages: 0 };
        }

        const data = await response.json();

        // Get total count from headers
        const total = parseInt(response.headers.get('X-WP-Total') || '0', 10);
        const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '0', 10);

        // Fix URLs cho từng quán ăn
        let restaurants = (data as Restaurant[]).map(r => ({
            ...r,
            featured_media_url: fixWpUrl(r.featured_media_url),
            thumbnail_url: fixWpUrl(r.thumbnail_url),
            content: {
                ...r.content,
                rendered: fixWpUrl(r.content?.rendered)
            }
        }));

        // Client-side sorting for rating
        if (orderby === 'rating') {
            restaurants = restaurants
                .map(r => {
                    const ratings = [
                        Number(r.rating_food || 0),
                        Number(r.rating_price || 0),
                        Number(r.rating_service || 0),
                        Number(r.rating_ambiance || 0),
                    ].filter(rating => rating > 0);
                    const avgRating = ratings.length > 0
                        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
                        : 0;
                    return { ...r, avgRating };
                })
                .sort((a: any, b: any) => {
                    const orderMultiplier = order === 'asc' ? 1 : -1;
                    return (b.avgRating - a.avgRating) * orderMultiplier;
                });
        }

        return { restaurants, total, totalPages };
    } catch (error) {
        console.error('Fetch error:', error);
        return { restaurants: [], total: 0, totalPages: 0 };
    }
}

/**
 * Fetch 1 quán ăn theo slug
 */
export async function fetchRestaurantBySlug(slug: string): Promise<Restaurant | null> {
    const url = `${API_URL}/wp/v2/quan_an?slug=${slug}&_embed=1`;

    try {
        const response = await fetch(url, {
            next: { revalidate: 10 }
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        if (data.length === 0) return null;

        const r = data[0] as Restaurant;
        return {
            ...r,
            featured_media_url: fixWpUrl(r.featured_media_url),
            thumbnail_url: fixWpUrl(r.thumbnail_url),
            content: {
                ...r.content,
                rendered: fixWpUrl(r.content?.rendered)
            }
        };
    } catch (error) {
        console.error('Fetch error:', error);
        return null;
    }
}

/**
 * Fetch quán mới nhất
 */
export async function fetchNewestRestaurants(limit: number = 6): Promise<Restaurant[]> {
    return fetchRestaurants({
        per_page: limit,
        orderby: 'date',
        order: 'desc'
    });
}

/**
 * Hàm shuffle mảng (Fisher-Yates algorithm)
 */
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Fetch quán top rated với ưu tiên manual Top 5
 * Logic: 
 * 1. Lấy quán có is_manual_top_5 = true, sort theo manual_top_5_order ASC
 * 2. Nếu chưa đủ 5, lấy tiếp quán có rating >= 4.5
 */
export async function fetchTopRatedRestaurants(limit: number = 5): Promise<Restaurant[]> {
    // Lấy nhiều quán để có đủ dữ liệu
    const restaurants = await fetchRestaurants({
        per_page: 200
    });

    // 1. Lấy quán được ghim thủ công (is_manual_top_5 = true)
    const manualTop5 = restaurants
        .filter((r: any) => r.is_manual_top_5 === true)
        .sort((a: any, b: any) => {
            const orderA = a.manual_top_5_order || 999;
            const orderB = b.manual_top_5_order || 999;
            return orderA - orderB; // ASC: 1, 2, 3, 4, 5
        });

    // 2. Nếu đã đủ limit, return luôn
    if (manualTop5.length >= limit) {
        return manualTop5.slice(0, limit);
    }

    // 3. Nếu chưa đủ, lấy thêm quán có rating cao
    const manualIds = new Set(manualTop5.map(r => r.id));

    const highRatedRestaurants = restaurants
        .filter(r => !manualIds.has(r.id)) // Loại bỏ quán đã có trong manual
        .map(r => {
            const ratings = [
                Number(r.rating_food || 0),
                Number(r.rating_price || 0),
                Number(r.rating_service || 0),
                Number(r.rating_ambiance || 0),
            ].filter(rating => rating > 0);

            const avgRating = ratings.length > 0
                ? ratings.reduce((a, b) => a + b, 0) / ratings.length
                : 0;

            return { ...r, avgRating };
        })
        .filter(r => r.avgRating >= 4.5) // Chỉ lấy quán có rating >= 4.5
        .sort((a: any, b: any) => b.avgRating - a.avgRating); // Sort DESC by rating

    // 4. Kết hợp: Manual Top 5 + High Rated
    const combined = [...manualTop5, ...highRatedRestaurants];
    return combined.slice(0, limit);
}

/**
 * Fetch quán được đánh dấu Sticky trong WordPress
 */
export async function fetchStickyRestaurants(limit: number = 8): Promise<Restaurant[]> {
    const url = `${API_URL}/wp/v2/quan_an?sticky=true&per_page=${limit}&_embed=1`;

    try {
        const response = await fetch(url, {
            next: { revalidate: 10 }
        });

        if (!response.ok) {
            console.error('API Error:', response.status, response.statusText);
            return [];
        }

        const data = await response.json();

        // Fix URLs cho từng quán ăn
        return (data as Restaurant[]).map(r => ({
            ...r,
            featured_media_url: fixWpUrl(r.featured_media_url),
            thumbnail_url: fixWpUrl(r.thumbnail_url),
            content: {
                ...r.content,
                rendered: fixWpUrl(r.content?.rendered)
            }
        }));
    } catch (error) {
        console.error('Fetch error:', error);
        return [];
    }
}

/**
 * ENTERPRISE: Track click on Top 5 restaurant
 * Uses Beacon API for non-blocking tracking with fallback to fetch
 */
export async function trackRestaurantClick(restaurantId: number): Promise<void> {
    const url = `${API_URL}/cg/v1/track-click/${restaurantId}`;

    try {
        // Try Beacon API first (non-blocking, works even if user navigates away)
        if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify({ id: restaurantId })],
                { type: 'application/json' });
            const sent = navigator.sendBeacon(url, blob);

            if (sent) {
                return; // Successfully sent via Beacon
            }
        }

        // Fallback to fetch (for browsers without Beacon API)
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: restaurantId })
        });
    } catch (error) {
        // Silently fail - tracking shouldn't break user experience
        console.debug('Click tracking failed:', error);
    }
}
