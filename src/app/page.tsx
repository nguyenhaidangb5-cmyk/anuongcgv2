import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { RestaurantCard } from '@/components/RestaurantCard';
import { HeroSection } from '@/components/HeroSection';
import { fetchNewestRestaurants, fetchTopRatedRestaurants, fetchBlogPosts } from '@/lib/api';
import { TrackableLink } from '@/components/TrackableLink';
import { CollectionCarousel } from '@/components/CollectionCarousel';
import { BlogGrid } from '@/components/BlogGrid';
import Image from 'next/image';

// Revalidate trang chủ mỗi 60 giây — đảm bảo quán mới hiện sau tối đa 60s
export const revalidate = 60;

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
              { name: '🍚 Cơm', category: 'com-mon-nuoc' },
              { name: '🍢 Đồ ăn vặt', category: 'do-an-vat' },
              { name: '🎁 Đặc sản', category: 'dac-san-dia-phuong' },
              { name: '🥤 Trà sữa/Cafe', category: 'tra-sua-cafe' },
              { name: '🥦 Món chay', category: 'mon-chay' },
              { name: '🍻 Quán nhậu', category: 'quan-nhau' }
            ].map((cat, idx) => (
              <Link
                key={idx}
                href={`/kham-pha?category=${cat.category}`}
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

              {/* ── TOP 1 ── Thẻ lớn chiếm toàn cột trái */}
              {top5Restaurants[0] && (
                <div className="md:row-span-2 group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300">
                  <div className="relative h-[300px] md:h-full">
                    <Image
                      src={top5Restaurants[0].featured_media_url || 'https://placehold.co/800x600?text=Top+1'}
                      alt={top5Restaurants[0].title.rendered}
                      fill
                      className={`object-cover group-hover:scale-105 transition-transform duration-700 ${(top5Restaurants[0] as any).is_closed ? 'opacity-50 grayscale' : ''}`}
                    />
                    {/* Gradient đậm hơn để chữ nổi */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

                    {/* Badge Quán Quân — góc trên trái */}
                    <div className="absolute top-4 left-4 bg-orange-500 text-white px-3 py-1.5 rounded-md shadow-md flex items-center gap-1.5 font-bold text-sm">
                      🏆 <span>#1 Quán quân</span>
                    </div>

                    {/* Badge Đã Đóng Cửa */}
                    {(top5Restaurants[0] as any).is_closed && (
                      <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1.5 rounded-md font-bold text-sm shadow-lg flex items-center gap-1.5">
                        ⛔ <span>ĐÃ ĐÓNG CỬA</span>
                      </div>
                    )}

                    {/* Info ở đáy ảnh */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6 text-white">
                      <h3 className="text-xl md:text-2xl font-extrabold mb-1.5 drop-shadow-lg line-clamp-2 leading-snug">
                        {top5Restaurants[0].title.rendered}
                      </h3>
                      <p className="text-sm text-white/80 mb-4 flex items-center gap-1.5 line-clamp-1">
                        📍 {top5Restaurants[0].address || 'Cần Giuộc'}
                      </p>
                      <TrackableLink
                        href={`/quan-an/${top5Restaurants[0].slug}`}
                        restaurantId={top5Restaurants[0].id}
                        className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-orange-600/30"
                      >
                        Xem chi tiết →
                      </TrackableLink>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TOP 2-5 ── Danh sách cột phải */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-3">
                {top5Restaurants.slice(1, 5).map((restaurant, idx) => {
                  const rank = idx + 2;
                  const rankLabel: Record<number, string> = {
                    2: '🥈',
                    3: '🥉',
                    4: '#4',
                    5: '#5',
                  };

                  return (
                    <TrackableLink
                      key={restaurant.id}
                      href={`/quan-an/${restaurant.slug}`}
                      restaurantId={restaurant.id}
                      className="group flex flex-col md:flex-row gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                    >
                      {/* Thumbnail */}
                      <div className="relative w-full md:w-1/3 aspect-[4/3] md:aspect-square flex-shrink-0 rounded-lg overflow-hidden">
                        <Image
                          src={restaurant.featured_media_url || 'https://placehold.co/200x200?text=No+Image'}
                          alt={restaurant.title.rendered}
                          fill
                          className={`object-cover group-hover:scale-105 transition-transform duration-300 ${(restaurant as any).is_closed ? 'opacity-50 grayscale' : ''}`}
                        />
                        {/* Rank label – góc trên trái ảnh */}
                        <span className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2 py-0.5 rounded-md">
                          {rankLabel[rank]}
                        </span>
                        {/* Badge Đóng cửa */}
                        {(restaurant as any).is_closed && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-md">⛔ ĐÓNG</span>
                          </div>
                        )}
                      </div>

                      {/* Nội dung */}
                      <div className="flex flex-col justify-center min-w-0 flex-1 py-0.5">
                        <h4 className="font-bold text-gray-900 text-sm leading-snug mb-1 line-clamp-2 group-hover:text-orange-600 transition-colors">
                          {restaurant.title.rendered}
                        </h4>
                        <p className="text-xs text-gray-400 line-clamp-1 mb-1.5">
                          📍 {restaurant.address || 'Cần Giuộc'}
                        </p>
                        <p className="text-xs font-bold text-orange-500">
                          {restaurant.price_range === 'under-30k' ? 'Dưới 30.000đ' : restaurant.price || 'Đang cập nhật'}
                        </p>
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
