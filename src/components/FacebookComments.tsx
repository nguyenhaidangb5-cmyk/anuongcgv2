"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

declare global {
  interface Window {
    FB?: {
      XFBML: {
        parse: (element?: HTMLElement | null) => void;
      };
    };
    fbAsyncInit?: () => void;
  }
}

interface FacebookCommentsProps {
  url: string;
  numPosts?: number;
}

export default function FacebookComments({
  url,
  numPosts = 5,
}: FacebookCommentsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Gọi parse lại khi chuyển trang (slug thay đổi)
  useEffect(() => {
    if (typeof window !== "undefined" && window.FB) {
      window.FB.XFBML.parse(containerRef.current);
    }
  }, [url]);

  // Callback sau khi SDK load xong - trigger parse thủ công
  const handleSdkLoad = () => {
    if (typeof window !== "undefined" && window.FB) {
      window.FB.XFBML.parse(containerRef.current);
    }
  };

  return (
    <>
      <Script
        id="facebook-jssdk"
        strategy="afterInteractive"
        src="https://connect.facebook.net/vi_VN/sdk.js#xfbml=1&version=v19.0"
        crossOrigin="anonymous"
        onLoad={handleSdkLoad}
      />

      {/* fb-root PHẢI tồn tại trước widget */}
      <div id="fb-root" />

      {/*
       * QUAN TRỌNG: KHÔNG dùng overflow-hidden trên wrapper vì Facebook Comments
       * render trong <iframe> với chiều cao tự động - overflow-hidden sẽ cắt mất nội dung.
       * Dùng w-full và min-h thay thế.
       */}
      <div ref={containerRef} className="w-full min-h-[200px]">
        <div
          className="fb-comments"
          data-href={url}
          data-width="100%"
          data-numposts={String(numPosts)}
          data-colorscheme="light"
          data-mobile="true"
        />
      </div>
    </>
  );
}
