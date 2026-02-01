"use client";
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Restaurant, BADGE_LABELS } from '@/types/wordpress';

interface RestaurantCardProps {
    data: Restaurant;
}

const getBadgeStyle = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('máy lạnh') || l.includes('view sông')) {
        return {
            class: 'bg-blue-50 text-blue-700 border-blue-100',
            icon: l.includes('máy lạnh') ? '❄️' : '🌊'
        };
    }
    if (l.includes('ngon, bổ, rẻ') || l.includes('xác thực')) {
        return {
            class: 'bg-green-50 text-green-700 border-green-100',
            icon: l.includes('xác thực') ? '✅' : '🍃'
        };
    }
    if (l.includes('địa phương') || l.includes('chuẩn vị')) {
        return {
            class: 'bg-orange-50 text-orange-700 border-orange-100',
            icon: l.includes('địa phương') ? '🏠' : '⭐'
        };
    }
    if (l.includes('hot')) {
        return {
            class: 'bg-red-50 text-red-700 border-red-100',
            icon: '🔥'
        };
    }
    return {
        class: 'bg-gray-50 text-gray-600 border-gray-100',
        icon: '📍'
    };
};

export const RestaurantCard: React.FC<RestaurantCardProps> = ({ data }) => {
    const ratings = [
        Number(data.rating_food || 0),
        Number(data.rating_price || 0),
        Number(data.rating_service || 0),
        Number(data.rating_ambiance || 0),
    ].filter((r) => r > 0);

    const averageRating = ratings.length
        ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
        : null;

    const imageUrl = data.featured_media_url || 'https://placehold.co/600x400?text=No+Image';

    return (
        <Link
            href={`/quan-an/${data.slug}`}
            className="group bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-row md:flex-col h-28 md:h-full overflow-hidden block"
        >
            {/* Image Container - Mobile: Fixed width / Desktop: Full width height */}
            <div className="relative w-28 md:w-full h-full md:h-48 flex-shrink-0">
                <Image
                    src={imageUrl}
                    alt={data.title.rendered}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                />

                {/* Rating Badge - Adjusted position */}
                {averageRating && (
                    <div className="absolute bottom-1 right-1 md:top-3 md:right-3 md:bottom-auto bg-white/90 md:bg-orange-500 md:text-white text-orange-600 px-1.5 py-0.5 md:px-2 md:py-1 rounded md:rounded-lg font-bold text-[10px] md:text-xs shadow-sm flex items-center gap-1 backdrop-blur-sm">
                        <span>★</span>
                        <span>{averageRating}</span>
                    </div>
                )}
            </div>

            {/* Content Container */}
            <div className="flex-1 p-3 md:p-4 flex flex-col justify-between md:justify-start min-w-0">
                <div>
                    <h3 className="text-sm md:text-lg font-bold text-gray-900 mb-1 leading-tight group-hover:text-orange-600 transition-colors line-clamp-2">
                        {data.title.rendered}
                    </h3>

                    <div className="flex items-center gap-1 text-gray-500 text-sm md:text-xs font-medium mb-1 md:mb-3">
                        <span className="flex-shrink-0">📍</span>
                        <span className="line-clamp-1 truncate text-[10px] md:text-xs">{data.address || 'Đang cập nhật địa chỉ'}</span>
                    </div>
                </div>

                <div className="flex flex-row md:flex-col lg:flex-row items-center justify-between mt-auto md:mt-0 gap-2 md:gap-0 md:border-t md:border-gray-50 md:pt-3">
                    <span className="text-xs md:text-sm font-bold text-gray-900 bg-gray-50 md:bg-transparent px-2 py-0.5 rounded md:p-0">
                        {data.price_range === 'under-30k' ? '< 30k' : data.price || '---'}
                    </span>

                    <span
                        className="hidden md:inline-block text-[10px] md:text-xs font-bold text-orange-600 hover:text-white bg-orange-50 hover:bg-orange-500 px-3 py-1.5 md:px-4 md:py-2 rounded-full transition-all"
                    >
                        Xem ngay
                    </span>
                </div>
            </div>
        </Link>
    );
};
