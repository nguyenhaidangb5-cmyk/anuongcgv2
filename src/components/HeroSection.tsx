"use client";
import React from 'react';
import { LiveSearch } from './LiveSearch';

export const HeroSection = () => {
    return (
        <div className="relative h-[350px] md:h-[500px] w-full overflow-hidden">
            {/* Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2000&auto=format&fit=crop")' }}
            />
            {/* Dark Overlay 40% */}
            <div className="absolute inset-0 bg-black/40 z-10" />

            <div className="relative z-20 container mx-auto px-4 h-full flex flex-col justify-center items-center text-center text-white pb-8 md:pb-12">
                <p className="text-orange-400 font-bold tracking-[0.15em] md:tracking-[0.2em] uppercase mb-3 md:mb-5 text-xs md:text-sm animate-fade-in-up">
                    WELCOME TO CẦN GIUỘC
                </p>
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold mb-4 md:mb-8 leading-tight drop-shadow-lg max-w-4xl tracking-tight">
                    Tinh hoa Ẩm thực <br className="md:hidden" /> Cần Giuộc
                </h1>
                <p className="text-sm md:text-xl lg:text-2xl text-white/90 mb-8 md:mb-12 max-w-2xl font-medium drop-shadow-md hidden sm:block">
                    Khám phá hơn 100+ địa điểm ăn uống chuẩn vị địa phương
                </p>

                {/* Live Search Container với Z-Index cao */}
                <div className="w-full max-w-2xl relative z-[50]">
                    <LiveSearch placeholder="Tìm món ngon, địa chỉ ăn uống..." />
                </div>
            </div>
        </div>
    );
};
