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
        // Sort by view count meta field
        queryParams.append('orderby', 'meta_value_num');
        queryParams.append('meta_key', 'post_views_count');
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
 * Fetch quán top rated (có rating >= 4.5, sau đó shuffle ngẫu nhiên)
 */
export async function fetchTopRatedRestaurants(limit: number = 5): Promise<Restaurant[]> {
    // Lấy nhiều quán để có đủ dữ liệu
    const restaurants = await fetchRestaurants({
        per_page: 200
    });

    // Tính rating trung bình và lọc >= 4.5
    const highRatedRestaurants = restaurants
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
        .filter(r => r.avgRating >= 4.5); // Chỉ lấy quán có rating >= 4.5

    // Shuffle danh sách và lấy số lượng cần thiết
    const shuffled = shuffleArray(highRatedRestaurants);
    return shuffled.slice(0, limit);
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
