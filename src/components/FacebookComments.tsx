"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

// Khai báo để TypeScript biết FB SDK tồn tại trên window
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
  /** URL đầy đủ của trang hiện tại, dùng để khớp comment đúng bài */
  url: string;
  /** Số bình luận hiển thị ban đầu */
  numPosts?: number;
}

export default function FacebookComments({
  url,
  numPosts = 5,
}: FacebookCommentsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Khi url thay đổi (user chuyển từ quán này sang quán khác trong cùng phiên),
   * gọi FB.XFBML.parse() để Facebook render lại widget với URL mới.
   * Nếu SDK chưa load xong, bỏ qua — SDK sẽ tự parse khi khởi tạo.
   */
  useEffect(() => {
    if (typeof window !== "undefined" && window.FB) {
      window.FB.XFBML.parse(containerRef.current);
    }
  }, [url]);

  return (
    <>
      {/* FB SDK — chỉ nhúng 1 lần cho toàn app nhờ next/script */}
      <Script
        id="facebook-sdk"
        strategy="lazyOnload"
        src="https://connect.facebook.net/vi_VN/sdk.js#xfbml=1&version=v19.0"
        crossOrigin="anonymous"
        nonce="facebook-sdk"
      />

      {/* Root element bắt buộc của FB SDK */}
      <div id="fb-root" />

      {/* Widget bình luận */}
      <div ref={containerRef} className="w-full overflow-hidden">
        <div
          className="fb-comments"
          data-href={url}
          data-width="100%"
          data-numposts={numPosts}
          data-lazy="true"
          data-colorscheme="light"
        />
      </div>
    </>
  );
}
