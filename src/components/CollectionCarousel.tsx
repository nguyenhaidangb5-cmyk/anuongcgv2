'use client';

import Link from 'next/link';
import Image from 'next/image';

interface Collection {
    title: string;
    href: string;
    image: string;
    emoji: string;
}

const collections: Collection[] = [
    {
        title: 'Bữa Sáng Ấm Bụng',
        href: '/kham-pha?category=an-sang',
        image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&h=600&fit=crop',
        emoji: '🌅'
    },
    {
        title: 'Lê La Ăn Vặt',
        href: '/kham-pha?category=do-an-vat',
        image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&h=600&fit=crop',
        emoji: '🍢'
    },
    {
        title: 'Góc Cà Phê & Trà Sữa',
        href: '/kham-pha?category=tra-sua-cafe',
        image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=600&fit=crop',
        emoji: '☕'
    },
    {
        title: 'Lai Rai Chiến Hữu',
        href: '/kham-pha?category=quan-nhau',
        image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=600&fit=crop',
        emoji: '🍻'
    },
    {
        title: 'Thanh Đạm Món Chay',
        href: '/kham-pha?category=mon-chay',
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=600&fit=crop',
        emoji: '🥗'
    },
    {
        title: 'Tinh Hoa Cần Giuộc',
        href: '/kham-pha?category=dac-san-dia-phuong',
        image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&h=600&fit=crop',
        emoji: '🎁'
    },
    {
        title: 'Chắc Bụng Bữa Cơm',
        href: '/kham-pha?category=com-mon-nuoc',
        image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&h=600&fit=crop',
        emoji: '🍚'
    },
];

export function CollectionCarousel() {
    return (
        <section className="mb-16">
            <div className="mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
                    🍜 Hôm Nay Ăn Gì?
                </h2>
                <p className="text-gray-500 text-sm mt-1">Khám phá theo bộ sưu tập</p>
            </div>

            {/* Unified Horizontal Scroll — works on both Mobile (swipe) and Desktop (mouse scroll) */}
            <div
                className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
            >
                {collections.map((collection, index) => (
                    <Link
                        key={index}
                        href={collection.href}
                        className="flex-shrink-0 w-36 md:w-44 group snap-start"
                    >
                        <div className="relative aspect-square rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300">
                            <Image
                                src={collection.image}
                                alt={collection.title}
                                fill
                                className="object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-2">
                                <div className="text-3xl md:text-4xl mb-2">{collection.emoji}</div>
                                <h3 className="text-xs md:text-sm font-bold drop-shadow-lg text-center leading-tight px-1">
                                    {collection.title}
                                </h3>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
