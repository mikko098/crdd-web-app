import React, { useEffect, useMemo, useRef, useState } from 'react';
import { InferenceDetection } from '@/types';
import { cn } from '@/lib/utils';
import { resolveCaptureImageUrl } from '@/services/captures';

interface DamageImageWithDetectionsProps {
  src: string;
  alt: string;
  detections?: InferenceDetection[];
  className?: string;
  imageClassName?: string;
  fit?: 'cover' | 'contain';
  showLabels?: boolean;
}

interface ImageMetrics {
  naturalWidth: number;
  naturalHeight: number;
  renderedWidth: number;
  renderedHeight: number;
  offsetX: number;
  offsetY: number;
}

function hasUsableBox(detection: InferenceDetection): detection is InferenceDetection & { bbox: number[] } {
  return Array.isArray(detection.bbox)
    && detection.bbox.length >= 4
    && detection.bbox.every((value) => typeof value === 'number' && Number.isFinite(value));
}

const DamageImageWithDetections: React.FC<DamageImageWithDetectionsProps> = ({
  src,
  alt,
  detections = [],
  className,
  imageClassName,
  fit = 'cover',
  showLabels = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [metrics, setMetrics] = useState<ImageMetrics | null>(null);
  const [resolvedSrc, setResolvedSrc] = useState(src);

  const boxedDetections = useMemo(() => detections.filter(hasUsableBox), [detections]);

  useEffect(() => {
    let isMounted = true;
    const isRemoteOrLocalAsset = /^(https?:|data:|blob:|\/)/.test(src);

    setMetrics(null);

    if (isRemoteOrLocalAsset) {
      setResolvedSrc(src);
      return () => {
        isMounted = false;
      };
    }

    setResolvedSrc(`${import.meta.env.BASE_URL}placeholder.svg`);
    resolveCaptureImageUrl(src)
      .then((url) => {
        if (isMounted) setResolvedSrc(url);
      })
      .catch((error) => {
        console.warn('Failed to resolve capture image URL.', error);
        if (isMounted) setResolvedSrc(`${import.meta.env.BASE_URL}placeholder.svg`);
      });

    return () => {
      isMounted = false;
    };
  }, [src]);

  const updateMetrics = () => {
    const container = containerRef.current;
    const image = imageRef.current;
    if (!container || !image || !image.naturalWidth || !image.naturalHeight) return;

    const containerRect = container.getBoundingClientRect();
    const scale = fit === 'cover'
      ? Math.max(containerRect.width / image.naturalWidth, containerRect.height / image.naturalHeight)
      : Math.min(containerRect.width / image.naturalWidth, containerRect.height / image.naturalHeight);
    const renderedWidth = image.naturalWidth * scale;
    const renderedHeight = image.naturalHeight * scale;

    setMetrics({
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      renderedWidth,
      renderedHeight,
      offsetX: (containerRect.width - renderedWidth) / 2,
      offsetY: (containerRect.height - renderedHeight) / 2,
    });
  };

  useEffect(() => {
    updateMetrics();

    const container = containerRef.current;
    if (!container) return undefined;

    const observer = new ResizeObserver(updateMetrics);
    observer.observe(container);
    window.addEventListener('resize', updateMetrics);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateMetrics);
    };
  }, [fit, resolvedSrc]);

  const imageLayerStyle: React.CSSProperties = metrics
    ? {
        height: metrics.renderedHeight,
        left: metrics.offsetX,
        top: metrics.offsetY,
        width: metrics.renderedWidth,
      }
    : {
        inset: 0,
      };

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden bg-muted', className)}>
      <div className={cn('absolute overflow-hidden', imageClassName)} style={imageLayerStyle}>
        <img
          ref={imageRef}
          src={resolvedSrc}
          alt={alt}
          className={cn('h-full w-full', metrics ? 'object-fill' : fit === 'cover' ? 'object-cover' : 'object-contain')}
          onLoad={updateMetrics}
        />

        {metrics && boxedDetections.length > 0 && (
          <div className="pointer-events-none absolute inset-0">
            {boxedDetections.map((detection, index) => {
              const [x1, y1, x2, y2] = detection.bbox;
              const left = (x1 / metrics.naturalWidth) * metrics.renderedWidth;
              const top = (y1 / metrics.naturalHeight) * metrics.renderedHeight;
              const width = ((x2 - x1) / metrics.naturalWidth) * metrics.renderedWidth;
              const height = ((y2 - y1) / metrics.naturalHeight) * metrics.renderedHeight;

              if (width <= 0 || height <= 0) return null;

              return (
                <div
                  key={`${detection.class_id ?? detection.class_name ?? 'damage'}-${index}-${x1}-${y1}`}
                  className="absolute border-2 border-red-500 shadow-[0_0_0_1px_rgba(255,255,255,0.85)]"
                  style={{ left, top, width, height }}
                >
                  {showLabels && (
                    <span className="absolute left-0 top-0 max-w-full -translate-y-full truncate bg-red-500 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white shadow">
                      {detection.class_name ?? 'Damage'}
                      {typeof detection.confidence === 'number' ? ` ${Math.round(detection.confidence * 100)}%` : ''}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DamageImageWithDetections;
