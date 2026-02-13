"use client";
import React, { useState } from 'react';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { ImageObject } from '@/types/wordpress';

interface ImageGalleryProps {
    images: ImageObject[];
    title: string;
    icon: string;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ images, title, icon }) => {
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [photoIndex, setPhotoIndex] = useState(0);

    if (!images || images.length === 0) {
        return null;
    }

    const slides = images.map(img => ({
        src: img.sourceUrl,
        alt: img.altText || title,
        width: img.width,
        height: img.height,
    }));

    return (
        <div className="bg-white rounded-2xl p-4 md:p-6 border border-gray-100 shadow-sm">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>{icon}</span> {title}
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {images.map((image, index) => (
                    <button
                        key={index}
                        onClick={() => {
                            setPhotoIndex(index);
                            setLightboxOpen(true);
                        }}
                        className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer border-2 border-gray-100 hover:border-orange-400 transition-all"
                    >
                        <img
                            src={image.sourceUrl}
                            alt={image.altText || `${title} ${index + 1}`}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <span className="text-white text-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                                🔍
                            </span>
                        </div>
                    </button>
                ))}
            </div>

            <Lightbox
                open={lightboxOpen}
                close={() => setLightboxOpen(false)}
                slides={slides}
                index={photoIndex}
            />
        </div>
    );
};
