import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { RestaurantCard } from '@/components/RestaurantCard';
import { HeroSection } from '@/components/HeroSection';
import { fetchNewestRestaurants, fetchTopRatedRestaurants, fetchBlogPosts } from '@/lib/api';
import { TrackableLink } from '@/components/TrackableLink';
import { CollectionCarousel } from '@/components/CollectionCarousel';
import { BlogGrid } from '@/components/BlogGrid';
import Image from 'next/image';

// Revalidate trang chủ mỗi 1 giờ
export const revalidate = 10;

export default async function Home() {
  // Step 1: Fetch Top 5 (Hống thứ c cấo nhất)
  const top5Restaurants = await fetchTopRatedRestaurants(5);

  // Step 2: Extract IDs to exclude from new arrivals
  const excludeIds = top5Restaurants.map(r => r.id);

  // Step 3: Fetch New Arrivals (excluding Top 5)
  const newestRestaurants = await fetchNewestRestaurants(8, excludeIds);

  // Step 4: Fetch Blog Posts
  const blogPosts = await fetchBlogPosts(3);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Navbar />

      {/* Hero Section */}
      <HeroSection />

      {/* Categories Section - Moved out of Hero, white bg */}
      <section className="bg-white py-6 md:py-8 border-b border-gray-100 mb-8 md:mb-12">
        <div className="container mx-auto px-4">
          <div className="flex overflow-x-auto gap-3 md:gap-4 no-scrollbar py-2 md:justify-center">
            {[
              { name: '🌅 Ăn sáng', category: 'an-sang' },
              { name: '🔥 Quán Hot', category: '', href: '/kham-pha?sort=popular' },
              { name: '🍚 Cơm', category: 'com-mon-nuoc' },
              { name: '🍢 Đồ ăn vặt', category: 'do-an-vat' },
              { name: '🎁 Đặc sản', category: 'dac-san-dia-phuong' },
              { name: '🥤 Trà sữa/Cafe', category: 'tra-sua-cafe' },
              { name: '🥦 Món chay', category: 'mon-chay' },
              { name: '🍻 Quán nhậu', category: 'quan-nhau' }
            ].map((cat, idx) => (
              <Link
                key={idx}
                href={cat.href ?? `/kham-pha?category=${cat.category}`}
                className="flex-shrink-0 whitespace-nowrap bg-gray-50 hover:bg-orange-500 hover:text-white px-5 py-2.5 md:px-6 md:py-3 rounded-full font-bold text-gray-700 transition-all text-sm md:text-base border border-gray-100"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 pb-20">

        {/* Top 5 Yêu Thích */}
        <div className="mb-20">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
                🏆 Top 5 Yêu Thích
              </h2>
              <p className="text-gray-500 text-sm mt-1">Những quán được đánh giá cao nhất</p>
            </div>
          </div>

          {top5Restaurants.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:max-h-[600px]">
              {/* Top 1 - Lớn bên trái */}
              {top5Restaurants[0] && (
                <div className="md:row-span-2 group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300">
                  <div className="relative h-[300px] md:h-full md:aspect-video">
                    <Image
                      src={top5Restaurants[0].featured_media_url || 'https://placehold.co/800x600?text=Top+1'}
                      alt={top5Restaurants[0].title.rendered}
                      fill
                      className={`object-cover group-hover:scale-105 transition-transform duration-500 ${(top5Restaurants[0] as any).is_closed ? 'opacity-50 grayscale' : ''}`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                    {/* Huy chương Top 1 */}
                    <div className="absolute top-4 left-4 bg-gradient-to-br from-yellow-400 to-yellow-600 text-white w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center font-extrabold text-2xl md:text-3xl shadow-2xl border-4 border-white">
                      1
                    </div>

                    {/* Badge Đã Đóng Cửa */}
                    {(top5Restaurants[0] as any).is_closed && (
                      <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg flex items-center gap-2">
                        ⛔ ĐÃ ĐÓNG CỬA
                      </div>
                    )}

                    {/* Info */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                      <h3 className="text-2xl md:text-2xl font-extrabold mb-2 drop-shadow-lg">
                        {top5Restaurants[0].title.rendered}
                      </h3>
                      <p className="text-sm md:text-base text-white/90 mb-3 flex items-center gap-2">
                        <span>📍</span> {top5Restaurants[0].address || 'Cần Giuộc'}
                      </p>
                      <TrackableLink
                        href={`/quan-an/${top5Restaurants[0].slug}`}
                        restaurantId={top5Restaurants[0].id}
                        className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-full font-bold transition-all"
                      >
                        Xem chi tiết
                      </TrackableLink>
                    </div>
                  </div>
                </div>
              )}

              {/* Top 2-5 - Lưới nhỏ bên phải */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-4">
                {top5Restaurants.slice(1, 5).map((restaurant, idx) => {
                  const rank = idx + 2;
                  const medalColors: Record<number, string> = {
                    2: 'from-gray-300 to-gray-500',
                    3: 'from-orange-300 to-orange-500',
                    4: 'from-blue-300 to-blue-500',
                    5: 'from-purple-300 to-purple-500'
                  };

                  return (
                    <TrackableLink
                      key={restaurant.id}
                      href={`/quan-an/${restaurant.slug}`}
                      restaurantId={restaurant.id}
                      className="group relative bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all"
                    >
                      <div className="flex gap-4 p-4">
                        <div className="relative w-24 h-24 md:w-20 md:h-20 flex-shrink-0 rounded-lg overflow-hidden md:aspect-square">
                          <Image
                            src={restaurant.featured_media_url || 'https://placehold.co/200x200?text=No+Image'}
                            alt={restaurant.title.rendered}
                            fill
                            className={`object-cover group-hover:scale-110 transition-transform duration-300 ${(restaurant as any).is_closed ? 'opacity-50 grayscale' : ''}`}
                          />
                          {/* Huy chương nhỏ */}
                          <div className={`absolute -top-2 -left-2 bg-gradient-to-br ${medalColors[rank]} text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-lg border-2 border-white`}>
                            {rank}
                          </div>
                          {/* Badge Đã Đóng Cửa */}
                          {(restaurant as any).is_closed && (
                            <div className="absolute top-1 right-1 bg-red-600 text-white px-2 py-1 rounded text-[10px] font-bold shadow-md">
                              ⛔ ĐÓNG
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 text-sm md:text-sm mb-1 line-clamp-2 group-hover:text-orange-600 transition-colors">
                            {restaurant.title.rendered}
                          </h4>
                          <p className="text-xs text-gray-500 mb-2 line-clamp-1">
                            📍 {restaurant.address || 'Cần Giuộc'}
                          </p>
                          <p className="text-xs font-bold text-orange-600">
                            {restaurant.price || 'Đang cập nhật'}
                          </p>
                        </div>
                      </div>
                    </TrackableLink>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-400 py-10">Đang cập nhật dữ liệu...</p>
          )}
        </div>

        {/* Collection Carousel - NEW */}
        <CollectionCarousel />

        {/* Quán Mới Phải Thử */}
        <div className="mb-20">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
                🆕 Quán Mới Phải Thử
              </h3>
              <p className="text-gray-500 text-sm mt-1">Những địa điểm mới nhất vừa được cập nhật</p>
            </div>

            <Link href="/kham-pha?sort=newest" className="flex items-center gap-1 text-orange-500 font-bold hover:text-orange-600 hover:underline text-sm">
              Xem tất cả
              <span>→</span>
            </Link>
          </div>

          {newestRestaurants.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {newestRestaurants.map((restaurant) => (
                <RestaurantCard key={restaurant.id} data={restaurant} />
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-10">Đang cập nhật dữ liệu...</p>
          )}
        </div>

        {/* Blog Posts Grid - NEW */}
        <BlogGrid posts={blogPosts} />

      </main>
    </div>
  );
}
