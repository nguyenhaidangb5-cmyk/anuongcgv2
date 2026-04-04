"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

declare global {
  interface Window {
    FB?: {
      XFBML: {
        parse: (element?: HTMLElement | null) => void;
      };
      init: (params: {
        appId?: string;
        xfbml: boolean;
        version: string;
      }) => void;
    };
    fbAsyncInit?: () => void;
  }
}

interface FacebookCommentsProps {
  /** URL đầy đủ của trang, dùng để khớp đúng luồng comment */
  url: string;
  /** Số bình luận hiển thị ban đầu (mặc định: 5) */
  numPosts?: number;
}

export default function FacebookComments({
  url,
  numPosts = 5,
}: FacebookCommentsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Khi url thay đổi (chuyển giữa các quán trong cùng phiên),
   * gọi FB.XFBML.parse() để render lại widget với URL mới.
   */
  useEffect(() => {
    if (typeof window !== "undefined" && window.FB) {
      window.FB.XFBML.parse(containerRef.current);
    }
  }, [url]);

  /**
   * Callback được gọi sau khi FB SDK tải xong.
   * Mục đích: đảm bảo .fb-comments được parse ngay cả khi
   * SDK load sau khi component đã mount (trường hợp navigation).
   */
  const handleSdkLoad = () => {
    if (typeof window !== "undefined" && window.FB) {
      window.FB.XFBML.parse(containerRef.current);
    }
  };

  return (
    <>
      {/*
       * FB SDK nhúng theo chuẩn Facebook:
       * - strategy="afterInteractive": load ngay sau khi trang interactive,
       *   nhanh hơn lazyOnload, đảm bảo widget render kịp
       * - Không dùng nonce (gây CSP conflict với Next.js)
       * - onLoad: trigger parse thủ công sau khi SDK sẵn sàng
       */}
      <Script
        id="facebook-jssdk"
        strategy="afterInteractive"
        src="https://connect.facebook.net/vi_VN/sdk.js#xfbml=1&version=v19.0"
        crossOrigin="anonymous"
        onLoad={handleSdkLoad}
      />

      {/* fb-root bắt buộc phải có và phải render TRƯỚC widget */}
      <div id="fb-root" />

      {/* Wrapper + .fb-comments widget */}
      <div ref={containerRef} className="w-full overflow-hidden">
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
