'use client';

import React, { useState } from 'react';

interface ReportModalProps {
    restaurantId: number;
    restaurantName: string;
    isOpen: boolean;
    onClose: () => void;
}

export function ReportModal({ restaurantId, restaurantName, isOpen, onClose }: ReportModalProps) {
    const [reportType, setReportType] = useState<'closed' | 'wrong_info' | 'other'>('wrong_info');
    const [reporterName, setReporterName] = useState('');
    const [reporterEmail, setReporterEmail] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitStatus('idle');

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/wp-json/cg/v1/report`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    restaurant_id: restaurantId,
                    report_type: reportType,
                    reporter_name: reporterName,
                    reporter_email: reporterEmail,
                    message: message,
                }),
            });

            const data = await response.json();

            if (data.success) {
                setSubmitStatus('success');
                // Reset form sau 2 giây
                setTimeout(() => {
                    setReporterName('');
                    setReporterEmail('');
                    setMessage('');
                    setSubmitStatus('idle');
                    onClose();
                }, 2000);
            } else {
                setSubmitStatus('error');
            }
        } catch (error) {
            console.error('Lỗi khi gửi báo cáo:', error);
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 rounded-t-2xl">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                        aria-label="Đóng"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <h2 className="text-2xl font-bold">📝 Báo cáo thông tin</h2>
                    <p className="text-white/90 mt-1 text-sm">Quán: {restaurantName}</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Loại báo cáo */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Loại báo cáo <span className="text-red-500">*</span>
                        </label>
                        <div className="space-y-2">
                            <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                <input
                                    type="radio"
                                    name="reportType"
                                    value="closed"
                                    checked={reportType === 'closed'}
                                    onChange={(e) => setReportType(e.target.value as any)}
                                    className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                                />
                                <span className="ml-3 text-gray-700">⛔ Quán đã đóng cửa</span>
                            </label>
                            <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                <input
                                    type="radio"
                                    name="reportType"
                                    value="wrong_info"
                                    checked={reportType === 'wrong_info'}
                                    onChange={(e) => setReportType(e.target.value as any)}
                                    className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                                />
                                <span className="ml-3 text-gray-700">❌ Thông tin sai (địa chỉ, giá, giờ mở cửa...)</span>
                            </label>
                            <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                <input
                                    type="radio"
                                    name="reportType"
                                    value="other"
                                    checked={reportType === 'other'}
                                    onChange={(e) => setReportType(e.target.value as any)}
                                    className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                                />
                                <span className="ml-3 text-gray-700">💬 Khác</span>
                            </label>
                        </div>
                    </div>

                    {/* Tên người báo cáo */}
                    <div>
                        <label htmlFor="reporterName" className="block text-sm font-semibold text-gray-700 mb-2">
                            Tên của bạn (không bắt buộc)
                        </label>
                        <input
                            type="text"
                            id="reporterName"
                            value={reporterName}
                            onChange={(e) => setReporterName(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all outline-none"
                            placeholder="Nguyễn Văn A"
                        />
                    </div>

                    {/* Email */}
                    <div>
                        <label htmlFor="reporterEmail" className="block text-sm font-semibold text-gray-700 mb-2">
                            Email (không bắt buộc)
                        </label>
                        <input
                            type="email"
                            id="reporterEmail"
                            value={reporterEmail}
                            onChange={(e) => setReporterEmail(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all outline-none"
                            placeholder="email@example.com"
                        />
                    </div>

                    {/* Nội dung báo cáo */}
                    <div>
                        <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-2">
                            Chi tiết báo cáo <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            required
                            rows={4}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all outline-none resize-none"
                            placeholder="Vui lòng mô tả chi tiết vấn đề bạn gặp phải..."
                        />
                    </div>

                    {/* Status messages */}
                    {submitStatus === 'success' && (
                        <div className="p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
                            <p className="text-green-700 font-medium">✅ Cảm ơn bạn đã gửi báo cáo!</p>
                            <p className="text-green-600 text-sm mt-1">Chúng tôi sẽ xem xét trong thời gian sớm nhất.</p>
                        </div>
                    )}

                    {submitStatus === 'error' && (
                        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                            <p className="text-red-700 font-medium">❌ Có lỗi xảy ra</p>
                            <p className="text-red-600 text-sm mt-1">Vui lòng thử lại sau.</p>
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !message}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                        >
                            {isSubmitting ? '⏳ Đang gửi...' : '📤 Gửi báo cáo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
