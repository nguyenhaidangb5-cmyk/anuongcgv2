export interface Restaurant {
    id: number;
    slug: string;
    title: {
        rendered: string;
    };
    content: {
        rendered: string;
    };
    excerpt: {
        rendered: string;
    };
    featured_media: number;
    featured_media_url?: string; // Sẽ được inject thêm từ UI
    acf?: {
        phone?: string;
        address?: string;
        hours?: string;
        price?: string;
        map_link?: string;
        badges?: string[];
        rating_food?: string;
        rating_price?: string;
        rating_service?: string;
        rating_ambiance?: string;
    };
    // Data từ REST API fields (đăng ký trong plugin)
    phone?: string;
    address?: string;
    hours?: string;
    price?: string;
    price_range?: string; // value cho logic
    map_link?: string;
    zalo_phone?: string;  // Số Zalo để mở link zalo.me
    badges?: string[];

    // Ratings
    rating_food?: string;
    rating_price?: string;
    rating_service?: string;
    rating_ambiance?: string;
    average_rating?: number; // MỚI: Tính sẵn từ plugin

    // Media
    thumbnail_url?: string; // MỚI: Ảnh nhỏ cho search

    // Boolean Flags (Đầy đủ từ v4.0)
    has_ac?: boolean;
    has_parking?: boolean;
    is_verified?: boolean;
    is_local_choice?: boolean;
    is_new?: boolean;
    is_trending?: boolean;
    is_family_friendly?: boolean;
    has_nice_view?: boolean;
    is_good_cheap?: boolean;
    is_authentic?: boolean;
    has_alcohol?: boolean;
    is_shipping?: boolean;

    // Image Galleries (NEW: UX Upgrade)
    menu_images?: ImageObject[];
    gallery_images?: ImageObject[];

    // Legacy/Helper fields (giữ lại nếu code cũ còn dùng)
    region?: string;
    priceRange?: string; // alias cũ của price_range
    foodType?: string;
}

export interface ImageObject {
    sourceUrl: string;
    altText: string;
    width: number;
    height: number;
}

export const BADGE_LABELS: Record<string, { label: string; icon: string }> = {
    has_ac: { label: 'Có máy lạnh', icon: '❄️' },
    local_choice: { label: 'Dân địa phương chọn', icon: '🏠' },
    free_parking: { label: 'Giữ xe miễn phí', icon: '🛵' },
    verified: { label: 'Admin Đề Xuất', icon: '👑' },
    new_open: { label: 'Quán mới', icon: '🆕' },
    has_alcohol: { label: 'Có bán rượu bia', icon: '🍺' },
    authentic: { label: 'Quán ngon chuẩn vị', icon: '🍜' },
    admin_choice: { label: 'Admin khuyên dùng', icon: '⭐' },
    family_friendly: { label: 'Phù hợp gia đình', icon: '👨‍👩‍👧‍👦' },
    good_cheap: { label: 'Ngon, bổ, rẻ', icon: '💰' },
    nice_view: { label: 'View sống ảo', icon: '📸' },
    trending: { label: 'Đang hot', icon: '🔥' },
    fast_delivery: { label: 'Giao hàng nhanh', icon: '🚀' },
    online_only: { label: 'Chỉ bán online', icon: '📱' },
};
