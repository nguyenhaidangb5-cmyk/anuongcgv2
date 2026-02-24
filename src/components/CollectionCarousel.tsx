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
        title: 'Ăn Sáng',
        href: '/kham-pha?category=an-sang',
        image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&h=600&fit=crop',
        emoji: '🍜'
    },
    {
        title: 'Vỉa Hè < 50k',
        href: '/kham-pha?price_range=under-30k',
        image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&h=600&fit=crop',
        emoji: '🍢'
    },
    {
        title: 'Cà phê chill',
        href: '/kham-pha?category=tra-sua-cafe',
        image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=600&fit=crop',
        emoji: '☕'
    },
    {
        title: 'Nhậu Lai Rai',
        href: '/kham-pha?category=quan-nhau',
        image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=600&fit=crop',
        emoji: '🍻'
    },
    {
        title: 'Món Chay',
        href: '/kham-pha?category=mon-chay',
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=600&fit=crop',
        emoji: '🥗'
    }
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

            {/* MOBILE: Horizontal Scroll (giữ nguyên) */}
            <div className="relative overflow-hidden md:hidden">
                <div className="flex overflow-x-auto gap-3 pb-4 snap-x snap-mandatory px-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {collections.map((collection, index) => (
                        <Link
                            key={index}
                            href={collection.href}
                            className="flex-shrink-0 w-32 group snap-start"
                        >
                            <div className="relative aspect-square rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300">
                                <Image src={collection.image} alt={collection.title} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-2">
                                    <div className="text-3xl mb-1">{collection.emoji}</div>
                                    <h3 className="text-xs font-bold drop-shadow-lg text-center leading-tight">{collection.title}</h3>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
                {/* Scroll Hint gradient */}
                <div className="absolute right-0 top-0 bottom-4 w-16 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none" />
            </div>

            {/* DESKTOP: Grid 5 cột dàn đều */}
            <div className="hidden md:grid md:grid-cols-5 md:gap-5 lg:gap-6">
                {collections.map((collection, index) => (
                    <Link
                        key={index}
                        href={collection.href}
                        className="group"
                    >
                        <div className="relative aspect-square rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300">
                            <Image src={collection.image} alt={collection.title} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-3">
                                <div className="text-5xl mb-3">{collection.emoji}</div>
                                <h3 className="text-xl font-bold drop-shadow-lg text-center leading-tight">{collection.title}</h3>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
