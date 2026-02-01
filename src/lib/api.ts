import { Restaurant } from '@/types/wordpress';

const API_URL = process.env.NEXT_PUBLIC_WORDPRESS_API_URL || process.env.WORDPRESS_API_URL || 'https://admin.anuongcangiuoc.org/wp-json';

export interface FetchRestaurantsParams {
    per_page?: number;
    page?: number;
    search?: string;
    orderby?: 'date' | 'title';
    order?: 'asc' | 'desc';
    food_type?: string;
    khu_vuc?: string;
}

/**
 * Fetch danh sách quán ăn từ WordPress REST API
 */
export async function fetchRestaurants(params: FetchRestaurantsParams = {}): Promise<Restaurant[]> {
    const {
        per_page = 10,
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
    if (orderby) queryParams.append('orderby', orderby);
    if (order) queryParams.append('order', order);
    if (food_type) queryParams.append('food_type', food_type);
    if (khu_vuc) queryParams.append('khu_vuc', khu_vuc);

    const url = `${API_URL}/wp/v2/quan_an?${queryParams.toString()}`;

    try {
        const response = await fetch(url, {
            next: { revalidate: 60 } // Cache 60 giây
        });

        if (!response.ok) {
            console.error('API Error:', response.status, response.statusText);
            return [];
        }

        const data = await response.json();
        return data as Restaurant[];
    } catch (error) {
        console.error('Fetch error:', error);
        return [];
    }
}

/**
 * Fetch 1 quán ăn theo slug
 */
export async function fetchRestaurantBySlug(slug: string): Promise<Restaurant | null> {
    const url = `${API_URL}/wp/v2/quan_an?slug=${slug}&_embed=1`;

    try {
        const response = await fetch(url, {
            next: { revalidate: 60 }
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        return data.length > 0 ? data[0] : null;
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
 * Fetch quán top rated (có rating cao nhất)
 */
export async function fetchTopRatedRestaurants(limit: number = 5): Promise<Restaurant[]> {
    // Lấy nhiều hơn để sort client-side
    const restaurants = await fetchRestaurants({
        per_page: 200
    });

    // Sort theo rating trung bình
    const sorted = restaurants
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
        .sort((a, b) => b.avgRating - a.avgRating)
        .slice(0, limit);

    return sorted;
}
