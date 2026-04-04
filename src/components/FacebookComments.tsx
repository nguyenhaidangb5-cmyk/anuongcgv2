"use client";

import { useEffect, useRef } from "react";

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

const FB_SDK_ID = "facebook-jssdk";
const FB_SDK_SRC = "https://connect.facebook.net/vi_VN/sdk.js#xfbml=1&version=v19.0";

export default function FacebookComments({
  url,
  numPosts = 5,
}: FacebookCommentsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // === BƯỚC 1: Đảm bảo fb-root tồn tại ===
    if (!document.getElementById("fb-root")) {
      const fbRoot = document.createElement("div");
      fbRoot.id = "fb-root";
      document.body.prepend(fbRoot);
    }

    // === BƯỚC 2: Load FB SDK (chỉ 1 lần) ===
    const loadSdk = () => {
      if (document.getElementById(FB_SDK_ID)) {
        // SDK đã tồn tại trong DOM → parse lại luôn
        if (window.FB) {
          window.FB.XFBML.parse(containerRef.current);
        }
        return;
      }

      const script = document.createElement("script");
      script.id = FB_SDK_ID;
      script.src = FB_SDK_SRC;
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";

      script.onload = () => {
        // SDK vừa load xong → parse ngay
        if (window.FB) {
          window.FB.XFBML.parse(containerRef.current);
        }
      };

      document.body.appendChild(script);
    };

    loadSdk();
  }, []); // chỉ chạy 1 lần khi mount

  // Khi url thay đổi (chuyển quán), parse lại widget
  useEffect(() => {
    if (window.FB) {
      window.FB.XFBML.parse(containerRef.current);
    }
  }, [url]);

  return (
    <div ref={containerRef} className="w-full">
      <div
        className="fb-comments"
        data-href={url}
        data-width="100%"
        data-numposts={String(numPosts)}
        data-colorscheme="light"
        data-mobile="true"
      />
    </div>
  );
}
