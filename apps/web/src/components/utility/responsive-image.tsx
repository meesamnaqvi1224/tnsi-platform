import Image, { type ImageProps } from 'next/image';

type ResponsiveImageProps = Omit<ImageProps, 'unoptimized'> & {
  src: string;
};

function isSvgAsset(src: string) {
  return src.endsWith('.svg');
}

export function ResponsiveImage({
  src,
  alt,
  className,
  fill,
  priority,
  sizes,
  ...props
}: ResponsiveImageProps) {
  if (isSvgAsset(src)) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        decoding="async"
        {...(fill
          ? {
              style: {
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              },
            }
          : {})}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      fill={fill}
      priority={priority}
      sizes={sizes}
      {...props}
    />
  );
}
