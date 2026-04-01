// Server Component - Không có "use client"
// Trang này sẽ được render thành Static HTML tại build time
// và được Vercel CDN cache trong 1 giờ (revalidate: 3600)

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchRestaurantBySlug, fetchAllRestaurantSlugs } from '@/lib/api';
import RestaurantDetailClient from './RestaurantDetailClient';

// Revalidate ISR: Vercel sẽ giữ cache 1 giờ, WP không bị gọi liên tục
export const revalidate = 3600;

// Đánh dấu để Vercel biết đây là trang dynamic (slug thay đổi) nhưng vẫn cache được
export const dynamic = 'force-static';

interface PageProps {
    params: Promise<{ slug: string }>;
}

// ============================================================
// generateStaticParams: Pre-render 280+ trang tại Build Time
// Vercel sẽ render toàn bộ quán ăn thành Static HTML
// Khi user click vào, trang load tức thì - WP không bị gọi
// ============================================================
export async function generateStaticParams() {
    const slugs = await fetchAllRestaurantSlugs();
    return slugs.map((slug) => ({ slug }));
}

// ============================================================
// generateMetadata: SEO & Open Graph cho từng quán
// Facebook/Zalo sẽ đọc thẻ này khi share link
// ============================================================
const DEFAULT_OG_IMAGE = 'https://anuongcangiuoc.org/icon-512x512.png';
const SITE_NAME = 'Ẩm thực Cần Giuộc Review';

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const data = await fetchRestaurantBySlug(slug);

    if (!data) {
        return {
            title: 'Không tìm thấy quán | ' + SITE_NAME,
            description: 'Quán ăn bạn tìm kiếm không tồn tại hoặc đã bị xóa.',
        };
    }

    const restaurantName = data.title?.rendered || 'Quán ăn';
    const address = data.address ? `Địa chỉ: ${data.address}. ` : '';
    const price = data.price ? `Giá: ${data.price}. ` : '';
    const description = data.content?.rendered
        ? data.content.rendered.replace(/<[^>]*>/g, '').slice(0, 160)
        : `${address}${price}Khám phá và đánh giá quán ${restaurantName} tại Cần Giuộc.`;

    const ogImage = data.featured_media_url || DEFAULT_OG_IMAGE;

    return {
        title: `${restaurantName} | ${SITE_NAME}`,
        description,
        openGraph: {
            title: `${restaurantName} | ${SITE_NAME}`,
            description,
            url: `https://anuongcangiuoc.org/quan-an/${slug}`,
            siteName: SITE_NAME,
            images: [
                {
                    url: ogImage,
                    width: 1200,
                    height: 630,
                    alt: restaurantName,
                },
            ],
            type: 'article',
            locale: 'vi_VN',
        },
        twitter: {
            card: 'summary_large_image',
            title: `${restaurantName} | ${SITE_NAME}`,
            description,
            images: [ogImage],
        },
        alternates: {
            canonical: `https://anuongcangiuoc.org/quan-an/${slug}`,
        },
    };
}

// ============================================================
// Page Component (Server Component)
// Fetch data tại server, pass xuống Client Component
// ============================================================
export default async function RestaurantDetailPage({ params }: PageProps) {
    const { slug } = await params;
    const data = await fetchRestaurantBySlug(slug);

    if (!data) {
        notFound();
    }

    // Truyền data (đã fetch, đã cache) xuống Client Component
    // Client Component chỉ lo phần interactive (Firebase, Disqus, v.v.)
    return <RestaurantDetailClient data={data} slug={slug} />;
}
