import { useState } from "react";
import { imageVariant, imageUrl, type ImageSize } from "../../../lib/api";

/**
 * Image with an Instagram/Facebook-style blur-up: a tiny (~1 KB) blurred
 * placeholder shows instantly, then the resized WebP variant fades in on load.
 * Falls back to the original file if a variant is missing (onError).
 *
 * `className` sizes/shapes the wrapper (aspect, rounding). `imgClassName` adds
 * classes to the <img> itself (e.g. group-hover scale).
 */
export function SmartImage({
  src,
  size = "card",
  alt = "",
  className = "",
  imgClassName = "",
  eager = false,
}: {
  src: string | null | undefined;
  size?: ImageSize;
  alt?: string;
  className?: string;
  imgClassName?: string;
  eager?: boolean;
}) {
  const real = imageVariant(src, size);
  const blur = imageVariant(src, "blur");
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const finalSrc = errored ? imageUrl(src) : real;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {blur && blur !== finalSrc && (
        <img
          src={blur}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover scale-110"
          style={{ filter: "blur(12px)", opacity: loaded ? 0 : 1, transition: "opacity 0.4s ease" }}
        />
      )}
      <img
        src={finalSrc}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        className={`relative w-full h-full object-cover ${imgClassName}`}
        style={{ opacity: loaded ? 1 : 0, transition: "opacity 0.5s ease" }}
      />
    </div>
  );
}
