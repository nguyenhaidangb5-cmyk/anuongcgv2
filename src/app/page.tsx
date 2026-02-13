import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { RestaurantCard } from '@/components/RestaurantCard';
import { HeroSection } from '@/components/HeroSection';
import { fetchRestaurants, fetchTopRatedRestaurants, fetchNewestRestaurants, fetchStickyRestaurants } from '@/lib/api';
import Image from 'next/image';

// Revalidate trang chủ mỗi 1 giờ
export const revalidate = 10;

export default async function Home() {
  // Fetch dữ liệu thật từ WordPress
  const topRatedRestaurants = await fetchTopRatedRestaurants(5);
  const newestRestaurants = await fetchNewestRestaurants(6);
  const stickyRestaurants = await fetchStickyRestaurants(8);

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
              { name: '🔥 Quán Hot', category: 'trending' },
              { name: '🍻 Quán nhậu', category: 'quan-nhau' },
              { name: '🍚 Cơm/Món nước', category: 'com-mon-nuoc' },
              { name: '🦐 Hải sản', category: 'hai-san' },
              { name: '🍢 Đồ ăn vặt', category: 'do-an-vat' },
              { name: '🎁 Đặc sản địa phương', category: 'dac-san-dia-phuong' },
              { name: '🥤 Trà sữa/Cafe', category: 'tra-sua-cafe' },
              { name: '🥦 Món chay', category: 'mon-chay' }
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

          {topRatedRestaurants.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:max-h-[600px]">
              {/* Top 1 - Lớn bên trái */}
              {topRatedRestaurants[0] && (
                <div className="md:row-span-2 group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300">
                  <div className="relative h-[300px] md:h-full md:aspect-video">
                    <Image
                      src={topRatedRestaurants[0].featured_media_url || 'https://placehold.co/800x600?text=Top+1'}
                      alt={topRatedRestaurants[0].title.rendered}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                    {/* Huy chương Top 1 */}
                    <div className="absolute top-4 left-4 bg-gradient-to-br from-yellow-400 to-yellow-600 text-white w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center font-extrabold text-2xl md:text-3xl shadow-2xl border-4 border-white">
                      1
                    </div>

                    {/* Info */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                      <h3 className="text-2xl md:text-2xl font-extrabold mb-2 drop-shadow-lg">
                        {topRatedRestaurants[0].title.rendered}
                      </h3>
                      <p className="text-sm md:text-base text-white/90 mb-3 flex items-center gap-2">
                        <span>📍</span> {topRatedRestaurants[0].address || 'Cần Giuộc'}
                      </p>
                      <Link href={`/quan-an/${topRatedRestaurants[0].slug}`} className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-full font-bold transition-all">
                        Xem chi tiết
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Top 2-5 - Lưới nhỏ bên phải */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-4">
                {topRatedRestaurants.slice(1, 5).map((restaurant, idx) => {
                  const rank = idx + 2;
                  const medalColors: Record<number, string> = {
                    2: 'from-gray-300 to-gray-500',
                    3: 'from-orange-300 to-orange-500',
                    4: 'from-blue-300 to-blue-500',
                    5: 'from-purple-300 to-purple-500'
                  };

                  return (
                    <Link key={restaurant.id} href={`/quan-an/${restaurant.slug}`} className="group relative bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all">
                      <div className="flex gap-4 p-4">
                        <div className="relative w-24 h-24 md:w-20 md:h-20 flex-shrink-0 rounded-lg overflow-hidden md:aspect-square">
                          <Image
                            src={restaurant.featured_media_url || 'https://placehold.co/200x200?text=No+Image'}
                            alt={restaurant.title.rendered}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                          {/* Huy chương nhỏ */}
                          <div className={`absolute -top-2 -left-2 bg-gradient-to-br ${medalColors[rank]} text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-lg border-2 border-white`}>
                            {rank}
                          </div>
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
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-400 py-10">Đang cập nhật dữ liệu...</p>
          )}
        </div>

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

        {/* Địa Điểm Nổi Bật */}
        <div className="mb-20">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
                ⭐ Địa điểm Nổi bật
              </h3>
              <p className="text-gray-500 text-sm mt-1">Khám phá những quán ăn được yêu thích nhất</p>
            </div>

            <Link href="/kham-pha" className="flex items-center gap-1 text-orange-500 font-bold hover:text-orange-600 hover:underline text-sm">
              Xem tất cả
              <span>→</span>
            </Link>
          </div>

          {stickyRestaurants.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {stickyRestaurants.map((restaurant) => (
                <RestaurantCard key={restaurant.id} data={restaurant} />
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-10">Đang cập nhật dữ liệu...</p>
          )}
        </div>

      </main>
    </div>
  );
}
