"use client";
import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';

export default function ContactPage() {
    const [activeTab, setActiveTab] = useState<'reviewer' | 'owner'>('reviewer');
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

    // 🍯 Honeypot anti-spam state — trường này phải luôn rỗng với người dùng thật
    const [honeypotValue, setHoneypotValue] = useState('');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // 🛡️ Kiểm tra Honeypot — DÒNG ĐẦU TIÊN: Bot điền vào → chặn ngay lập tức
        if (honeypotValue.length > 0) {
            console.error('🚫 Spam detected: Honeypot field was filled. Request blocked.');
            // Hiển thị thành công GIẢ để Bot tưởng đã spam xong rồi bỏ đi
            setStatus('success');
            return; // KHÔNG gọi API WordPress
        }

        setIsLoading(true);
        setStatus('idle');

        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());

        // Thêm loại form vào data
        const payload = {
            ...data,
            type: activeTab
        };

        try {
            // Gửi về endpoint WordPress (sẽ tạo ở bước sau)
            const res = await fetch(`${process.env.NEXT_PUBLIC_WORDPRESS_API_URL || 'https://admin.anuongcangiuoc.org/wp-json'}/can-giuoc-food/v1/contact`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                setStatus('success');
                (e.target as HTMLFormElement).reset();
            } else {
                setStatus('error');
            }
        } catch (error) {
            console.error(error);
            setStatus('error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Navbar />

            <main className="container mx-auto px-4 py-10">
                <div className="max-w-2xl mx-auto">
                    <div className="text-center mb-10">
                        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Liên hệ & Hợp tác</h1>
                        <p className="text-gray-600">Bạn biết quán ngon? Hay bạn là chủ quán muốn quảng bá? <br />Hãy kết nối với chúng tôi ngay!</p>
                    </div>

                    {/* Form Container */}
                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-orange-100">
                        {/* Tabs Switcher */}
                        <div className="grid grid-cols-2 border-b border-gray-100">
                            <button
                                onClick={() => setActiveTab('reviewer')}
                                className={`py-4 font-bold text-sm md:text-base transition-colors ${activeTab === 'reviewer'
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-white text-gray-500 hover:bg-gray-50'
                                    }`}
                            >
                                🦸 Người chỉ điểm
                            </button>
                            <button
                                onClick={() => setActiveTab('owner')}
                                className={`py-4 font-bold text-sm md:text-base transition-colors ${activeTab === 'owner'
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-white text-gray-500 hover:bg-gray-50'
                                    }`}
                            >
                                👨‍🍳 Dành cho Chủ quán
                            </button>
                        </div>

                        {/* Content & Forms */}
                        <div className="p-8">
                            {status === 'success' ? (
                                <div className="text-center py-10 animate-in fade-in zoom-in duration-300">
                                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                                        ✅
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">Đã gửi thành công!</h3>
                                    <p className="text-gray-500 mb-6">Cảm ơn bạn đã đóng góp cho cộng đồng ẩm thực Cần Giuộc.</p>
                                    <button onClick={() => setStatus('idle')} className="text-orange-600 font-semibold hover:underline">
                                        Gửi tin khác
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-5 animate-in slide-in-from-bottom-2 duration-500">
                                    {activeTab === 'reviewer' ? (
                                        <>
                                            {/* Form Người chỉ điểm */}
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Tên quán bạn muốn giới thiệu *</label>
                                                <input required name="store_name" type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all" placeholder="Ví dụ: Bún riêu Cầu Tràm..." />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Địa chỉ (Khu vực)</label>
                                                <input name="address" type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all" placeholder="Ví dụ: Gần ngã tư Xoài Đôi..." />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Món ngon đề xuất</label>
                                                <input name="recommend_food" type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all" placeholder="Món nào ngon nhất ở đây?" />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {/* Form Chủ quán */}
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Tên quán ăn của bạn *</label>
                                                <input required name="store_name" type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all" placeholder="Nhập tên quán..." />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Số điện thoại liên hệ *</label>
                                                <input required name="phone" type="tel" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all" placeholder="Để Admin gọi xác nhận..." />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Địa chỉ chính xác</label>
                                                <input required name="address" type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all" placeholder="Số nhà, ấp, xã..." />
                                            </div>
                                        </>
                                    )}

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">Lời nhắn thêm</label>
                                        <textarea name="message" rows={3} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all" placeholder="Bạn muốn nhắn nhủ gì thêm không?"></textarea>
                                    </div>

                                    {/*
                                      🍯 HONEYPOT FIELD — ẨN với người dùng thật bằng CSS thuần.
                                      - Không dùng type="hidden" (Bot xịn bỏ qua)
                                      - Dùng type="text" nhưng giấu bằng position:absolute + overflow:hidden
                                      - tabIndex={-1} và aria-hidden để loại khỏi trải nghiệm người dùng thật
                                      - autocomplete="off" để trình duyệt không gợi ý điền tự động
                                    */}
                                    <div
                                        aria-hidden="true"
                                        style={{
                                            position: 'absolute',
                                            overflow: 'hidden',
                                            width: '1px',
                                            height: '1px',
                                            opacity: 0,
                                            pointerEvents: 'none',
                                            zIndex: -9999,
                                        }}
                                    >
                                        <label htmlFor="company_website_url">Website (đừng điền vào đây)</label>
                                        <input
                                            id="company_website_url"
                                            name="company_website_url"
                                            type="text"
                                            value={honeypotValue}
                                            onChange={(e) => setHoneypotValue(e.target.value)}
                                            tabIndex={-1}
                                            autoComplete="off"
                                        />
                                    </div>

                                    <button
                                        disabled={isLoading}
                                        type="submit"
                                        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                    >
                                        {isLoading ? 'Đang gửi...' : '🚀 Gửi thông tin ngay'}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>

                    <p className="text-center text-gray-400 text-sm mt-8">
                        Dữ liệu sẽ được gửi trực tiếp đến Ban quản trị website.
                    </p>
                </div>
            </main>
        </div>
    );
}
