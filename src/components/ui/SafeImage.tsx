import { useState } from 'react';

interface SafeImageProps {
    src: string | null | undefined;
    /** Display name used for initials fallback */
    name: string;
    /** Applied to both the <img> and the fallback container */
    className?: string;
    alt?: string;
}

/**
 * Renders an <img> with automatic fallback to an initials avatar when:
 * - `src` is null/undefined/empty, or
 * - the image fails to load (404, CORS, invalid URL, etc.)
 */
export function SafeImage({ src, name, className = '', alt = '' }: SafeImageProps) {
    const [error, setError] = useState(false);

    if (!src || error) {
        return (
            <div
                className={`flex items-center justify-center bg-[#E3F2FD] dark:bg-indigo-900/30 text-[#1673FF] dark:text-indigo-300 font-bold shrink-0 select-none ${className}`}
                title={alt || name}
                aria-label={alt || name}
            >
                {name.charAt(0).toUpperCase()}
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt || name}
            className={className}
            onError={() => setError(true)}
        />
    );
}
