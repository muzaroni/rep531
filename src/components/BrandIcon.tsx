// The approved artwork is used directly. Two color masks preserve its exact
// contours while letting the lettering follow the active theme.
export function BrandIcon({ size = 104 }: { size?: number }) {
  const artwork = `${import.meta.env.BASE_URL}rep531-artwork.png`;
  return (
    <svg
      width={size}
      height={(size * 610) / 1054}
      viewBox="100 325 1054 610"
      aria-hidden="true"
    >
      <defs>
        <filter id="rep531-white" colorInterpolationFilters="sRGB">
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 -1 1 0 -.08"
            result="mask"
          />
          <feFlood floodColor="var(--text, #f2f2f2)" result="color" />
          <feComposite in="color" in2="mask" operator="in" />
        </filter>
        <filter id="rep531-accent" colorInterpolationFilters="sRGB">
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 1.35 -1.35 0 -.03"
            result="mask"
          />
          <feFlood floodColor="var(--accent, #a6f629)" result="color" />
          <feComposite in="color" in2="mask" operator="in" />
        </filter>
      </defs>
      <image
        href={artwork}
        width="1254"
        height="1254"
        filter="url(#rep531-white)"
      />
      <image
        href={artwork}
        width="1254"
        height="1254"
        filter="url(#rep531-accent)"
      />
    </svg>
  );
}
