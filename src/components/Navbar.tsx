"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const Navbar = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const pathname = usePathname();

    const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
    const closeMenu = () => setIsMobileMenuOpen(false);

    const navLinks = [
        { href: '/', label: 'Trang chủ' },
        { href: '/kham-pha', label: 'Danh mục' },
        { href: '/lien-he', label: 'Liên hệ' },
    ];

    return (
        <>
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-sm sticky-nav">
                <div className="container mx-auto px-3 md:px-4 h-16 md:h-20 flex items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-1.5 md:gap-2" onClick={closeMenu}>
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white text-lg md:text-xl shadow-lg shadow-orange-200">
                            🍊
                        </div>
                        <div>
                            <h1 className="text-sm md:text-lg font-bold text-gray-900 leading-tight">Cần Giuộc</h1>
                            <p className="text-[8px] md:text-[10px] text-orange-600 font-bold uppercase tracking-widest">Food Review</p>
                        </div>
                    </Link>

                    {/* Desktop Menu */}
                    <nav className="hidden md:flex items-center gap-8 font-medium text-gray-600">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`transition-colors hover:text-orange-500 ${pathname === link.href ? 'text-orange-600 font-bold' : ''
                                    } ${link.href === '/lien-he' ? 'bg-orange-50 text-orange-600 px-4 py-2 rounded-xl hover:bg-orange-500 hover:text-white' : ''}`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Mobile Controls */}
                    <div className="flex items-center gap-2 md:hidden">
                        <button className="p-1.5 text-gray-600 hover:text-orange-500 bg-gray-50 hover:bg-orange-50 rounded-lg transition-colors text-sm">
                            🔍
                        </button>
                        <button
                            onClick={toggleMenu}
                            className="p-1.5 text-gray-600 hover:text-orange-500 bg-gray-50 hover:bg-orange-50 rounded-lg transition-colors text-sm"
                        >
                            {isMobileMenuOpen ? '✕' : '☰'}
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-40 bg-white pt-20 px-6 md:hidden animate-in slide-in-from-top-10 fade-in duration-200">
                    <div className="flex flex-col gap-6 text-lg font-medium text-gray-800">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={closeMenu}
                                className={`border-b border-gray-100 pb-4 ${pathname === link.href ? 'text-orange-600 font-bold' : ''
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <div className="mt-4 p-4 bg-orange-50 rounded-2xl">
                            <p className="text-sm text-gray-500 mb-2">Bạn cần hỗ trợ?</p>
                            <a href="mailto:admin@anuongcangiuoc.org" className="text-orange-600 font-bold block">
                                admin@anuongcangiuoc.org
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
