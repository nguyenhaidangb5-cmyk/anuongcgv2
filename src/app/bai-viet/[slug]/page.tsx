import { notFound } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { fetchPostBySlug } from '@/lib/api';
import Image from 'next/image';
import Link from 'next/link';

interface BlogPostPageProps {
    params: {
        slug: string;
    };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
    const post = await fetchPostBySlug(params.slug);

    if (!post) {
        notFound();
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <main className="container mx-auto px-4 py-12 max-w-4xl">
                {/* Back Button */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-semibold mb-8 transition-colors"
                >
                    <span>←</span> Quay lại trang chủ
                </Link>

                {/* Article Header */}
                <article className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {/* Featured Image */}
                    {post.image && (
                        <div className="relative h-[400px] w-full">
                            <Image
                                src={post.image}
                                alt={post.title}
                                fill
                                className="object-cover"
                                priority
                            />
                        </div>
                    )}

                    {/* Content */}
                    <div className="p-8 md:p-12">
                        {/* Title */}
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            {post.title}
                        </h1>

                        {/* Meta Info */}
                        <div className="flex items-center gap-4 text-gray-500 text-sm mb-8 pb-8 border-b border-gray-200">
                            <span>📅 {new Date(post.date).toLocaleDateString('vi-VN', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}</span>
                        </div>

                        {/* Post Content */}
                        <div
                            className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-orange-600 prose-a:no-underline hover:prose-a:underline prose-img:rounded-xl prose-img:shadow-md"
                            dangerouslySetInnerHTML={{ __html: post.content || '' }}
                        />
                    </div>
                </article>

                {/* Back to Home CTA */}
                <div className="mt-12 text-center">
                    <Link
                        href="/"
                        className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-full font-bold transition-all shadow-lg hover:shadow-xl"
                    >
                        Khám phá thêm quán ăn
                    </Link>
                </div>
            </main>
        </div>
    );
}

// Generate static paths for all blog posts (optional - for better performance)
export async function generateStaticParams() {
    // You can fetch all blog post slugs here if you want to pre-render them
    // For now, we'll use dynamic rendering
    return [];
}
