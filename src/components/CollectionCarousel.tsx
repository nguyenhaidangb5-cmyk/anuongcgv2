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

            {/* Horizontal Scroll Container */}
            <div className="relative overflow-hidden">
                <div className="flex overflow-x-auto gap-3 md:gap-4 pb-4 snap-x snap-mandatory scrollbar-hide px-4 md:px-0">
                    {collections.map((collection, index) => (
                        <Link
                            key={index}
                            href={collection.href}
                            className="flex-shrink-0 w-32 md:w-56 group snap-start"
                        >
                            <div className="relative aspect-square rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300">
                                {/* Background Image */}
                                <Image
                                    src={collection.image}
                                    alt={collection.title}
                                    fill
                                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                                />

                                {/* Dark Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                                {/* Content */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-2">
                                    <div className="text-3xl md:text-5xl mb-1 md:mb-3">{collection.emoji}</div>
                                    <h3 className="text-xs md:text-xl font-bold drop-shadow-lg text-center leading-tight">
                                        {collection.title}
                                    </h3>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Scroll Hint - Mobile */}
                <div className="absolute right-0 top-0 bottom-4 w-16 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none md:hidden" />
            </div>

            <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
        </section>
    );
}
