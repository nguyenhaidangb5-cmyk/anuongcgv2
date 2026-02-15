import Link from 'next/link';
import Image from 'next/image';
import { BlogPost } from '@/lib/api';

interface BlogGridProps {
    posts: BlogPost[];
}

export function BlogGrid({ posts }: BlogGridProps) {
    if (posts.length === 0) {
        return null;
    }

    return (
        <section className="mb-20">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
                        📝 Góc Review & Khám Phá
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Những bài viết mới nhất từ cộng đồng</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {posts.map((post) => (
                    <Link
                        key={post.id}
                        href={`/bai-viet/${post.slug}`}
                        className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300"
                    >
                        {/* Featured Image */}
                        <div className="relative h-[200px] bg-gray-200">
                            {post.image ? (
                                <Image
                                    src={post.image}
                                    alt={post.title}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-5xl">
                                    📝
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors">
                                {post.title}
                            </h3>

                            <p className="text-sm text-gray-500 mb-3">
                                {new Date(post.date).toLocaleDateString('vi-VN', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </p>

                            <p className="text-sm text-gray-600 line-clamp-3">
                                {post.excerpt}
                            </p>

                            <div className="mt-4 flex items-center text-orange-600 font-semibold text-sm group-hover:gap-2 transition-all">
                                Đọc thêm
                                <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
