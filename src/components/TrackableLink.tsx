'use client';

import Link from 'next/link';
import { trackRestaurantClick } from '@/lib/api';

interface TrackableLinkProps {
    href: string;
    restaurantId: number;
    className?: string;
    children: React.ReactNode;
}

export function TrackableLink({ href, restaurantId, className, children }: TrackableLinkProps) {
    const handleClick = () => {
        trackRestaurantClick(restaurantId);
    };

    return (
        <Link href={href} className={className} onClick={handleClick}>
            {children}
        </Link>
    );
}
